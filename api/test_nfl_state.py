"""Tests for nfl_state.py: date fallback logic and cache behavior."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

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


if __name__ == "__main__":
    test_date_fallback_structure()
    test_date_fallback_week_range()
    test_cache_initial_state()
    print("OK")
