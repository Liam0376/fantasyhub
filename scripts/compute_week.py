#!/usr/bin/env python3
"""Weekly projection computation for Fantasy Hub.

Fetches current season stats from nflverse, computes projections for
remaining weeks, and writes JSON to data/projections/.

Usage:
    python scripts/compute_week.py --week 3 --season 2026
    python scripts/compute_week.py  # auto-detect current week
"""
import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
from scoring import AVG_STAT_KEYS, score_avg_stats, score_team_def

try:
    from nfl_state import get_nfl_state
except ImportError:
    get_nfl_state = None

# nflverse weekly stats URL
STATS_URL = "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{season}.csv"
TEAM_STATS_URL = "https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_{season}.csv"
SCHEDULE_URL = "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv"

# Reference scoring for the stored projected_points field only (lets the
# JSON stand alone). League-specific scoring happens in api/analytics.py
# from avg_stats — never from this reference number.
REF_SCORING = {
    "pass_yd": 0.04, "pass_td": 4.0, "pass_int": -1.0, "pass_2pt": 2.0,
    "rush_yd": 0.1, "rush_td": 6.0, "rush_2pt": 2.0,
    "rec": 1.0, "rec_yd": 0.1, "rec_td": 6.0, "rec_2pt": 2.0,
    "fum_lost": -2.0, "xpm": 1.0, "xpmiss": -1.0,
    "fgm_0_19": 3.0, "fgm_20_29": 3.0, "fgm_30_39": 3.0,
    "fgm_40_49": 4.0, "fgm_50_59": 5.0, "fgm_60_": 6.0, "fgmiss": -1.0,
}

# Reference DEF scoring (standard brackets) for standalone readability.
REF_DEF_SCORING = {
    "sack": 1.0, "int": 2.0, "fum_rec": 2.0, "ff": 1.0,
    "def_td": 6.0, "safe": 2.0, "blk_kick": 2.0, "st_td": 6.0,
    "pts_allow_0": 10.0, "pts_allow_1_6": 7.0, "pts_allow_7_13": 4.0,
    "pts_allow_14_20": 1.0, "pts_allow_21_27": 0.0,
    "pts_allow_28_34": -1.0, "pts_allow_35p": -4.0,
}

# Position width factors for confidence intervals
POS_WIDTH = {"QB": 1.55, "RB": 1.07, "WR": 1.12, "TE": 0.88, "K": 0.85, "DEF": 0.75}


def fetch_weekly_stats(season: int) -> list[dict]:
    """Fetch weekly player stats from nflverse."""
    import csv
    import io
    import requests

    url = STATS_URL.format(season=season)
    print(f"Fetching stats from {url}...")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()

    reader = csv.DictReader(io.StringIO(resp.text))
    rows = []
    for row in reader:
        rows.append(row)
    print(f"  Got {len(rows)} stat rows")
    return rows


def fetch_csv(url: str, label: str) -> list[dict]:
    import csv
    import io
    import requests

    print(f"Fetching {label} from {url}...")
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    rows = list(csv.DictReader(io.StringIO(resp.text)))
    print(f"  Got {len(rows)} {label} rows")
    return rows


def compute_byes(sched_rows: list[dict], season: int) -> dict:
    """Map team -> bye week from the REG schedule (teams with no game)."""
    weeks: dict[int, set] = {}
    for g in sched_rows:
        if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
            continue
        try:
            wk = int(g.get("week") or 0)
        except (ValueError, TypeError):
            continue
        if not 1 <= wk <= 18:
            continue
        weeks.setdefault(wk, set()).update([g.get("home_team"), g.get("away_team")])
    byes: dict[str, int] = {}
    for wk, playing in weeks.items():
        for team in _ALL_TEAMS:
            if team not in playing:
                byes.setdefault(team, wk)
    return byes


_ALL_TEAMS = ["ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
              "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
              "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
              "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS"]


def compute_team_def(team_rows: list[dict], sched_rows: list[dict],
                     current_week: int, season: int) -> list[dict]:
    """Per-team defensive averages: sacks/turnovers from team-week rows,
    points allowed from schedule scores, yards allowed by joining the
    opponent's offensive yards. Same recency weighting as players.
    """
    # Schedule lookup: (week) -> games; scores only exist for played games.
    games: dict[int, list] = {}
    for g in sched_rows:
        if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
            continue
        try:
            wk = int(g.get("week") or 0)
        except (ValueError, TypeError):
            continue
        if wk >= 1:
            games.setdefault(wk, []).append(g)

    # Opponent offensive yards: (team, week) -> pass+rush yards.
    off_yds: dict[tuple, float] = {}
    for r in team_rows:
        try:
            wk = int(r.get("week") or 0)
        except (ValueError, TypeError):
            continue
        if r.get("season_type", "REG") != "REG" or wk <= 0 or wk > current_week:
            continue
        off_yds[(r.get("team"), wk)] = _num(r.get("passing_yards")) + _num(r.get("rushing_yards"))

    # Group defensive rows by team.
    by_team: dict[str, list] = {}
    for r in team_rows:
        try:
            wk = int(r.get("week") or 0)
        except (ValueError, TypeError):
            continue
        if r.get("season_type", "REG") != "REG" or wk <= 0 or wk > current_week:
            continue
        by_team.setdefault(r.get("team"), []).append((wk, r))

    out = []
    for team, wrs in by_team.items():
        wrs.sort(key=lambda x: x[0])
        n = len(wrs)
        weights = [2 if i >= n - 3 else 1 for i in range(n)]
        total_w = sum(weights) or 1

        def wavg(key):
            return sum(_num(r.get(key)) * w for (_, r), w in zip(wrs, weights)) / total_w

        # Points/yards allowed per played week with data.
        pa_vals, ya_vals = [], []
        for (wk, _), w in zip(wrs, weights):
            for g in games.get(wk, []):
                opp = None
                if g.get("home_team") == team:
                    opp, pts = g.get("away_team"), g.get("away_score")
                elif g.get("away_team") == team:
                    opp, pts = g.get("home_team"), g.get("home_score")
                else:
                    continue
                try:
                    pa_vals.append((float(pts), w))
                except (ValueError, TypeError):
                    pass
                if (opp, wk) in off_yds:
                    ya_vals.append((off_yds[(opp, wk)], w))

        def wmean(vals):
            s = sum(v * w for v, w in vals)
            t = sum(w for _, w in vals)
            return (s / t) if t else None

        pa = wmean(pa_vals)
        ya = wmean(ya_vals)
        def_avg = {
            "sacks": round(wavg("def_sacks"), 3),
            "ints": round(wavg("def_interceptions"), 3),
            "fum_rec": round(wavg("fumble_recovery_opp"), 3),
            "ff": round(wavg("def_fumbles_forced"), 3),
            "def_tds": round(wavg("def_tds"), 3),
            "st_tds": round(wavg("special_teams_tds"), 3),
            "safeties": round(wavg("def_safeties"), 3),
            "blk_kicks": round(wavg("def_fg_blocks") + wavg("def_pat_blocks") + wavg("def_punt_blocks"), 3),
            "pts_allowed": round(pa, 2) if pa is not None else None,
            "yds_allowed": round(ya, 1) if ya is not None else None,
        }
        out.append({"team": team, "games_played": n, "def_avg": def_avg,
                    "bye_week": None,
                    "projected_points": round(score_team_def(def_avg, REF_DEF_SCORING), 2)})
    return out


def _num(v) -> float:
    try:
        return float(v or 0)
    except (ValueError, TypeError):
        return 0.0


def compute_projections(stats_rows: list[dict], current_week: int, season: int,
                        byes: dict | None = None) -> list[dict]:
    """Project per-game avg raw stats using recency weighting.

    Stores avg_stats per player so api/analytics.py can score with any
    league's Sleeper scoring_settings (Standard/Half/PPR, 4 vs 6pt pass
    TD, TE premium, bonuses). projected_points is a 4pt-pass-TD PPR
    reference only — never used for league-specific math.
    """
    # Group by player
    players = {}
    for row in stats_rows:
        pid = row.get("player_id") or row.get("player_name", "")
        if not pid:
            continue

        # Only REG season, current season
        if row.get("season") and int(row.get("season", 0)) != season:
            continue
        if row.get("season_type", "REG") != "REG":
            continue

        week = int(row.get("week", 0))
        if week <= 0 or week > current_week:
            continue

        if pid not in players:
            players[pid] = {
                "player_id": pid,
                "player_name": row.get("player_display_name") or row.get("player_name", ""),
                "position": row.get("position") or row.get("position_group", ""),
                "team": row.get("team", ""),
                "opponent_team": row.get("opponent_team", ""),
                "games": [],
            }

        pts = 0.0  # scored after averaging, not per game
        players[pid]["games"].append({
            "week": week,
            "stats": row,
        })

    # Compute projections for each player
    projections = []
    total_weeks = 18

    for pid, p in players.items():
        games = sorted(p["games"], key=lambda g: g["week"])

        if not games:
            continue

        # Weighted average of RAW stats: last 3 games weighted 2x.
        # Scoring happens later per league — never baked in here.
        weights = [2 if i >= len(games) - 3 else 1 for i in range(len(games))]
        total_w = sum(weights)
        avg_stats = {}
        for key in AVG_STAT_KEYS:
            s = sum(_num(g["stats"].get(key)) * w for g, w in zip(games, weights))
            v = s / total_w if total_w else 0.0
            if v:
                avg_stats[key] = round(v, 3)

        pos = (p["position"] or "UNK").upper()
        avg_pts = score_avg_stats(avg_stats, REF_SCORING, pos)

        # Remaining games exclude the bye week (bye scores 0, never counts).
        played = len(games)
        bye_week = (byes or {}).get(p.get("team", ""))
        remaining = max(0, total_weeks - current_week
                        - (1 if bye_week and bye_week > current_week else 0))

        # ROS projection = per-game average * remaining weeks
        ros_pts = avg_pts * remaining

        # Confidence interval width
        pos = (p["position"] or "UNK").upper()
        pf = POS_WIDTH.get(pos, 1.0)
        qf = 1.0 if avg_pts <= 12 else min(1.60, 1.0 + (avg_pts - 12) * 0.022)
        width = max(3.0, min(14.0, 5.0 * pf * qf))

        projections.append({
            "player_id": pid,
            "player_name": p["player_name"],
            "position": p["position"],
            "team": p["team"],
            "projected_points": round(avg_pts, 2),
            "projection_lower": round(max(0, avg_pts - width), 2),
            "projection_upper": round(avg_pts + width, 2),
            "width": round(width, 2),
            "ros_points": round(ros_pts, 2),
            "remaining_games": remaining,
            "games_played": played,
            "bye_week": bye_week,
            "avg_stats": avg_stats,
        })

    # Sort by projected points
    projections.sort(key=lambda x: x["projected_points"], reverse=True)

    return projections


def main():
    parser = argparse.ArgumentParser(description="Compute weekly projections")
    parser.add_argument("--week", type=int, help="Current NFL week (Sleeper state if omitted)")
    parser.add_argument("--season", type=int, default=None, help="NFL season year (Sleeper state if omitted)")
    args = parser.parse_args()

    # Auto-detect week/season from Sleeper state, never date math.
    week = args.week
    season = args.season
    if not week or not season:
        try:
            st = (get_nfl_state or (lambda: None))()
        except Exception:
            st = None
        if st:
            week = week or st["week"]
            season = season or st["season"]
    if not week or not season:
        now = datetime.now()
        season = season or (now.year if now.month >= 9 else now.year - 1)
        week = week or 1
    print(f"Computing projections for {season} week {week}...")

    # Fetch stats
    stats_rows = fetch_weekly_stats(season)

    # Schedule (byes) + team defense. Failures degrade gracefully:
    # no byes/team_def rather than no run at all.
    try:
        sched_rows = fetch_csv(SCHEDULE_URL, "schedule")
        byes = compute_byes(sched_rows, season)
        print(f"  Bye weeks for {len(byes)} teams")
    except Exception as e:
        print(f"  Schedule fetch failed ({e}) — skipping byes/team defense")
        sched_rows, byes = [], {}
    team_def = []
    if sched_rows:
        try:
            team_rows = fetch_csv(TEAM_STATS_URL.format(season=season), "team stats")
            team_def = compute_team_def(team_rows, sched_rows, week, season)
            print(f"  Team defense for {len(team_def)} teams")
        except Exception as e:
            print(f"  Team stats fetch failed ({e}) — skipping team defense")

    # Compute projections
    projections = compute_projections(stats_rows, week, season, byes)
    for td in team_def:
        td["bye_week"] = byes.get(td["team"])
    # Current-week opponents from the schedule (player-week rows carry
    # last game's opponent, which is stale for a forward projection).
    opponents: dict[str, str] = {}
    for g in sched_rows:
        if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
            continue
        try:
            if int(g.get("week") or 0) != week:
                continue
        except (ValueError, TypeError):
            continue
        home, away = g.get("home_team"), g.get("away_team")
        if home and away:
            opponents[home] = away
            opponents[away] = home
    for p in projections:
        p["opponent_team"] = opponents.get(p.get("team", ""), "BYE")
    for td in team_def:
        td["opponent_team"] = opponents.get(td.get("team", ""), "BYE")

    # Write output
    out_dir = Path(__file__).parent.parent / "data" / "projections"
    out_dir.mkdir(parents=True, exist_ok=True)

    outfile = out_dir / f"{season}_week_{week:02d}.json"
    data = {
        "week": week,
        "season": season,
        "updated_at": datetime.now().isoformat() + "Z",
        "players": projections,
        "team_def": team_def,
        "byes": byes,
    }

    with open(outfile, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Wrote {len(projections)} projections to {outfile}")

    latest = out_dir / "latest.json"
    with open(latest, "w") as f:
        json.dump(data, f, indent=2)


if __name__ == "__main__":
    main()
