"""Tests for hub_trade package eval + open-slot waiver credit + market sums."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import hubapi


def _p(pid, name, vor, rem=10, sid=None):
    return {"player_id": pid, "sleeper_id": sid or pid, "player_name": name,
            "position": "WR", "vor": vor, "remaining_games": rem,
            "injury_status": None}


def _rosters(monkeypatch):
    teams = [
        {"roster_id": "1", "owner_id": "o1", "team_name": "Alpha",
         "starters": [_p("a1", "A One", 10.0), _p("a2", "A Two", 4.0)],
         "bench": [_p("a3", "A Three", 1.0)], "reserve": []},
        {"roster_id": "2", "owner_id": "o2", "team_name": "Beta",
         "starters": [_p("b1", "B One", 9.0)],
         "bench": [_p("b2", "B Two", 2.0)], "reserve": []},
    ]
    data = {"teams": teams, "week": 7,
            "league": {"settings": {}}}
    monkeypatch.setattr(hubapi, "build_rosters", lambda *a, **k: data)
    return data


def test_packages_valued_not_full_rosters(monkeypatch):
    _rosters(monkeypatch)
    monkeypatch.setattr(hubapi, "hub_waiver", lambda *a, **k: {"recommendations": []})
    out = hubapi.hub_trade("L", "1", "2", traded_a=["a1"], traded_b=["b1"])
    assert out["team_a_ros"] == 100.0  # 10 vor * 10 games
    assert out["team_b_ros"] == 90.0
    assert out["value_difference"] == -10.0
    assert [p["player_name"] for p in out["packages"]["a"]] == ["A One"]


def test_two_for_one_slot_credit(monkeypatch):
    _rosters(monkeypatch)
    monkeypatch.setattr(hubapi, "hub_waiver", lambda *a, **k: {"recommendations": [
        {"player_name": "W Fill", "improvement_over_roster": 5.0}]})
    out = hubapi.hub_trade("L", "1", "2", traded_a=["a1", "a2"], traded_b=["b1"])
    slots = out["slots"]
    assert slots["gained_b"] == 1 and slots["gained_a"] == 0
    # week 7 -> 10 remaining; 5.0 * 10 = 50 credit to B
    assert slots["credit_b_ros"] == 50.0
    assert slots["fill_b"] == ["W Fill"]
    # A pkg 140 vs B pkg 90 + 50 credit -> even-ish diff
    assert out["value_difference"] == 0.0


def test_legacy_full_roster_no_packages(monkeypatch):
    _rosters(monkeypatch)
    out = hubapi.hub_trade("L", "1", "2")
    assert "slots" not in out and "packages" not in out
    assert out["team_a_ros"] == 150.0  # (10+4+1) * 10
    assert out["team_b_ros"] == 110.0


def test_market_sums_from_snapshot(monkeypatch):
    _rosters(monkeypatch)
    monkeypatch.setattr(hubapi, "hub_waiver", lambda *a, **k: {"recommendations": []})
    monkeypatch.setattr(hubapi, "_load_fc_market",
                        lambda: {"a1": {"v": 8000, "t30": 100}, "b1": {"v": 5000, "t30": -50}})
    out = hubapi.hub_trade("L", "1", "2", traded_a=["a1"], traded_b=["b1"])
    assert out["market_a"] == 8000 and out["market_b"] == 5000
    assert out["packages"]["a"][0]["trend30"] == 100


def test_market_missing_degrades_to_none(monkeypatch):
    _rosters(monkeypatch)
    monkeypatch.setattr(hubapi, "hub_waiver", lambda *a, **k: {"recommendations": []})
    monkeypatch.setattr(hubapi, "_load_fc_market", lambda: {})
    out = hubapi.hub_trade("L", "1", "2", traded_a=["a1"], traded_b=["b1"])
    assert out["market_a"] is None and out["market_b"] is None
    assert out["packages"]["a"][0]["market"] is None
