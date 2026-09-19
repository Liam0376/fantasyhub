"""Tests for nfl_state.py: date fallback logic and cache behavior."""
import sys
import os
import time as _time
sys.path.insert(0, os.path.dirname(__file__))

import nfl_state
from nfl_state import _date_fallback, _cache


def test_date_fallback_structure():
    result = _date_fallback()
    assert isinstance(result, dict)
    assert "season" in result
    assert "week" in result
    assert result["source"] == "date-fallback"
    assert 1 <= result["week"] <= 18
    assert result["season"] >= 2024


def test_date_fallback_week_range():
    result = _date_fallback()
    assert isinstance(result["week"], int)
    assert isinstance(result["season"], int)


def test_cache_initial_state():
    assert _cache["at"] == 0.0 or isinstance(_cache["at"], float)
    assert "data" in _cache


def test_fresh_cache_returned_without_fetch():
    # Pre-populated fresh cache: get_nfl_state must return it as-is,
    # offline. Proves the TTL short-circuit, not just dict shape.
    snap = (nfl_state._cache["at"], nfl_state._cache["data"])
    try:
        planted = {"season": 2026, "week": 9, "display_week": 9,
                   "season_type": "regular", "source": "sleeper"}
        nfl_state._cache.update(at=_time.time(), data=planted)
        out = nfl_state.get_nfl_state()
        assert out is planted
    finally:
        nfl_state._cache.update(at=snap[0], data=snap[1])


if __name__ == "__main__":
    test_date_fallback_structure()
    test_date_fallback_week_range()
    test_cache_initial_state()
    test_fresh_cache_returned_without_fetch()
    print("OK")
