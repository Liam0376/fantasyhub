"""Tests for hub_props_board: QB rushing markets must be present.

Bug: QB props only emitted passing_yards/passing_tds even though
avg_stats carries rushing projections. compute_analytics and
_weekly_actuals are stubbed by attribute swap — offline under both
pytest and the __main__ runner.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import hubapi


def _stubbed(**overrides):
    players = overrides.get("players", [{
        "player_id": "Q1", "player_name": "Test QB", "position": "QB",
        "team": "BUF", "injury_status": None,
        "avg_stats": {"passing_yards": 250.0, "passing_tds": 1.8,
                      "rushing_yards": 25.0, "rushing_tds": 0.2,
                      "receiving_yards": 0, "receptions": 0,
                      "receiving_tds": 0},
    }])
    actuals = overrides.get("actuals", {})
    real_a, real_w = hubapi.compute_analytics, hubapi._weekly_actuals
    hubapi.compute_analytics = lambda *a, **k: {
        "players": players, "meta": {"week": 2, "season": 2026}}
    hubapi._weekly_actuals = lambda *a, **k: actuals
    try:
        return hubapi.hub_props_board("LID")
    finally:
        hubapi.compute_analytics, hubapi._weekly_actuals = real_a, real_w


def test_qb_rushing_markets_present():
    out = _stubbed()
    mk = {r["market"]: r["fair_line"] for r in out["players"]}
    assert mk["passing_yards"] == 250.0
    assert mk["passing_tds"] == 1.8
    assert mk["rushing_yards"] == 25.0, f"QB rushing_yards missing: {sorted(mk)}"
    assert mk["rushing_tds"] == 0.2, f"QB rushing_tds missing: {sorted(mk)}"


def test_zero_value_markets_omitted():
    out = _stubbed()
    mk = {r["market"] for r in out["players"]}
    assert "receiving_yards" not in mk  # 0 avg stays hidden, not a 0.0 line


def test_actuals_grade_rushing_when_posted():
    actuals = {"Q1": {"rushing_yards": "30", "passing_yards": "260",
                      "passing_tds": "2", "rushing_tds": "1",
                      "receiving_tds": ""}}
    out = _stubbed(actuals=actuals)
    mk = {r["market"]: r for r in out["players"]}
    assert mk["rushing_yards"]["actual"] == 30.0
    td = mk["anytime_td"]
    assert td["actual_p_yes"] == 1


if __name__ == "__main__":
    test_qb_rushing_markets_present()
    test_zero_value_markets_omitted()
    test_actuals_grade_rushing_when_posted()
    print("OK")
