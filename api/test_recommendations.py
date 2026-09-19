"""Regression: /recommendations/* compat shims resolve in prod.

Audit finding: the SPA bundle calls father-style /recommendations/*
paths. Without server shims they 404 to the SPA catch-all and the
waiver/trade/start-sit views render empty. Live tests mirror the
test_analytics_smoke.py convention (real league, read-only).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from hubapi import hub_rec_waiver, hub_rec_trade, hub_start_sit

TEST_LEAGUE_ID = "1397736035240173568"  # Fantasy Bahamas, 12-team PPR auction


def test_start_sit_cold_shape():
    out = hub_start_sit("0")
    assert out["recommendations"] == []
    assert out["count"] == 0
    assert out["cold"] is True


def test_waiver_cold_shape():
    out = hub_rec_waiver("0", owner_id="x")
    assert out["recommendations"] == []
    assert out["meta"]["cold"] is True


def test_trade_cold_shape():
    out = hub_rec_trade("0", team_a_id="1", team_b_id="2")
    assert out["winner"] == "Even"
    assert out["cold"] is True


def test_start_sit_live():
    out = hub_start_sit(TEST_LEAGUE_ID)
    assert out["count"] > 0
    r = out["recommendations"][0]
    for key in ("player_id", "player_name", "position", "projected_points",
                "decision", "slot", "roster_id"):
        assert key in r, f"missing key: {key}"
    assert {x["decision"] for x in out["recommendations"]} <= {"START", "SIT"}


def test_waiver_live_shape():
    out = hub_rec_waiver(TEST_LEAGUE_ID)
    assert "recommendations" in out and "count" in out
    assert out["count"] == len(out["recommendations"])
    assert "timestamp" in out["meta"]


def test_trade_live_shape():
    out = hub_rec_trade(TEST_LEAGUE_ID, team_a_id=1, team_b_id=2)
    assert "winner" in out and "value_difference" in out
    assert "timestamp" in out


if __name__ == "__main__":
    test_start_sit_cold_shape()
    test_waiver_cold_shape()
    test_trade_cold_shape()
    test_start_sit_live()
    test_waiver_live_shape()
    test_trade_live_shape()
    print("OK")
