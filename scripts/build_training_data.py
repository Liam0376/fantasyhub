#!/usr/bin/env python3
"""Build ML training data from nflverse historical stats + PBP.

For each player-week in seasons 2022-2025:
  - Collect all games BEFORE target week as "history"
  - Compute PBP usage features from games before target week
  - Compute opponent defense features for the matchup
  - Record actual fantasy points scored as the target

Output: data/models/training_data.jsonl

Critical: NO heuristic stat projections as features. Features are raw
usage/context signals + the heuristic's POINT total (for residual mode).
"""

import csv
import io
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

from scoring import REF_SCORING, score_avg_stats, normalize_row_stats, safe_float, NFLVERSE_STATS_URL
from stat_projector import (
    build_game_context, project_player_stats, COVERED_STATS,
    weighted_recent_avg,
)
from pbp_features import fetch_pbp_csv, aggregate_pbp
from opp_features import compute_opp_defense

SEASONS = [2022, 2023, 2024, 2025]
MIN_WEEK = 2
OUTPUT = Path(__file__).parent.parent / "data" / "models" / "training_data.jsonl"
SCHEDULE_URL = "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv"
SNAP_COUNTS_URL = "https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_{season}.csv"
ROSTER_URL = "https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_{season}.csv"

# Efficiency stats from weekly CSV (already fetched, just need to read more columns)
EFFICIENCY_STATS = [
    "passing_epa", "passing_cpoe", "targets", "receiving_air_yards",
    "wopr", "sacks_suffered", "passing_interceptions", "fumbles_lost_total",
]

# Volume stats for weighted averages
VOLUME_STATS = [
    "passing_yards", "rushing_yards", "receiving_yards",
    "receptions", "carries", "passing_tds", "rushing_tds", "receiving_tds",
]


def fetch_csv(url: str, timeout: int = 120) -> list[dict]:
    import requests
    resp = requests.get(url, timeout=timeout)
    resp.raise_for_status()
    text = resp.content.decode("utf-8", errors="replace")
    return list(csv.DictReader(io.StringIO(text)))


def weighted_avg(values: list[float], recent_n: int = 5, recent_w: float = 2.0) -> float:
    if not values:
        return 0.0
    if len(values) <= recent_n:
        return sum(values) / len(values)
    old = values[:-recent_n]
    recent = values[-recent_n:]
    total_w = len(old) + len(recent) * recent_w
    return (sum(old) + sum(recent) * recent_w) / total_w


def linear_trend(values: list[float]) -> float:
    """Slope of simple linear regression over values."""
    n = len(values)
    if n < 3:
        return 0.0
    x_mean = (n - 1) / 2.0
    y_mean = sum(values) / n
    num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    den = sum((i - x_mean) ** 2 for i in range(n))
    return num / den if den else 0.0


def build_home_away_map(sched: list[dict], season: int) -> dict[tuple[str, int], float]:
    """(team, week) -> 1.0 if home, 0.0 if away."""
    out = {}
    for g in sched:
        if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
            continue
        try:
            wk = int(g.get("week", 0))
        except (ValueError, TypeError):
            continue
        home = g.get("home_team", "")
        away = g.get("away_team", "")
        if home:
            out[(home, wk)] = 1.0
        if away:
            out[(away, wk)] = 0.0
    return out


def build_spread_map(sched: list[dict], season: int) -> dict[tuple[str, int], dict]:
    """(team, week) -> {spread, over_under}."""
    out = {}
    for g in sched:
        if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
            continue
        try:
            wk = int(g.get("week", 0))
        except (ValueError, TypeError):
            continue
        spread = safe_float(g.get("spread_line", 0))
        ou = safe_float(g.get("total_line", 0)) or safe_float(g.get("over_under", 0))
        home = g.get("home_team", "")
        away = g.get("away_team", "")
        if home:
            out[(home, wk)] = {"spread": spread, "over_under": ou}
        if away:
            out[(away, wk)] = {"spread": -spread, "over_under": ou}
    return out


def fetch_snap_counts(season: int) -> dict[tuple[str, str, int], float]:
    """(player_name_lower, team, week) -> offense_pct. Joined by name since no gsis_id."""
    try:
        rows = fetch_csv(SNAP_COUNTS_URL.format(season=season))
        out = {}
        for r in rows:
            name = (r.get("player") or "").strip().lower()
            team = (r.get("team") or "").strip()
            if not name or not team:
                continue
            try:
                wk = int(r.get("week", 0))
                pct = safe_float(r.get("offense_pct", 0))
            except (ValueError, TypeError):
                continue
            out[(name, team, wk)] = pct
        return out
    except Exception as e:
        print(f"  Snap counts fetch failed: {e}")
        return {}


def fetch_roster_info(season: int) -> dict[str, dict]:
    """gsis_id -> {years_exp, draft_number}. Takes latest entry per player."""
    try:
        rows = fetch_csv(ROSTER_URL.format(season=season))
        out = {}
        for r in rows:
            pid = r.get("gsis_id") or ""
            if not pid:
                continue
            out[pid] = {
                "years_exp": safe_float(r.get("years_exp", 0)),
                "draft_number": safe_float(r.get("draft_number", 0)),
            }
        return out
    except Exception as e:
        print(f"  Roster fetch failed: {e}")
        return {}


def build_season(season: int, schedule_rows: list[dict]) -> list[dict]:
    print(f"\n=== Season {season} ===")

    # FIX 1: Filter schedule to THIS season before building game context
    season_sched = [g for g in schedule_rows if str(g.get("season")) == str(season)]
    game_ctx = build_game_context(season_sched)
    print(f"  Game context: {len(game_ctx)} team-weeks")

    # FIX 2: Home/away map
    home_map = build_home_away_map(schedule_rows, season)

    # FIX 3: Spread/over-under map
    spread_map = build_spread_map(schedule_rows, season)

    # Fetch player stats
    url = NFLVERSE_STATS_URL.format(season=season)
    print(f"Fetching stats from {url}...")
    all_stats = fetch_csv(url)
    print(f"  {len(all_stats)} stat rows")

    # Prior season stats
    prior_url = NFLVERSE_STATS_URL.format(season=season - 1)
    print(f"Fetching prior season stats...")
    prior_stats = fetch_csv(prior_url)

    # PBP
    print(f"Fetching PBP data...")
    try:
        pbp_rows = fetch_pbp_csv(season)
        pbp_features = aggregate_pbp(pbp_rows, season)
        print(f"  {len(pbp_features)} PBP player-weeks")
    except Exception as e:
        print(f"  PBP fetch failed: {e}")
        pbp_features = {}

    try:
        prior_pbp_rows = fetch_pbp_csv(season - 1)
        prior_pbp = aggregate_pbp(prior_pbp_rows, season - 1)
    except Exception:
        prior_pbp = {}

    # FIX 5: Snap counts
    print("Fetching snap counts...")
    snap_counts = fetch_snap_counts(season)
    print(f"  {len(snap_counts)} snap count entries")

    # FIX 6: Roster data
    print("Fetching roster info...")
    roster = fetch_roster_info(season)
    print(f"  {len(roster)} players with roster info")

    # Group stats by player
    player_weeks: dict[str, list[dict]] = defaultdict(list)
    for row in all_stats:
        if row.get("season_type") != "REG":
            continue
        pid = row.get("player_id", "")
        if not pid:
            continue
        player_weeks[pid].append(row)

    for pid in player_weeks:
        player_weeks[pid].sort(key=lambda r: int(r.get("week", 0)))

    # Prior season by player
    prior_by_player: dict[str, list[dict]] = defaultdict(list)
    for row in prior_stats:
        if row.get("season_type") != "REG":
            continue
        pid = row.get("player_id", "")
        if pid:
            prior_by_player[pid].append(row)

    # Precompute opponent defense per week
    max_week = max(int(r.get("week", 0)) for r in all_stats if r.get("season_type") == "REG")
    opp_def_by_week: dict[int, dict] = {}
    for tw in range(MIN_WEEK, max_week + 1):
        opp_def_by_week[tw] = compute_opp_defense(all_stats, season_sched, REF_SCORING, up_to_week=tw)

    training_rows = []

    for pid, weeks_data in player_weeks.items():
        for i, target_row in enumerate(weeks_data):
            target_week = int(target_row.get("week", 0))
            if target_week < MIN_WEEK:
                continue

            pos = (target_row.get("position") or "").upper()
            if pos not in ("QB", "RB", "WR", "TE", "K"):
                continue

            team = target_row.get("recent_team") or target_row.get("team") or ""
            history = weeks_data[:i]

            actual_pts = score_avg_stats(target_row, REF_SCORING, pos)
            if actual_pts == 0:
                continue

            features: dict[str, float] = {}
            features["games_played"] = len(history)
            features["week"] = target_week

            # --- Volume stats (weighted avg) ---
            if history:
                for stat in VOLUME_STATS:
                    vals = [safe_float(g.get(stat, 0)) for g in history]
                    features[f"curr_{stat}_wavg"] = weighted_avg(vals)

                ppgs = [score_avg_stats(g, REF_SCORING, pos) for g in history]
                features["curr_ppg_wavg"] = weighted_avg(ppgs)

                # FIX 7: Variance + trend features
                features["ppg_std"] = (sum((p - features["curr_ppg_wavg"])**2 for p in ppgs) / len(ppgs)) ** 0.5 if len(ppgs) > 1 else 0.0
                features["ppg_trend"] = linear_trend(ppgs[-5:])
                features["ppg_max"] = max(ppgs)
                features["ppg_min"] = min(ppgs)
            else:
                for stat in VOLUME_STATS:
                    features[f"curr_{stat}_wavg"] = 0
                features["curr_ppg_wavg"] = 0
                features["ppg_std"] = 0
                features["ppg_trend"] = 0
                features["ppg_max"] = 0
                features["ppg_min"] = 0

            # FIX 4: Efficiency stats (weighted avg from same CSV)
            if history:
                for stat in EFFICIENCY_STATS:
                    vals = [safe_float(g.get(stat, 0)) for g in history]
                    features[f"curr_{stat}_wavg"] = weighted_avg(vals)
            else:
                for stat in EFFICIENCY_STATS:
                    features[f"curr_{stat}_wavg"] = 0

            # Prior season
            prior = prior_by_player.get(pid, [])
            if prior:
                prior_ppgs = [score_avg_stats(g, REF_SCORING, pos) for g in prior]
                features["prior_ppg"] = sum(prior_ppgs) / len(prior_ppgs)
                features["prior_games"] = len(prior)
            else:
                features["prior_ppg"] = 0
                features["prior_games"] = 0

            # PBP usage features
            pbp_vals: dict[str, list[float]] = defaultdict(list)
            for h in history:
                hw = int(h.get("week", 0))
                hpid = h.get("player_id", pid)
                pf = pbp_features.get((hpid, hw))
                if pf:
                    for k in ("target_share", "rush_share", "air_yards_share",
                              "snap_share", "redzone_targets", "redzone_carries"):
                        pbp_vals[k].append(pf.get(k, 0))

            for k in ("target_share", "rush_share", "air_yards_share",
                      "snap_share", "redzone_targets", "redzone_carries"):
                vals = pbp_vals.get(k, [])
                features[f"pbp_{k}_wavg"] = weighted_avg(vals)

            # Prior PBP
            prior_pbp_vals: dict[str, list[float]] = defaultdict(list)
            for pw in prior_by_player.get(pid, []):
                pw_week = int(pw.get("week", 0))
                pf = prior_pbp.get((pid, pw_week))
                if pf:
                    for k in ("target_share", "rush_share", "snap_share"):
                        prior_pbp_vals[k].append(pf.get(k, 0))

            for k in ("target_share", "rush_share", "snap_share"):
                vals = prior_pbp_vals.get(k, [])
                features[f"prior_pbp_{k}"] = (sum(vals) / len(vals)) if vals else 0

            # FIX 1: Vegas context (now season-filtered)
            ctx = game_ctx.get((team, target_week), {})
            features["implied_total"] = safe_float(ctx.get("implied_total", 0))
            features["wind_mph"] = safe_float(ctx.get("wind", 0))
            temp = ctx.get("temp")
            features["temp_f"] = safe_float(temp) if temp is not None else 72.0

            # FIX 2: Home/away
            features["is_home"] = home_map.get((team, target_week), 0.5)

            # FIX 3: Spread + over/under
            sp = spread_map.get((team, target_week), {})
            features["spread"] = sp.get("spread", 0)
            features["over_under"] = sp.get("over_under", 0)

            # Opponent defense
            opp_team = ctx.get("opponent", "")
            opp_entry = opp_def_by_week.get(target_week, {}).get(opp_team, {})
            features["opp_pts_allowed"] = opp_entry.get(f"{pos.lower()}_pts_allowed", 0)

            # FIX 5: Snap count (actual, not PBP proxy) — joined by name+team+week
            player_name = (target_row.get("player_display_name") or target_row.get("player_name") or "").strip().lower()
            snap_vals = []
            for h in history:
                hw = int(h.get("week", 0))
                h_team = h.get("recent_team") or h.get("team") or team
                sc = snap_counts.get((player_name, h_team, hw))
                if sc is not None:
                    snap_vals.append(sc)
            features["snap_pct_wavg"] = weighted_avg(snap_vals)

            # FIX 6: Roster info
            ri = roster.get(pid, {})
            features["years_exp"] = ri.get("years_exp", 0)
            features["draft_number"] = ri.get("draft_number", 0)

            # Position encoding
            for p in ("QB", "RB", "WR", "TE", "K"):
                features[f"is_{p.lower()}"] = 1.0 if pos == p else 0.0

            # FIX 8: Heuristic projection (for residual prediction mode)
            norm_history = [normalize_row_stats(g) for g in history]
            norm_prior = [normalize_row_stats(g) for g in prior]
            heuristic_proj = project_player_stats(
                player_history=norm_history, position=pos,
                prior_season_stats=norm_prior,
                implied_total=features["implied_total"],
                wind_mph=features["wind_mph"],
                temp_f=features["temp_f"] if features["temp_f"] != 72.0 else None,
            )
            heuristic_pts = score_avg_stats(heuristic_proj, REF_SCORING, pos)
            features["heuristic_pts"] = heuristic_pts

            # Targets
            features["actual_points"] = actual_pts
            features["residual"] = actual_pts - heuristic_pts
            features["player_id"] = pid
            features["season"] = season
            features["position"] = pos

            training_rows.append(features)

    print(f"  {len(training_rows)} training rows for season {season}")
    return training_rows


def main():
    print("Fetching schedule...")
    schedule_rows = fetch_csv(SCHEDULE_URL)
    print(f"  {len(schedule_rows)} schedule rows")

    all_rows = []
    for season in SEASONS:
        rows = build_season(season, schedule_rows)
        all_rows.extend(rows)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        for row in all_rows:
            f.write(json.dumps(row) + "\n")

    print(f"\nWrote {len(all_rows)} training rows to {OUTPUT}")

    # Verify fixes
    sample = all_rows[len(all_rows) // 2] if all_rows else {}
    print(f"\nSample row verification:")
    print(f"  implied_total: {sample.get('implied_total')} (should be non-zero)")
    print(f"  is_home: {sample.get('is_home')} (should be 0 or 1)")
    print(f"  spread: {sample.get('spread')} (should be non-zero)")
    print(f"  over_under: {sample.get('over_under')} (should be ~40-55)")
    print(f"  heuristic_pts: {sample.get('heuristic_pts')} (should be non-zero)")
    print(f"  snap_pct_wavg: {sample.get('snap_pct_wavg')}")
    print(f"  years_exp: {sample.get('years_exp')}")

    positions = defaultdict(int)
    for r in all_rows:
        positions[r["position"]] += 1
    for pos, count in sorted(positions.items()):
        print(f"  {pos}: {count}")


if __name__ == "__main__":
    main()
