"""Regression: serve the stored market_season_stats field when present.

Audit finding: hubapi recomputed season stats as avg x 17 and ignored
the build-time stored field (avg scaled by real played+remaining).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from hubapi import _hub_player

BASE = {
    "player_id": "test-1", "sleeper_id": "99999",
    "player_name": "Test Player", "position": "QB", "team": "X",
    "projected_points": 20.0, "width": 5.0,
    "projection_lower": 15.0, "projection_upper": 25.0,
    "ros_points": 200.0, "remaining_games": 10,
    "avg_stats": {"passing_yards": 250.0, "passing_tds": 1.8},
}


def test_stored_market_season_stats_preferred():
    stored = {"passing_yards": 3750.0, "passing_tds": 27.0}
    p = dict(BASE, market_season_stats=stored)
    out = _hub_player(p)
    assert out["market_season_stats"]["passing_yards"] == 3750.0
    assert out["market_season_stats"]["passing_tds"] == 27.0


def test_legacy_fallback_without_stored_field():
    p = dict(BASE)
    p.pop("market_season_stats", None)
    out = _hub_player(p)
    assert out["market_season_stats"]["passing_yards"] == round(250.0 * 17, 1)


if __name__ == "__main__":
    test_stored_market_season_stats_preferred()
    test_legacy_fallback_without_stored_field()
    print("OK")
