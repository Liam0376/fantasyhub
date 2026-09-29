"""Tests for projections.py: get_projections fallback behavior."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from unittest.mock import patch, MagicMock
from projections import (get_projections, _fallback_projections,
                         _apply_future_injury_adjustments)


def test_fallback_returns_empty():
    result = _fallback_projections(9999, 1)
    assert result["players"] == []
    assert result["stale"] is True
    assert result["week"] == 1
    assert result["season"] == 9999


@pytest.mark.network
def test_get_projections_structure():
    result = get_projections()
    assert isinstance(result, dict)
    assert "players" in result
    assert "week" in result
    assert "season" in result
    assert isinstance(result["players"], list)


def test_get_projections_nonexistent_week():
    # Valid shape but no such file -> stale fallback, never a 500.
    result = get_projections(week="22", season="2026")
    assert result["stale"] is True


def test_get_projections_rejects_garbage():
    # Traversal / out-of-range input falls back to state defaults.
    result = get_projections(week="../../etc", season="99999")
    assert isinstance(result, dict) and "players" in result


def test_fallback_names_source_file():
    # The UI banner names the file actually served; a missing note would
    # render every week identically with no explanation (user-caught bug:
    # weeks 1/3 silently showed week-2 numbers). Pinned to a file pattern,
    # not a specific week, so future backfills don't break it.
    result = _fallback_projections(2026, 3)
    assert result["stale"] is True
    assert "note" in result and "2026_week_" in result["note"] and result["note"].endswith(".json")
    assert result["week"] == 3


def test_elevation_boosts_backup():
    """IR starter should be zeroed; their backup gets a positive boost."""
    players = [
        {"player_name": "Joe Starter", "position": "RB", "team": "BUF",
         "projected_points": 14.0, "projection_upper": 20.0, "projection_lower": 8.0},
        {"player_name": "Joe Backup", "position": "RB", "team": "BUF",
         "projected_points": 6.0, "projection_upper": 10.0, "projection_lower": 2.0},
    ]
    out_set = {"joestarter"}
    chart = {("BUF", "RB"): [(1, "joestarter", "Joe Starter"), (2, "joebackup", "Joe Backup")]}
    with patch("projections._load_injury_data", return_value=(out_set, {})), \
         patch("projections._depth_chart", return_value=chart):
        _apply_future_injury_adjustments(players)

    starter = next(p for p in players if p["player_name"] == "Joe Starter")
    backup = next(p for p in players if p["player_name"] == "Joe Backup")
    assert starter["projected_points"] == 0.0
    assert backup["projected_points"] > 6.0
    assert backup["projection_upper"] > backup["projected_points"]
    assert backup["projection_lower"] <= backup["projected_points"]
    assert "injury_elevation" in backup


def test_elevation_no_out_players_is_noop():
    """Empty out_set → players untouched."""
    players = [{"player_name": "Healthy QB", "position": "QB", "team": "KC",
                "projected_points": 22.0}]
    with patch("projections._load_injury_data", return_value=(set(), {})), \
         patch("projections._depth_chart", return_value={}):
        _apply_future_injury_adjustments(players)
    assert players[0]["projected_points"] == 22.0


if __name__ == "__main__":
    test_fallback_returns_empty()
    test_get_projections_structure()
    test_get_projections_nonexistent_week()
    test_get_projections_rejects_garbage()
    test_fallback_names_source_file()
    test_elevation_boosts_backup()
    test_elevation_no_out_players_is_noop()
    print("OK")
