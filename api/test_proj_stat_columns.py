"""Tests for _hub_player projected-stat columns (projections tab).

Each position fills only its own proj_* set; everything else is None
(renders as a dash, sorts last). players_map() reads the local snapshot,
so these run offline.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from hubapi import _hub_player

AVG_QB = {"passing_yards": 250.4, "passing_tds": 1.83,
          "rushing_yards": 15.2, "rushing_tds": 0.24,
          "receptions": 0, "receiving_yards": 0, "receiving_tds": 0,
          "pat_made": 0}
AVG_RB = {"rushing_yards": 58.6, "rushing_tds": 0.42,
          "receptions": 2.8, "receiving_yards": 21.5,
          "passing_yards": 0, "receiving_tds": 0.05}
AVG_WR = {"receptions": 4.4, "receiving_yards": 62.1, "receiving_tds": 0.38}
AVG_K = {"fg_made_30_39": 0.6, "fg_made_40_49": 0.4, "pat_made": 2.3}


def _base(pos, avg):
    return {"player_id": "x", "sleeper_id": "99999", "player_name": "T",
            "position": pos, "team": "X", "projected_points": 10.0,
            "width": 3.0, "projection_lower": 7.0, "projection_upper": 13.0,
            "ros_points": 100.0, "remaining_games": 10, "avg_stats": avg}


def test_qb_set():
    out = _hub_player(_base("QB", AVG_QB))
    assert out["proj_pass_yd"] == 250.4
    assert out["proj_pass_td"] == 1.83
    assert out["proj_rush_yd"] == 15.2
    assert out["proj_rush_td"] == 0.24
    assert out["proj_rec"] is None and out["proj_fgm"] is None


def test_rb_set():
    out = _hub_player(_base("RB", AVG_RB))
    assert out["proj_rush_yd"] == 58.6
    assert out["proj_rush_td"] == 0.42
    assert out["proj_rec"] == 2.8
    assert out["proj_rec_yd"] == 21.5
    assert out["proj_pass_yd"] is None and out["proj_rec_td"] is None


def test_wr_set():
    out = _hub_player(_base("WR", AVG_WR))
    assert out["proj_rec"] == 4.4
    assert out["proj_rec_yd"] == 62.1
    assert out["proj_rec_td"] == 0.38
    assert out["proj_rush_yd"] is None and out["proj_pass_yd"] is None


def test_k_set_sums_fgm_brackets():
    out = _hub_player(_base("K", AVG_K))
    assert out["proj_fgm"] == 1.0
    assert out["proj_xpm"] == 2.3
    assert out["proj_rec"] is None


def test_empty_avg_gives_all_none():
    out = _hub_player(_base("QB", {}))
    for k in ("proj_pass_yd", "proj_pass_td", "proj_rush_yd",
              "proj_rush_td", "proj_rec", "proj_rec_yd", "proj_rec_td",
              "proj_fgm", "proj_xpm"):
        assert out[k] is None, k


if __name__ == "__main__":
    test_qb_set()
    test_rb_set()
    test_wr_set()
    test_k_set_sums_fgm_brackets()
    test_empty_avg_gives_all_none()
    print("OK")
