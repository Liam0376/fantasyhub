"""Read precomputed projections from JSON files."""
import json
import os
from datetime import datetime


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "projections")


def get_projections(week: str | None = None, season: str | None = None) -> dict:
    """Read precomputed projections for a given week/season."""
    if not season:
        season = str(_current_nfl_season())
    if not week:
        week = str(_current_nfl_week())

    season = str(season)
    week = str(week)

    filename = f"{season}_week_{int(week):02d}.json"
    filepath = os.path.join(DATA_DIR, filename)

    if not os.path.exists(filepath):
        # Try to find the most recent file for this season
        return _fallback_projections(season, week)

    with open(filepath) as f:
        data = json.load(f)

    return {
        "week": int(week),
        "season": int(season),
        "updated_at": data.get("updated_at", ""),
        "players": data.get("players", []),
        "stale": False,
    }


def _fallback_projections(season: str, week: str) -> dict:
    """If no precomputed file exists, return empty with guidance."""
    # Check if any file exists for this season
    if os.path.isdir(DATA_DIR):
        for f in sorted(os.listdir(DATA_DIR), reverse=True):
            if f.startswith(season) and f.endswith(".json"):
                filepath = os.path.join(DATA_DIR, f)
                with open(filepath) as fh:
                    data = json.load(fh)
                return {
                    "week": int(week),
                    "season": int(season),
                    "updated_at": data.get("updated_at", ""),
                    "players": data.get("players", []),
                    "note": f"Using projections from {f}",
                    "stale": True,
                }

    return {
        "week": int(week),
        "season": int(season),
        "updated_at": "",
        "players": [],
        "note": "No projections available. Run compute_week.py to generate.",
        "stale": True,
    }


def _current_nfl_season() -> int:
    """Guess current NFL season from date."""
    now = datetime.now()
    # NFL season runs Sep-Jan. If before Sep, it's previous year's season.
    if now.month >= 9:
        return now.year
    return now.year - 1


def _current_nfl_week() -> int:
    """Estimate current NFL week from date. Rough heuristic."""
    now = datetime.now()
    # NFL regular season: weeks 1-18, starting first Tuesday of September
    if now.month < 9 or (now.month == 9 and now.day < 8):
        return 0  # preseason
    # Rough: week 1 starts ~Sep 8, each week is 7 days
    sep8 = datetime(now.year, 9, 8)
    delta = (now - sep8).days
    if delta < 0:
        return 0
    week = min(18, (delta // 7) + 1)
    return week
