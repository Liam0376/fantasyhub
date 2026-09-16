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
import os
import sys
from datetime import datetime
from pathlib import Path

# nflverse weekly stats URL
STATS_URL = "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{season}.csv"

# Scoring keys that map nflverse stats to fantasy points (standard PPR)
SCORING = {
    "passing_yards": 0.04,
    "passing_tds": 5.0,
    "passing_interceptions": -2.0,
    "rushing_yards": 0.1,
    "rushing_tds": 6.0,
    "receiving_yards": 0.1,
    "receiving_tds": 6.0,
    "receptions": 1.0,
    "fumbles_lost_total": -2.0,
    "passing_2pt_conversions": 2.0,
    "rushing_2pt_conversions": 2.0,
    "receiving_2pt_conversions": 2.0,
    "pat_made": 1.0,
    "pat_missed": -1.0,
    "fg_made_0_19": 3.0,
    "fg_made_20_29": 3.0,
    "fg_made_30_39": 3.0,
    "fg_made_40_49": 4.0,
    "fg_made_50_59": 5.0,
    "fg_made_60_": 6.0,
    "fg_missed": -1.0,
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


def score_player(stats: dict) -> float:
    """Compute fantasy points from a single week's stats."""
    # If nflverse already computed PPR points, use that
    ppr = stats.get("fantasy_points_ppr")
    if ppr:
        try:
            return float(ppr)
        except (ValueError, TypeError):
            pass

    # Otherwise compute from individual stats
    points = 0.0
    for key, multiplier in SCORING.items():
        val = float(stats.get(key) or 0)
        points += val * multiplier
    return points


def compute_projections(stats_rows: list[dict], current_week: int, season: int) -> list[dict]:
    """Compute projections for remaining weeks using weighted averages."""
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

        pts = score_player(row)
        players[pid]["games"].append({
            "week": week,
            "points": pts,
            "stats": row,
        })

    # Compute projections for each player
    projections = []
    total_weeks = 18

    for pid, p in players.items():
        games = sorted(p["games"], key=lambda g: g["week"])

        if not games:
            continue

        # Weighted average: recent games weighted 2x
        total_weight = 0
        weighted_sum = 0
        for i, g in enumerate(games):
            weight = 2 if i >= len(games) - 3 else 1  # last 3 games weighted 2x
            weighted_sum += g["points"] * weight
            total_weight += weight

        avg_pts = weighted_sum / total_weight if total_weight > 0 else 0

        # Remaining games
        played = len(games)
        remaining = max(0, total_weeks - current_week)

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
        })

    # Sort by projected points
    projections.sort(key=lambda x: x["projected_points"], reverse=True)

    return projections


def main():
    parser = argparse.ArgumentParser(description="Compute weekly projections")
    parser.add_argument("--week", type=int, help="Current NFL week (auto-detected if omitted)")
    parser.add_argument("--season", type=int, default=datetime.now().year, help="NFL season year")
    args = parser.parse_args()

    # Auto-detect week
    week = args.week
    if not week:
        now = datetime.now()
        if now.month < 9 or (now.month == 9 and now.day < 8):
            week = 1  # preseason → assume week 1
        else:
            sep8 = datetime(args.season, 9, 8)
            delta = (now - sep8).days
            week = min(18, max(1, (delta // 7) + 1))

    season = args.season
    print(f"Computing projections for {season} week {week}...")

    # Fetch stats
    stats_rows = fetch_weekly_stats(season)

    # Compute projections
    projections = compute_projections(stats_rows, week, season)

    # Write output
    out_dir = Path(__file__).parent.parent / "data" / "projections"
    out_dir.mkdir(parents=True, exist_ok=True)

    outfile = out_dir / f"{season}_week_{week:02d}.json"
    data = {
        "week": week,
        "season": season,
        "updated_at": datetime.now().isoformat() + "Z",
        "players": projections,
    }

    with open(outfile, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Wrote {len(projections)} projections to {outfile}")

    latest = out_dir / "latest.json"
    with open(latest, "w") as f:
        json.dump(data, f, indent=2)


if __name__ == "__main__":
    main()
