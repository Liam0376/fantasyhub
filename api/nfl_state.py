"""NFL state from Sleeper: current season/week/season_type.

Replaces date-math guessing everywhere. In-memory TTL cache so
serverless instances don't refetch on every request.
"""
import time

import requests

STATE_URL = "https://api.sleeper.app/v1/state/nfl"
_TTL = 300
_cache = {"at": 0.0, "data": None}


def get_nfl_state() -> dict:
    """Return {season, week, season_type}. Falls back to date heuristic
    only if Sleeper is unreachable (flagged via source field)."""
    now = time.time()
    if _cache["data"] and now - _cache["at"] < _TTL:
        return _cache["data"]
    try:
        r = requests.get(STATE_URL, timeout=10)
        r.raise_for_status()
        s = r.json()
        data = {
            "season": int(s.get("league_season") or s.get("season") or 0),
            "week": int(s.get("week") or 0),
            "display_week": int(s.get("display_week") or s.get("week") or 0),
            "season_type": s.get("season_type", "regular"),
            "source": "sleeper",
        }
        if data["season"] and data["week"]:
            _cache.update(at=now, data=data)
            return data
    except Exception:
        pass
    return _date_fallback()


def _date_fallback() -> dict:
    """Last resort when Sleeper state is unreachable."""
    from datetime import datetime

    now = datetime.now()
    season = now.year if now.month >= 9 else now.year - 1
    if now.month < 9 or (now.month == 9 and now.day < 8):
        week = 1
    else:
        delta = (now - datetime(season, 9, 8)).days
        week = min(18, max(1, (delta // 7) + 1))
    return {"season": season, "week": week, "display_week": week,
            "season_type": "regular", "source": "date-fallback"}
