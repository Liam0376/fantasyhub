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
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
from conformal import qhat, POS_RESIDUALS, interval_width
from scoring import AVG_STAT_KEYS, normalize_row_stats, score_avg_stats, score_team_def, REF_SCORING, safe_float, NFLVERSE_STATS_URL
from stat_projector import project_player_stats, build_game_context, COVERED_STATS
from weather import STADIUM_COORDS, get_forecast

try:
    from ml_projector import ml_predict
except ImportError:
    ml_predict = None

# Shared with training (build_training_data.py): serve must build ML
# features with the exact same formulas the model was trained on.
# Same directory, always importable wherever this script runs
# (cron runs it directly; tests put scripts/ on sys.path).
from build_training_data import weighted_avg, linear_trend

try:
    from pbp_features import fetch_pbp_csv, aggregate_pbp
except ImportError:
    fetch_pbp_csv = aggregate_pbp = None

try:
    from opp_features import compute_opp_defense
except ImportError:
    compute_opp_defense = None

try:
    from nfl_state import get_nfl_state
except ImportError:
    get_nfl_state = None

# nflverse weekly stats URL
STATS_URL = NFLVERSE_STATS_URL
TEAM_STATS_URL = "https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_{season}.csv"
SCHEDULE_URL = "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv"

# Reference DEF scoring (standard brackets) for standalone readability.
REF_DEF_SCORING = {
    "sack": 1.0, "int": 2.0, "fum_rec": 2.0, "ff": 1.0,
    "def_td": 6.0, "safe": 2.0, "blk_kick": 2.0, "st_td": 6.0,
    "pts_allow_0": 10.0, "pts_allow_1_6": 7.0, "pts_allow_7_13": 4.0,
    "pts_allow_14_20": 1.0, "pts_allow_21_27": 0.0,
    "pts_allow_28_34": -1.0, "pts_allow_35p": -4.0,
}


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


def fetch_prior_season_stats(season: int) -> list[dict]:
    """Prior season's full weekly stats, for the thin-sample blend.
    Soft-fail: returns [] if unavailable (a new/expansion scenario, or
    the URL 404s for a season with no prior-year data on nflverse)."""
    try:
        return fetch_csv(STATS_URL.format(season=season - 1), "prior season stats")
    except Exception as e:
        print(f"  Prior season fetch failed ({e}) — thin-sample blend disabled")
        return []


def fetch_current_and_prior_season_history(stats_rows: list[dict], prior_rows: list[dict],
                                            current_week: int, season: int) -> tuple[dict, dict]:
    """Group both seasons' rows by player_id -> list of game dicts.

    Returns (current_history, prior_history) — current_history only
    includes weeks strictly before current_week (true out-of-sample,
    same discipline as the father project's build_weekly_projections)."""
    current: dict[str, list] = {}
    for row in stats_rows:
        pid = row.get("player_id") or row.get("player_name", "")
        if not pid:
            continue
        if row.get("season") and int(row.get("season", 0)) != season:
            continue
        if row.get("season_type", "REG") != "REG":
            continue
        try:
            wk = int(row.get("week", 0))
        except (ValueError, TypeError):
            continue
        if wk <= 0 or wk >= current_week:
            continue
        current.setdefault(pid, []).append(row)

    prior: dict[str, list] = {}
    for row in prior_rows:
        # Training filters postseason here too (build_training_data.py:233);
        # without it playoff games leak into the thin-sample prior blend.
        if row.get("season_type", "REG") != "REG":
            continue
        pid = row.get("player_id") or row.get("player_name", "")
        if pid:
            prior.setdefault(pid, []).append(row)

    for pid in current:
        current[pid].sort(key=lambda r: int(r.get("week", 0)))
    return current, prior


def fetch_week_weather(sched_rows: list[dict], target_week: int, season: int) -> dict:
    """(team -> {temp_f, wind_mph}) for the target week's games only.
    Open-Meteo's 16-day window can't cover far-future weeks anyway, so
    only the immediate target week gets a real forecast; every other
    remaining week is weather-neutral (matches Open-Meteo's actual
    limitation, not an arbitrary cutoff).

    Dome and closed-roof stadiums are skipped — they fall back to
    correct dome-neutral values (wind=0, temp=72) from build_game_context.
    """
    out: dict[str, dict] = {}
    for g in sched_rows:
        if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
            continue
        try:
            if int(g.get("week") or 0) != target_week:
                continue
        except (ValueError, TypeError):
            continue
        # Skip Open-Meteo fetch for dome/closed stadiums
        if g.get("roof", "") in ("dome", "closed"):
            continue
        gametime = g.get("gametime") or "13:00"
        gameday = g.get("gameday") or ""
        if not gameday:
            continue
        for team_key in ("home_team", "away_team"):
            team = g.get(team_key)
            coords = STADIUM_COORDS.get(team)
            if not team or not coords:
                continue
            try:
                iso = f"{gameday}T{gametime}:00"
                forecast = get_forecast(coords[0], coords[1], iso)
            except Exception:
                forecast = None
            if forecast:
                out[team] = forecast
    return out


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


_num = safe_float


def _num_or_none(v):
    try:
        return float(v) if v not in (None, "") else None
    except (ValueError, TypeError):
        return None




def compute_projections(stats_rows: list[dict], current_week: int, season: int,
                        byes: dict | None = None, prior_season_rows: list[dict] | None = None,
                        game_ctx: dict | None = None, weather_by_team: dict | None = None,
                        pbp_data: dict | None = None, opp_defense: dict | None = None,
                        prior_pbp_data: dict | None = None,
                        home_map: dict | None = None, spread_map: dict | None = None,
                        roster_info: dict | None = None, snap_data: dict | None = None,
                        roster_rows: list[dict] | None = None) -> list[dict]:
    """Project per-game avg raw stats for the CURRENT target week only.

    For stat keys the father project's backtested pipeline covers
    (COVERED_STATS: QB/skill/kicker core stats), uses the full
    shrinkage/regression/Vegas/weather pipeline (api/stat_projector.py).
    For every other AVG_STAT_KEYS entry (IDP, first downs, fumble-recovery
    detail, long-TD, FG-miss brackets, PAT missed, special-teams TD — no
    backtest evidence for these categories), keeps the original bare
    weighted_recent_avg — same behavior as before this port.

    ROS is still avg_pts * remaining_games (unchanged from before this
    port) — this port fixes the THIN-SAMPLE OVERWEIGHTING in the average
    itself, not the ROS summation strategy (deferred at plan time; the
    spec requires per-week independent summation but it was scoped out
    to keep this port bounded).
    """
    current_hist, prior_hist = fetch_current_and_prior_season_history(
        stats_rows, prior_season_rows or [], current_week, season)

    players = {}
    for pid, games in current_hist.items():
        first = games[-1]
        players[pid] = {
            "player_id": pid,
            "player_name": first.get("player_display_name") or first.get("player_name", ""),
            "position": first.get("position") or first.get("position_group", ""),
            "team": first.get("team", ""),
            "opponent_team": first.get("opponent_team", ""),
            "games": games,
        }
    # Players who only exist in the CURRENT week's row list (fetched by the
    # caller for team/opponent context) but have no prior game this season
    # yet still need an entry so rookies/first-week-back players appear.
    for row in stats_rows:
        pid = row.get("player_id") or row.get("player_name", "")
        if not pid or pid in players or row.get("season_type", "REG") != "REG":
            continue
        try:
            row_season = int(row.get("season", 0) or 0)
        except (ValueError, TypeError):
            continue
        if row_season == season:
            players[pid] = {
                "player_id": pid,
                "player_name": row.get("player_display_name") or row.get("player_name", ""),
                "position": row.get("position") or row.get("position_group", ""),
                "team": row.get("team", ""),
                "opponent_team": row.get("opponent_team", ""),
                "games": [],
            }

    game_ctx = game_ctx or {}
    weather_by_team = weather_by_team or {}
    total_weeks = 18
    projections = []

    # Roster universe: players on an NFL roster this week but without any
    # stat history (out/inactive early weeks, e.g. TreVeyon Henderson wk1).
    # Without this they never enter players{} and vanish from output.
    # They project from position priors (+ prior season when present).
    # Excludes: bye-week teams (score 0), non-skill positions, and rows
    # with an explicit non-active roster status (IR/PUP/inactive).
    _OUT_STATUSES = {"INA", "IR", "PUP", "NFI", "SUS", "RES", "EXE", "DNP", "OUT"}
    _n_seeded = 0
    for r in roster_rows or []:
        try:
            if int(r.get("week", 0)) != current_week:
                continue
        except (ValueError, TypeError):
            continue
        if str(r.get("season", season)) != str(season):
            continue
        pid = r.get("gsis_id") or ""
        if not pid or pid in players:
            continue
        pos = (r.get("position") or "").upper()
        if pos not in ("QB", "RB", "WR", "TE", "K"):
            continue
        team = r.get("team", "")
        if (byes or {}).get(team) == current_week:
            continue
        st = (r.get("status") or "").upper()
        if st and st in _OUT_STATUSES:
            continue
        name = r.get("full_name") or (
            f"{r.get('first_name', '')} {r.get('last_name', '')}".strip())
        players[pid] = {
            "player_id": pid, "player_name": name or pid,
            "position": pos, "team": team, "opponent_team": "",
            "games": [],
        }
        _n_seeded += 1
    if roster_rows and _n_seeded:
        print(f"  Seeded {_n_seeded} no-history roster players (week {current_week})")

    for pid, p in players.items():
        pos = (p["position"] or "UNK").upper()
        history = p["games"]
        prior_games = prior_hist.get(pid, [])
        ctx = game_ctx.get((p["team"], current_week), {})
        implied_total = ctx.get("implied_total", 0)
        weather = weather_by_team.get(p["team"], {})
        wind_mph = weather.get("wind_mph", ctx.get("wind", 0) or 0)
        temp_f = weather.get("temp_f", ctx.get("temp"))

        avg_stats: dict = {}
        covered = COVERED_STATS.get(pos, [])
        if covered:
            # Normalize stat values to floats for stat_projector
            norm_history = [normalize_row_stats(g) for g in history]
            norm_prior = [normalize_row_stats(g) for g in prior_games]
            projected = project_player_stats(
                player_history=norm_history, position=pos,
                prior_season_stats=norm_prior, implied_total=implied_total,
                wind_mph=wind_mph, temp_f=temp_f,
            )
            for key in covered:
                v = projected.get(key, 0.0)
                if v:
                    avg_stats[key] = round(v, 3)
        # Uncovered stat keys: original bare weighted-recent-avg (unchanged).
        weights = [2 if i >= len(history) - 3 else 1 for i in range(len(history))]
        total_w = sum(weights) or 1
        for key in AVG_STAT_KEYS:
            if key in covered:
                continue
            s = sum(_num(g.get(key)) * w for g, w in zip(history, weights))
            v = s / total_w if total_w else 0.0
            if v:
                avg_stats[key] = round(v, 3)

        avg_pts = score_avg_stats(avg_stats, REF_SCORING, pos)

        # ML residual: if model available, predict correction to heuristic
        ml_adj = 0.0
        if ml_predict and pbp_data is not None:
            sp = (spread_map or {}).get((p["team"], current_week), {})
            ri = (roster_info or {}).get(pid, {})
            ml_features = {
                "games_played": len(history), "week": current_week,
                # Training (build_training_data.py:274-275) defines
                # curr_ppg_wavg as the recency-weighted average of PAST
                # actual PPG — not the heuristic point estimate. The
                # heuristic lives in heuristic_pts (training :389).
                # Scoring raw rows mirrors training exactly.
                "curr_ppg_wavg": weighted_avg(
                    [score_avg_stats(g, REF_SCORING, pos) for g in history]),
                "heuristic_pts": avg_pts,
                "prior_ppg": 0, "prior_games": 0,
                "implied_total": implied_total,
                "spread": sp.get("spread", 0),
                "over_under": sp.get("over_under", 0),
                "wind_mph": wind_mph or 0,
                "temp_f": temp_f if temp_f is not None else 72.0,
                "is_home": (home_map or {}).get((p["team"], current_week), 0.5),
                "opp_pts_allowed": 0,
                "snap_pct_wavg": 0,  # populated below from snap_data
                "years_exp": ri.get("years_exp", 0),
                "draft_number": ri.get("draft_number", 0),
                "ppg_std": 0, "ppg_trend": 0, "ppg_max": 0, "ppg_min": 0,
            }
            # PBP usage (weighted avg of history weeks). Rows are grouped
            # by player_id-or-name; rows carrying an id look it up
            # directly (training: build_training_data.py:314), while
            # purely name-keyed groups cannot match GSIS-keyed PBP rows
            # and honestly resolve to zero usage features.
            pbp_lists: dict[str, list[float]] = defaultdict(list)
            for h in history:
                hw = int(h.get("week", 0))
                hpid = h.get("player_id") or pid
                pf = (pbp_data or {}).get((hpid, hw))
                if pf:
                    for k in ("target_share", "rush_share", "air_yards_share",
                              "snap_share", "redzone_targets", "redzone_carries"):
                        pbp_lists[k].append(pf.get(k, 0))
            for k in ("target_share", "rush_share", "air_yards_share",
                      "snap_share", "redzone_targets", "redzone_carries"):
                vals = pbp_lists.get(k, [])
                ml_features[f"pbp_{k}_wavg"] = weighted_avg(vals)
            # Prior PBP
            for k in ("target_share", "rush_share", "snap_share"):
                ml_features[f"prior_pbp_{k}"] = 0
            if prior_pbp_data:
                prior_pbp_lists: dict[str, list[float]] = defaultdict(list)
                for pg in prior_games:
                    pw = int(pg.get("week", 0))
                    pgpid = pg.get("player_id") or pid
                    ppf = prior_pbp_data.get((pgpid, pw))
                    if ppf:
                        for k in ("target_share", "rush_share", "snap_share"):
                            prior_pbp_lists[k].append(ppf.get(k, 0))
                for k in ("target_share", "rush_share", "snap_share"):
                    vals = prior_pbp_lists.get(k, [])
                    ml_features[f"prior_pbp_{k}"] = (sum(vals) / len(vals)) if vals else 0
            # Snap counts (weighted avg over history weeks, joined by
            # name+team+week exactly like training). Team is per-WEEK
            # (recent_team or team on that row): traded players' early
            # weeks belong to their old team in the snap CSV.
            if snap_data:
                player_name_lower = p.get("player_name", "").strip().lower()
                snap_vals = []
                for h in history:
                    hw = int(h.get("week", 0))
                    h_team = h.get("recent_team") or h.get("team") or p.get("team", "")
                    sc = snap_data.get((player_name_lower, h_team, hw))
                    if sc is not None:
                        snap_vals.append(sc)
                if snap_vals:
                    ml_features["snap_pct_wavg"] = weighted_avg(snap_vals)
            # Prior season PPG
            if prior_games:
                prior_ppgs = [score_avg_stats(normalize_row_stats(g), REF_SCORING, pos) for g in prior_games]
                ml_features["prior_ppg"] = sum(prior_ppgs) / len(prior_ppgs) if prior_ppgs else 0
                ml_features["prior_games"] = len(prior_games)
            # Opponent defense
            opp_team = ctx.get("opponent", "")
            if opp_defense and opp_team:
                opp_entry = opp_defense.get(opp_team, {})
                ml_features["opp_pts_allowed"] = opp_entry.get(f"{pos.lower()}_pts_allowed", 0)
            # Current stat averages (training: weighted_avg, same stat list)
            for stat in ("passing_yards", "rushing_yards", "receiving_yards",
                         "receptions", "carries", "passing_tds", "rushing_tds",
                         "receiving_tds", "targets", "receiving_air_yards",
                         "passing_epa", "passing_cpoe", "wopr", "sacks_suffered",
                         "passing_interceptions", "fumbles_lost_total"):
                vals = [safe_float(g.get(stat, 0)) for g in history]
                ml_features[f"curr_{stat}_wavg"] = weighted_avg(vals)
            # PPG variance/trend (training: raw rows, std centered on the
            # weighted curr_ppg_wavg, shared linear_trend helper)
            if history:
                ppgs = [score_avg_stats(g, REF_SCORING, pos) for g in history]
                ml_features["ppg_std"] = (sum((p - ml_features["curr_ppg_wavg"])**2 for p in ppgs) / len(ppgs)) ** 0.5 if len(ppgs) > 1 else 0.0
                ml_features["ppg_max"] = max(ppgs)
                ml_features["ppg_min"] = min(ppgs)
                ml_features["ppg_trend"] = linear_trend(ppgs[-5:])

            residual = ml_predict(ml_features, pos)
            # Carry the residual through to the JSON output: serve-time
            # league rescoring (analytics.rescore_player) re-applies it,
            # otherwise the ML pipeline would be a silent no-op.
            ml_adj = residual if residual is not None else 0.0
            avg_pts = avg_pts + ml_adj

        played = len(history)
        bye_week = (byes or {}).get(p.get("team", ""))
        remaining = max(0, total_weeks - current_week
                        - (1 if bye_week and bye_week > current_week else 0))
        ros_pts = avg_pts * remaining

        width = interval_width(pos, avg_pts)

        entry = {
            "player_id": pid,
            "player_name": p["player_name"],
            "position": p["position"],
            "team": p["team"],
            "projected_points": round(avg_pts, 2),
            "ml_adjustment": round(ml_adj, 2),
            "projection_lower": round(max(0, avg_pts - width), 2),
            "projection_upper": round(avg_pts + width, 2),
            "width": round(width, 2),
            "ros_points": round(ros_pts, 2),
            "remaining_games": remaining,
            "games_played": played,
            "bye_week": bye_week,
            "avg_stats": avg_stats,
        }
        if pos == "QB":
            entry["projected_pass_yards"] = round(avg_stats.get("passing_yards", 0), 1)
            entry["projected_pass_tds"] = round(avg_stats.get("passing_tds", 0), 2)
            entry["projected_rush_yards"] = round(avg_stats.get("rushing_yards", 0), 1)
            entry["projected_rush_tds"] = round(avg_stats.get("rushing_tds", 0), 2)
            entry["projected_carries"] = round(avg_stats.get("carries", 0), 1)
        season_games = played + remaining
        entry["market_season_stats"] = {
            k: round(v * season_games, 1)
            for k, v in avg_stats.items()
            if k in ("passing_yards", "rushing_yards", "receiving_yards",
                      "receptions", "passing_tds", "rushing_tds", "receiving_tds")
        }
        projections.append(entry)

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
    prior_season_rows = fetch_prior_season_stats(season)

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

    # Vegas context for all weeks (schedule already has lines per game).
    game_ctx = build_game_context(sched_rows) if sched_rows else {}

    # PBP features (for ML model)
    pbp_data = None
    prior_pbp_data = None
    opp_defense = None
    if fetch_pbp_csv and aggregate_pbp:
        try:
            print("Fetching PBP data...")
            pbp_rows = fetch_pbp_csv(season)
            pbp_data = aggregate_pbp(pbp_rows, season)
            print(f"  {len(pbp_data)} PBP player-weeks")
        except Exception as e:
            print(f"  PBP fetch failed ({e}) — ML features unavailable")
        try:
            prior_pbp_rows = fetch_pbp_csv(season - 1)
            prior_pbp_data = aggregate_pbp(prior_pbp_rows, season - 1)
        except Exception:
            pass

    # Home/away + spread maps for ML features
    home_map = {}
    spread_map = {}
    roster_info = {}
    if sched_rows:
        for g in sched_rows:
            if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
                continue
            try:
                wk = int(g.get("week", 0))
            except (ValueError, TypeError):
                continue
            home = g.get("home_team", "")
            away = g.get("away_team", "")
            spread = safe_float(g.get("spread_line", 0))
            ou = safe_float(g.get("total_line", 0))
            if home:
                home_map[(home, wk)] = 1.0
                spread_map[(home, wk)] = {"spread": spread, "over_under": ou}
            if away:
                home_map[(away, wk)] = 0.0
                spread_map[(away, wk)] = {"spread": -spread, "over_under": ou}

    # Roster info (years_exp, draft_number) + full rows for universe
    # seeding (compute_projections needs team/pos/status per week).
    roster_rows = []
    try:
        import csv as _csv
        import io as _io
        roster_url = f"https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_{season}.csv"
        import requests as _req
        resp = _req.get(roster_url, timeout=30)
        if resp.status_code == 200:
            for r in _csv.DictReader(_io.StringIO(resp.text)):
                pid = r.get("gsis_id") or ""
                if pid:
                    roster_info[pid] = {
                        "years_exp": safe_float(r.get("years_exp", 0)),
                        "draft_number": safe_float(r.get("draft_number", 0)),
                    }
                    roster_rows.append(r)
            print(f"  Roster info for {len(roster_info)} players")
    except Exception:
        pass

    # Snap counts for ML features
    snap_data = {}
    try:
        import csv as _csv2
        import io as _io2
        snap_url = f"https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_{season}.csv"
        import requests as _req2
        resp2 = _req2.get(snap_url, timeout=30)
        if resp2.status_code == 200:
            for r in _csv2.DictReader(_io2.StringIO(resp2.text)):
                name = (r.get("player") or "").strip().lower()
                team = r.get("team", "")
                try:
                    wk = int(r.get("week", 0))
                except (ValueError, TypeError):
                    continue
                pct = safe_float(r.get("offense_pct", 0))
                if name and team and wk:
                    snap_data[(name, team, wk)] = pct
            print(f"  Snap counts for {len(snap_data)} player-weeks")
    except Exception:
        pass

    if compute_opp_defense and sched_rows:
        try:
            opp_defense = compute_opp_defense(stats_rows, sched_rows, REF_SCORING, up_to_week=week)
            print(f"  Opponent defense for {len(opp_defense)} teams")
        except Exception as e:
            print(f"  Opponent defense failed ({e})")

    # Opponent lookup per week from schedule.
    def week_opponents(target_week):
        opp = {}
        for g in sched_rows:
            if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
                continue
            try:
                if int(g.get("week") or 0) != target_week:
                    continue
            except (ValueError, TypeError):
                continue
            home, away = g.get("home_team"), g.get("away_team")
            if home and away:
                opp[home] = away
                opp[away] = home
        return opp

    # Slate snapshots for every week (matchups view + game predictions).
    slate_dir = Path(__file__).parent.parent / "data" / "slate"
    slate_dir.mkdir(parents=True, exist_ok=True)

    out_dir = Path(__file__).parent.parent / "data" / "projections"
    out_dir.mkdir(parents=True, exist_ok=True)

    now_utc = datetime.now(timezone.utc).isoformat()
    total_weeks = 18

    # Generate projections for current week through week 18.
    # Same stats history, different opponent/Vegas/weather context per week.
    # Weather only available for current week (Open-Meteo 16-day limit);
    # future weeks stay weather-neutral (honest nulls).
    for target_week in range(week, total_weeks + 1):
        weather_by_team = fetch_week_weather(sched_rows, target_week, season) if sched_rows else {}
        if target_week == week:
            print(f"  Weather forecast for {len(weather_by_team)} teams (week {target_week})")

        projections = compute_projections(stats_rows, target_week, season, byes,
                                          prior_season_rows, game_ctx, weather_by_team,
                                          pbp_data, opp_defense, prior_pbp_data,
                                          home_map, spread_map, roster_info, snap_data,
                                          roster_rows)
        # Team DEF: copy and set per-week opponents/byes.
        week_td = []
        for td in team_def:
            td_copy = {**td, "bye_week": byes.get(td["team"])}
            week_td.append(td_copy)

        opponents = week_opponents(target_week)
        for p in projections:
            p["opponent_team"] = opponents.get(p.get("team", ""), "BYE")
        for td in week_td:
            td["opponent_team"] = opponents.get(td.get("team", ""), "BYE")

        # Slate for this week (weather only for near-term).
        slate_games = []
        for g in sched_rows:
            if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
                continue
            try:
                wk = int(g.get("week") or 0)
            except (ValueError, TypeError):
                continue
            if wk != target_week:
                continue
            wind_mph, temp_f, precip_prob = None, None, None
            if g.get("roof", "") in ("dome", "closed"):
                wind_mph, temp_f, precip_prob = 0, 72, 0
            elif target_week == week:
                w = weather_by_team.get(g.get("home_team") or "") or {}
                try:
                    wind_mph = round(float(w["wind_mph"]), 1) if w.get("wind_mph") is not None else None
                    temp_f = round(float(w["temp_f"]), 1) if w.get("temp_f") is not None else None
                    precip_prob = round(float(w["precip_prob"]), 0) if w.get("precip_prob") is not None else None
                except (ValueError, TypeError):
                    wind_mph, temp_f, precip_prob = None, None, None
            slate_games.append({
                "home_team": g.get("home_team"), "away_team": g.get("away_team"),
                "stadium": g.get("stadium"), "gameday": g.get("gameday"),
                "gametime": g.get("gametime"),
                "spread_line": _num_or_none(g.get("spread_line")),
                "total_line": _num_or_none(g.get("total_line")),
                "wind_mph": wind_mph, "temp_f": temp_f,
                "precip_prob": precip_prob,
            })
        with open(slate_dir / f"{season}_week_{target_week:02d}.json", "w") as f:
            json.dump({"week": target_week, "season": season, "games": slate_games}, f)

        data = {
            "week": target_week,
            "season": season,
            "updated_at": now_utc,
            "players": projections,
            "team_def": week_td,
            "byes": byes,
        }

        outfile = out_dir / f"{season}_week_{target_week:02d}.json"
        with open(outfile, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Wrote {len(projections)} projections to {outfile}")

    # latest.json always points to current week
    latest_file = out_dir / f"{season}_week_{week:02d}.json"
    latest = out_dir / "latest.json"
    with open(latest_file) as src:
        latest_data = json.load(src)
    with open(latest, "w") as f:
        json.dump(latest_data, f, indent=2)


if __name__ == "__main__":
    main()
