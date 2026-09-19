"""Tests for build_training_data helpers: averages, trends, maps.

Audit finding: weighted_avg/linear_trend were untested despite feeding
every training row. All fixtures inline, no network.
"""
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
sys.path.insert(0, str(Path(__file__).parent))

from build_training_data import (
    weighted_avg, linear_trend, build_home_away_map, build_spread_map,
)


def test_weighted_avg_empty_and_short():
    assert weighted_avg([]) == 0.0
    assert weighted_avg([10.0, 20.0]) == 15.0


def test_weighted_avg_weights_recent():
    # 6 values, last 5 at 2x: (0 + 50*2) / (1 + 5*2) = 100/11
    assert abs(weighted_avg([0.0, 10.0, 10.0, 10.0, 10.0, 10.0]) - 100 / 11) < 1e-9


def test_linear_trend_edges():
    assert linear_trend([]) == 0.0
    assert linear_trend([5.0, 5.0]) == 0.0
    assert linear_trend([1.0, 1.0, 1.0]) == 0.0
    assert linear_trend([1.0, 2.0, 3.0, 4.0]) > 0
    assert linear_trend([4.0, 3.0, 2.0, 1.0]) < 0


def test_home_away_map_reg_only():
    sched = [
        {"season": 2026, "game_type": "REG", "week": 1,
         "home_team": "KC", "away_team": "BUF"},
        {"season": 2026, "game_type": "POST", "week": 1,
         "home_team": "KC", "away_team": "DEN"},
        {"season": 2025, "game_type": "REG", "week": 1,
         "home_team": "KC", "away_team": "NYJ"},
        {"season": 2026, "game_type": "REG", "week": "bogus",
         "home_team": "KC", "away_team": "MIA"},
    ]
    out = build_home_away_map(sched, 2026)
    assert out == {("KC", 1): 1.0, ("BUF", 1): 0.0}


def test_spread_map_shape():
    sched = [{"season": 2026, "game_type": "REG", "week": 2,
              "home_team": "KC", "away_team": "BUF",
              "spread_line": "-3.5", "total_line": "47.5"}]
    out = build_spread_map(sched, 2026)
    assert ("KC", 2) in out and ("BUF", 2) in out
    assert out[("KC", 2)]["spread"] == -3.5
    assert out[("KC", 2)]["over_under"] == 47.5


if __name__ == "__main__":
    test_weighted_avg_empty_and_short()
    test_weighted_avg_weights_recent()
    test_linear_trend_edges()
    test_home_away_map_reg_only()
    test_spread_map_shape()
    print("OK")
