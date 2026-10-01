"""hub_trade wiring: legacy contract fields, ID matching, failure shape.

The old tests asserted VOR-sum math this rebuild deletes (documented
in the plan) — they are replaced wholesale. These pin the output
contract the shipped bundle reads, plus honest failure behavior.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import hubapi
from scoring import norm_name

_RP = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "K", "DEF",
       "BN", "BN"]


def _ep(name, pos, sid=None):
    return {"player_id": sid or norm_name(name), "sleeper_id": sid or norm_name(name),
            "player_name": name, "position": pos, "team": "DET"}


def _row(name, pos, pts):
    return {"pts": pts, "lo": max(0.0, pts - 2), "hi": pts + 2, "pos": pos,
            "team": "DET", "name": name, "inj": None}


_A = ([_ep("QB A", "QB"), _ep("RB A1", "RB"), _ep("RB A2", "RB"),
       _ep("WR A1", "WR"), _ep("WR A2", "WR"), _ep("TE A", "TE")],
      [_ep("bWR A", "WR"), _ep("bRB A", "RB"), _ep("K A", "K"), _ep("D A", "DEF")])
_B = ([_ep("QB B", "QB"), _ep("RB B1", "RB"), _ep("RB B2", "RB"),
       _ep("WR B1", "WR"), _ep("WR B2", "WR"), _ep("TE B", "TE")],
      [_ep("bWR B", "WR"), _ep("bRB B", "RB"), _ep("K B", "K"), _ep("D B", "DEF")])


def _rows():
    wk = [("QB A", "QB", 20), ("RB A1", "RB", 18), ("RB A2", "RB", 11),
          ("WR A1", "WR", 14), ("WR A2", "WR", 12), ("TE A", "TE", 9),
          ("bWR A", "WR", 2), ("bRB A", "RB", 3), ("K A", "K", 8), ("D A", "DEF", 7),
          ("QB B", "QB", 19), ("RB B1", "RB", 17), ("RB B2", "RB", 15),
          ("WR B1", "WR", 22), ("WR B2", "WR", 13), ("TE B", "TE", 8),
          ("bWR B", "WR", 4), ("bRB B", "RB", 3), ("K B", "K", 8), ("D B", "DEF", 7)]
    players = {(norm_name(n), p): _row(n, p, v) for (n, p, v) in wk}
    return {5: {"players": dict(players), "fallback_week": None},
            6: {"players": dict(players), "fallback_week": None}}


def _settings(**over):
    s = {"scoring": {"rec": 1.0}, "roster_positions": _RP, "num_teams": 12,
         "type": 0, "trade_deadline": None, "playoff_round_type": "0",
         "playoff_teams": 6, "playoff_week_start": 15, "waiver_budget": 100}
    s.update(over)
    return s


def _wire(monkeypatch, settings=None, fc=None, rows=None):
    settings = settings or _settings()
    ta = {"roster_id": "1", "owner_id": "o1", "team_name": "Alpha",
          "display_name": "A", "starters": [dict(p) for p in _A[0]],
          "bench": [dict(p) for p in _A[1]], "reserve": [],
          "wins": 8, "losses": 1, "fpts": 100.0}
    tb = {"roster_id": "2", "owner_id": "o2", "team_name": "Beta",
          "display_name": "B", "starters": [dict(p) for p in _B[0]],
          "bench": [dict(p) for p in _B[1]], "reserve": [],
          "wins": 7, "losses": 2, "fpts": 95.0}
    data = {"teams": [ta, tb], "week": 5, "season_year": 2026,
            "league": {"league_id": "L", "name": "T", "season": 2026,
                       "settings": settings}}
    monkeypatch.setattr(hubapi, "build_rosters", lambda *a, **k: data)
    monkeypatch.setattr(hubapi, "fetch_league",
                        lambda *a, **k: {"league_id": "L", "name": "T",
                                         "season": 2026, "settings": settings,
                                         "teams": [], "draft_picks": [],
                                         "traded_picks": []})
    monkeypatch.setattr(hubapi, "load_week_points",
                        lambda *a, **k: (rows or _rows(), []))
    monkeypatch.setattr(hubapi, "fc_load",
                        lambda *a, **k: ({} if fc is None else fc, []))
    return ta, tb


def test_contract_legacy_fields_present(monkeypatch):
    _wire(monkeypatch)
    out = hubapi.hub_trade("L", "1", "2", traded_a=[norm_name("WR A2")],
                           traded_b=[norm_name("WR B1")])
    # Every field the shipped bundle reads, same names and shapes.
    assert out["winner"] == "Alpha"       # receives the 22 over the 12
    assert out["value_difference"] > 0   # positive means Team A wins
    for key in ("recommendation", "team_a_ros", "team_b_ros",
                "team_a_weekly", "team_b_weekly", "market_a", "market_b",
                "market_coverage_a", "market_coverage_b"):
        assert key in out, key
    assert [p["player_name"] for p in out["packages"]["a"]] == ["WR A2"]
    entry = out["packages"]["a"][0]
    for key in ("player_id", "sleeper_id", "headshot_url", "player_name",
                "position", "team", "weekly", "ros", "market", "trend30"):
        assert key in entry, key
    slots = out["slots"]
    for key in ("gained_a", "gained_b", "credit_a_ros", "credit_b_ros",
                "fill_a", "fill_b", "remaining_games"):
        assert key in slots, key
    # New blocks ride alongside.
    for key in ("settings_used", "calendar", "team_a", "team_b",
                "confidence", "acceptance", "market", "warnings",
                "unknown_ids", "data_freshness"):
        assert key in out, key
    assert out.get("cold") is not True


def test_market_sums_cover_only(monkeypatch):
    fc = {norm_name("WR A2"): {"v": 8000, "t30": 100, "tier": 1, "adp": None,
                               "roster_pct": 1.0, "msd": 0, "freq": 0.01}}
    _wire(monkeypatch, fc=fc)
    out = hubapi.hub_trade("L", "1", "2", traded_a=[norm_name("WR A2")],
                           traded_b=[norm_name("WR B1")])
    assert out["market_a"] == 8000           # covered sums, not None
    assert out["market_b"] is None           # uncovered side is null, not 0
    assert out["market_coverage_a"] == 1
    assert out["market_coverage_b"] == 0
    assert out["packages"]["a"][0]["trend30"] == 100
    assert out["packages"]["b"][0]["market"] is None


def test_unknown_id_reported_not_dropped(monkeypatch):
    _wire(monkeypatch)
    out = hubapi.hub_trade("L", "1", "2", traded_a=["ghost-id"],
                           traded_b=[norm_name("WR B1")])
    assert out["packages"]["a"] == []
    assert out["unknown_ids"] == ["ghost-id"]
    assert any("ghost-id" in w for w in out["warnings"])
    assert out["winner"] in ("Alpha", "Beta", "Even")  # still a verdict


def test_ir_player_tradable(monkeypatch):
    ta, tb = _wire(monkeypatch)
    ir = _ep("IR Stash", "WR", sid="ir1")
    ta["reserve"] = [ir]
    out = hubapi.hub_trade("L", "1", "2", traded_a=["ir1"],
                           traded_b=[norm_name("bWR B")])
    assert [p["player_name"] for p in out["packages"]["a"]] == ["IR Stash"]
    assert out["unknown_ids"] == []


def test_deadline_passed_flags_but_evaluates(monkeypatch):
    _wire(monkeypatch, settings=_settings(trade_deadline=3))
    out = hubapi.hub_trade("L", "1", "2", traded_a=[norm_name("WR A2")],
                           traded_b=[norm_name("WR B1")])
    assert out["deadline_passed"] is True
    assert any("deadline" in w.lower() for w in out["warnings"])
    assert out["winner"] == "Alpha"  # still evaluates


def test_exception_returns_error_never_even(monkeypatch):
    def _boom(*a, **k):
        raise RuntimeError("sleeper down")
    monkeypatch.setattr(hubapi, "build_rosters", _boom)
    out = hubapi.hub_trade("L", "1", "2", traded_a=["x"], traded_b=["y"])
    assert out["winner"] is None
    assert out["cold"] is True
    assert "sleeper down" in out["error"]
    rec = hubapi.hub_rec_trade("L", "1", "2", traded_a=["x"], traded_b=["y"])
    assert rec["winner"] is None and rec["cold"] is True
    assert "error" in rec and "timestamp" in rec


def test_no_packages_legacy_mode_even(monkeypatch):
    _wire(monkeypatch)
    out = hubapi.hub_trade("L", "1", "2")
    assert out["winner"] == "Even"
    assert out["value_difference"] == 0.0
    assert out["team_a_ros"] > 0 and out["team_b_ros"] > 0


def test_missing_market_reports_freshness(monkeypatch):
    # Review catch: data_freshness.market said "ok" with an empty map.
    _wire(monkeypatch)
    monkeypatch.setattr(hubapi, "fc_load", lambda *a, **k: ({}, ["market down"]))
    out = hubapi.hub_trade("L", "1", "2", traded_a=[norm_name("WR A2")],
                           traded_b=[norm_name("WR B1")])
    assert out["data_freshness"]["market"] == "missing"
    assert out["market"]["coverage_a"] == 0
    assert out["winner"] == "Alpha"  # verdict stands on lineup points
