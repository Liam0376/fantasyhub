#!/usr/bin/env python3
"""Weekly prediction grading: join a week's projections against nflverse
actuals and record heuristic-vs-ML error. The 2026 evidence base for the
ML gate (option C) and the star-miscalibration monitor.

Runs in the daily cron AFTER compute_week.py. Auto-detects the latest week
that is BOTH projected (data/projections/{season}_week_{ww}.json exists)
AND final (every scheduled non-bye team has actuals), and not yet graded.
Idempotent: reruns skip already-graded weeks. Never fails the pipeline:
incomplete weeks print a gap message and exit 0.

History: data/grades/weekly.json (array of entries, one per graded week).
Committed by the cron alongside projections.

Scoring: projections are REF-scored (compute_week.py:464), so actuals for
modeled positions (QB/RB/WR/TE/K) are scored with the same REF_SCORING
from their raw stats row — both sides one rule, no offset. Other
positions (IDP, etc.) fall back to nflverse fantasy_points_ppr, which is
offense-only scoring and reads 0 for them — same 0=0 rows the projection
side has; the OFFENSE split (QB/RB/WR/TE/K) is the honest headline.
See docs/ACCURACY.md.

Usage:
    python scripts/grade_weekly_predictions.py [--season YYYY] [--week N]
    Explicit week bypasses finality auto-detect but still requires the
    projection file; missing actuals for individual players are skipped
    (coverage reported).
"""
import argparse
import csv
import io
import json
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "api"))

from scoring import NFLVERSE_STATS_URL, REF_SCORING, score_avg_stats  # noqa: E402

SCHEDULE_URL = ("https://github.com/nflverse/nflverse-data/releases/"
                "download/schedules/games.csv")
HISTORY_PATH = REPO_ROOT / "data" / "grades" / "weekly.json"
TOP_TIER_CUTOFF = 17.0
# Positions with a real model AND reference-scored actuals. The OFFENSE
# split exists because IDP/LS/P rows are 0=0 on both sides and drag the
# ALL-split MAE toward zero (700+ rows of no-signal in W1/W2).
OFFENSE_POSITIONS = ("QB", "RB", "WR", "TE", "K")
_MODELED = set(OFFENSE_POSITIONS)


def _fetch_csv(url, timeout=180):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return list(csv.DictReader(io.StringIO(r.read().decode())))


def load_projections(season, week, proj_dir=None):
    path = ((proj_dir or REPO_ROOT / "data" / "projections")
            / f"{season}_week_{week:02d}.json")
    if not path.exists():
        return None
    return json.loads(path.read_text())


def scheduled_teams(sched_rows, season, week):
    """Teams scheduled to play (excludes byes) in a season week."""
    teams = set()
    for x in sched_rows:
        if (str(x.get("season")) != str(season) or x.get("game_type") != "REG"
                or int(x.get("week") or -1) != week):
            continue
        if x.get("away_team"):
            teams.add(x["away_team"])
        if x.get("home_team"):
            teams.add(x["home_team"])
    return teams


def is_week_final(sched_rows, actual_teams, season, week):
    """A week is gradable only when every scheduled team has actuals.
    why teams, not game count: bye weeks change the game count; the team
    set is exact. MNF processes last — a 30/32 week must wait, not grade
    partial (2026-W2 NYG@LA arrived a day late, caught by this gate)."""
    expected = scheduled_teams(sched_rows, season, week)
    if not expected:
        return False, "no scheduled games"
    missing = sorted(expected - set(actual_teams))
    if missing:
        return False, f"actuals missing for {missing}"
    return True, "final"


def grade_rows(proj_players, actual_by_pid):
    """Pure grading math. Returns dict with overall/offense/top_tier/pos
    splits. Each split: n, mae_h, bias_h (+ n_ml, mae_ml, bias_ml,
    mae_h_ml when ML rows exist; mae_h_ml is the paired heuristic
    baseline on the same n_ml rows). Rows without actuals are skipped
    (n_skipped).

    Cohort rules:
    - TOP is selected on the PRE-treatment base (projected - ml): the
      cohort must not depend on the treatment being evaluated, or the
      ML-vs-H comparison on TOP is conditioned on ML's own output.
    - n_ml counts only rows where ML actually applied (ml_adjustment
      present AND != 0.0). Unmodeled positions carry a literal 0.0 key;
      counting them made n_ml == n and diluted every ML delta toward
      the heuristic number.
    - Because n_ml can be < n (IDP rows are 0.0), mae_ml is also paired
      with mae_h_ml: the heuristic's error restricted to the SAME ML
      rows. mae_h vs mae_ml alone is cross-denominator when n_ml < n
      (OFFENSE/ALL splits) and reads as a fake ML regression.
    """
    groups = defaultdict(list)
    skipped = 0
    for p in proj_players:
        pid = str(p.get("player_id") or "")
        if pid not in actual_by_pid or p.get("projected_points") is None:
            skipped += 1
            continue
        ml = p.get("ml_adjustment")
        ml_f = float(ml) if ml is not None else 0.0
        h = float(p["projected_points"])
        base = h - ml_f
        groups["ALL"].append((p, ml))
        pos = (p.get("position") or "UNK").upper()
        if pos in OFFENSE_POSITIONS:
            groups["OFFENSE"].append((p, ml))
        groups[pos].append((p, ml))
        if base >= TOP_TIER_CUTOFF:
            groups["TOP"].append((p, ml))

    def split(rows):
        n = len(rows)
        if not n:
            return {"n": 0}
        eh = em = sh = sm = eh_ml = 0.0
        n_ml = 0
        for p, ml in rows:
            a = actual_by_pid[str(p["player_id"])]
            h = float(p["projected_points"])
            ml_f = float(ml) if ml is not None else 0.0
            base = h - ml_f
            eh += abs(base - a)
            sh += base - a
            if ml is not None and ml_f != 0.0:
                em += abs(h - a)
                sm += h - a
                eh_ml += abs(base - a)
                n_ml += 1
        out = {"n": n, "mae_h": round(eh / n, 3), "bias_h": round(sh / n, 3)}
        if n_ml:
            out.update({"n_ml": n_ml, "mae_ml": round(em / n_ml, 3),
                        "bias_ml": round(sm / n_ml, 3),
                        "mae_h_ml": round(eh_ml / n_ml, 3)})
        return out

    return {"splits": {k: split(v) for k, v in groups.items()},
            "n_skipped": skipped}


def load_history():
    if HISTORY_PATH.exists():
        return json.loads(HISTORY_PATH.read_text())
    return []


def already_graded(history, season, week):
    return any(e.get("season") == season and e.get("week") == week
               for e in history)


def detect_target_week(history, max_lookback=4, proj_dir=None,
                       latest=None):
    """Earliest week with a projection file, not yet graded. Returns
    (season, week) or (None, None). proj_dir/latest injectable for tests.
    why earliest-first (not latest): a non-final latest week (MNF pending)
    must not starve earlier ungraded weeks — the finality gate skips it
    every run, so latest-first would never backfill. Earliest-first grades
    exactly one week per run in steady state (the just-finalized one)."""
    try:
        if latest is None:
            latest = json.loads((REPO_ROOT / "data" / "projections"
                                 / "latest.json").read_text())
    except Exception:
        return None, None
    season = latest.get("season")
    cur = latest.get("week") or 1
    for w in range(max(1, cur - max_lookback), min(cur, 18) + 1):
        if already_graded(history, season, w):
            continue
        if load_projections(season, w, proj_dir=proj_dir) is not None:
            return season, w
    return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, default=None)
    ap.add_argument("--week", type=int, default=None)
    args = ap.parse_args()

    history = load_history()
    if args.season and args.week:
        season, week = args.season, args.week
        if already_graded(history, season, week):
            print(f"week {season} W{week:02d} already graded, skipping")
            return 0
    else:
        season, week = detect_target_week(history)
        if season is None:
            print("no ungraded projection week found, skipping")
            return 0
        print(f"auto-detected target: {season} W{week:02d}")

    proj = load_projections(season, week)
    if proj is None:
        print(f"no projection file for {season} W{week:02d}, skipping")
        return 0

    stats_rows = _fetch_csv(NFLVERSE_STATS_URL.format(season=season))
    actual_by_pid = {}
    for x in stats_rows:
        if x.get("season_type") != "REG" or int(x.get("week") or -1) != week:
            continue
        if not x.get("player_id"):
            continue
        # Score actuals with the SAME rule as the projections (REF) for
        # modeled positions; fantasy_points_ppr would mix rules AND reads
        # 0 for every K (nflverse leaves fantasy_points empty on kicking
        # rows while fg_made_*/pat_made are populated). Non-modeled
        # positions keep ppr: REF has no IDP keys, and their projections
        # are 0=0 anyway (surfaced via the OFFENSE split instead).
        pos = (x.get("position") or "").upper()
        if pos in _MODELED:
            try:
                actual_by_pid[str(x["player_id"])] = score_avg_stats(
                    x, REF_SCORING, pos)
                continue
            except (TypeError, ValueError):
                pass
        try:
            actual_by_pid[str(x["player_id"])] = float(
                x.get("fantasy_points_ppr") or 0)
        except (TypeError, ValueError):
            continue

    if args.week is None:
        # Auto mode: require finality (all scheduled teams have actuals).
        sched_rows = _fetch_csv(SCHEDULE_URL, timeout=120)
        actual_teams = set()
        for x in stats_rows:
            if (x.get("season_type") == "REG"
                    and int(x.get("week") or -1) == week and x.get("team")):
                actual_teams.add(x["team"])
        ok, reason = is_week_final(sched_rows, actual_teams, season, week)
        if not ok:
            print(f"week {season} W{week:02d} not final ({reason}), skipping")
            return 0

    result = grade_rows(proj.get("players", []), actual_by_pid)
    entry = {"season": season, "week": week,
             "graded_at": datetime.now(timezone.utc).isoformat(),
             "coverage": {"matched": result["splits"].get("ALL", {}).get("n", 0),
                          "skipped": result["n_skipped"]},
             "splits": result["splits"]}
    history.append(entry)
    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    HISTORY_PATH.write_text(json.dumps(history, indent=2))
    all_s = result["splits"].get("ALL", {})
    print(f"graded {season} W{week:02d}: n={all_s.get('n')} "
          f"mae_h={all_s.get('mae_h')} mae_ml={all_s.get('mae_ml')} "
          f"bias_h={all_s.get('bias_h')} bias_ml={all_s.get('bias_ml')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
