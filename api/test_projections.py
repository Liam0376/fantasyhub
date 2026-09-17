"""Tests for projections.py: get_projections fallback behavior."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from projections import get_projections, _fallback_projections


def test_fallback_returns_empty():
    result = _fallback_projections("9999", "1")
    assert result["players"] == []
    assert result["stale"] is True
    assert result["week"] == 1
    assert result["season"] == 9999


def test_get_projections_structure():
    result = get_projections()
    assert isinstance(result, dict)
    assert "players" in result
    assert "week" in result
    assert "season" in result
    assert isinstance(result["players"], list)


def test_get_projections_nonexistent_week():
    result = get_projections(week="99", season="9999")
    assert result["stale"] is True


if __name__ == "__main__":
    test_fallback_returns_empty()
    test_get_projections_structure()
    test_get_projections_nonexistent_week()
    print("OK")
