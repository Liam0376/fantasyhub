"""Tests for rosters.py: slot assignment and player resolution.

Audit finding: assign_slots/resolve_player were untested. All fixtures
are hand-built dicts — no network, no Sleeper, deterministic.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from rosters import assign_slots, resolve_player, _slot_eligible
from scoring import norm_name


def _p(name, pos, weekly, sid=None):
    return {"player_id": sid or name, "sleeper_id": sid or name,
            "player_name": name, "position": pos, "weekly": weekly}


def test_assign_slots_standard_lineup():
    rp = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "BN", "BN"]
    players = [
        _p("QB1", "QB", 20), _p("RB1", "RB", 18), _p("RB2", "RB", 15),
        _p("WR1", "WR", 14), _p("WR2", "WR", 12), _p("TE1", "TE", 9),
        _p("FX", "WR", 11), _p("B1", "RB", 5), _p("B2", "QB", 3),
    ]
    starters, bench = assign_slots(players, rp)
    assert [s["slot"] for s in starters] == [
        "QB", "RB1", "RB2", "WR1", "WR2", "TE", "FLEX1"]
    assert [b["slot"] for b in bench] == ["BN1", "BN2"]
    assert starters[0]["player_name"] == "QB1"
    # Best remaining WR (FX 11) beats B1/B2 into FLEX
    assert starters[6]["player_name"] == "FX"


def test_assign_slots_empty_inputs():
    assert assign_slots([], ["QB", "RB"]) == ([], [])
    s, b = assign_slots([_p("A", "QB", 10)], [])
    assert s == [] and len(b) == 1 and b[0]["slot"] == "BN1"


def test_slot_eligibility():
    assert _slot_eligible("QB", "QB") is True
    assert _slot_eligible("RB", "FLEX") is True
    assert _slot_eligible("QB", "RB") is False
    assert _slot_eligible("QB", "FLEX") is False
    assert _slot_eligible("WR", "WRRB_FLEX") is True


def test_resolve_unknown_id_renders_honest_zeros():
    out = resolve_player("99999", {}, {}, {})
    assert out["player_name"] == "Player 99999"
    assert out["weekly"] == 0.0 and out["vor"] == 0.0
    assert out["position"] == "UNK"


def test_resolve_team_def_without_projection():
    out = resolve_player("HOU", {}, {}, {})
    assert out["position"] == "DEF" and out["team"] == "HOU"
    assert out["weekly"] == 0.0


def test_resolve_def_with_projection_hit():
    hit = {"player_id": "DEF_HOU", "player_name": "HOU", "team": "HOU",
           "opponent_team": "IND", "projected_points": 8.0, "ros_points": 100.0,
           "vor": 1.0, "auction_value": 5, "injury_status": None,
           "bye_week": 9, "remaining_games": 15, "width": 2.0,
           "projection_lower": 6.0, "projection_upper": 10.0, "tier": 0,
           "edge": "NEUTRAL", "amount_paid": None}
    out = resolve_player("HOU", {}, {(norm_name("HOU"), "DEF"): hit}, {})
    assert out["weekly"] == 8.0 and out["opponent_team"] == "IND"


def test_resolve_known_player_enriches():
    pmap = {"101": {"n": "Ja Marr", "p": "WR", "t": "CIN",
                    "r": 5, "do": 1, "dp": "WR"}}
    hit = {"player_id": "G1", "player_name": "Ja Marr", "team": "CIN",
           "opponent_team": "BAL", "projected_points": 19.5, "ros_points": 200.0,
           "vor": 6.0, "auction_value": 40, "injury_status": None,
           "bye_week": 10, "remaining_games": 14, "width": 4.0,
           "projection_lower": 15.5, "projection_upper": 23.5, "tier": 1,
           "edge": "BUY", "amount_paid": None,
           "avg_stats": {"receptions": 4.4, "receiving_yards": 62.1,
                         "receiving_tds": 0.38}}
    by_np = {(norm_name("Ja Marr"), "WR"): hit}
    out = resolve_player("101", pmap, by_np, {})
    assert out["weekly"] == 19.5 and out["search_rank"] == 5
    assert out["depth_order"] == 1 and out["sleeper_id"] == "101"
    assert out["proj_rec"] == 4.4 and out["proj_rec_yd"] == 62.1
    assert out["proj_rec_td"] == 0.38 and out["proj_pass_yd"] is None


if __name__ == "__main__":
    test_assign_slots_standard_lineup()
    test_assign_slots_empty_inputs()
    test_slot_eligibility()
    test_resolve_unknown_id_renders_honest_zeros()
    test_resolve_team_def_without_projection()
    test_resolve_def_with_projection_hit()
    test_resolve_known_player_enriches()
    print("OK")
