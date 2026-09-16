"""Read precomputed projections from JSON files."""
import json
import os

from nfl_state import get_nfl_state


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "projections")


def get_projections(week: str | None = None, season: str | None = None) -> dict:
    """Read precomputed projections for a given week/season.

    Defaults come from Sleeper /state/nfl, never date math.
    """
    if not season or not week:
        st = get_nfl_state()
    if not season:
        season = str(st["season"])
    if not week:
        week = str(st["week"])

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
