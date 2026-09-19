"""Read precomputed projections from JSON files."""
import json
import os

from nfl_state import get_nfl_state


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "projections")


def _clean_int(v, default, lo=None, hi=None):
    """Coerce untrusted query input to int. Returns default on any
    garbage (None, 'abc', '3.5', '../..'). Digits-only check blocks
    path traversal via season/week before they reach filenames."""
    try:
        s = str(v).strip()
    except Exception:
        return default
    if not s.isdigit():
        return default
    n = int(s)
    if lo is not None and n < lo:
        return default
    if hi is not None and n > hi:
        return default
    return n


def get_projections(week: str | None = None, season: str | None = None) -> dict:
    """Read precomputed projections for a given week/season.

    Defaults come from Sleeper /state/nfl, never date math.
    Invalid week/season fall back to those defaults, never a 500.
    """
    st = get_nfl_state()
    def_season = _clean_int(st.get("season"), 2026, 2000, 2100)
    def_week = _clean_int(st.get("week"), 1, 1, 22)

    season_n = _clean_int(season, def_season, 2000, 2100) if season else def_season
    week_n = _clean_int(week, def_week, 1, 22) if week else def_week

    filename = f"{season_n}_week_{week_n:02d}.json"
    filepath = os.path.join(DATA_DIR, filename)

    if not os.path.exists(filepath):
        # Try to find the most recent file for this season
        return _fallback_projections(season_n, week_n)

    with open(filepath) as f:
        data = json.load(f)

    return {
        "week": week_n,
        "season": season_n,
        "updated_at": data.get("updated_at", ""),
        "players": data.get("players", []),
        "team_def": data.get("team_def", []),
        "byes": data.get("byes", {}),
        "stale": False,
    }


def _fallback_projections(season: int, week: int) -> dict:
    """If no precomputed file exists, return empty with guidance."""
    # Check if any file exists for this season
    if os.path.isdir(DATA_DIR):
        prefix = str(season)
        for f in sorted(os.listdir(DATA_DIR), reverse=True):
            if f.startswith(prefix) and f.endswith(".json"):
                filepath = os.path.join(DATA_DIR, f)
                with open(filepath) as fh:
                    data = json.load(fh)
                return {
                    "week": week,
                    "season": season,
                    "updated_at": data.get("updated_at", ""),
                    "players": data.get("players", []),
                    "team_def": data.get("team_def", []),
                    "byes": data.get("byes", {}),
                    "note": f"Using projections from {f}",
                    "stale": True,
                }

    return {
        "week": week,
        "season": season,
        "updated_at": "",
        "players": [],
        "note": "No projections available. Run compute_week.py to generate.",
        "stale": True,
    }
