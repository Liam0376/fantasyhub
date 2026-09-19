"""Tests for opp_features.compute_opp_defense: aggregation and windows.

Audit finding: opponent-defense math was untested. Expected values are
derived from scoring.score_avg_stats directly, so these tests pin the
aggregation/windowing/filtering — not the scoring table (covered in
test_scoring.py).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from opp_features import compute_opp_defense
from scoring import REF_SCORING, score_avg_stats


def _sched():
    return [
        {"game_type": "REG", "week": 1, "home_team": "KC", "away_team": "BUF"},
        {"game_type": "REG", "week": 2, "home_team": "BUF", "away_team": "KC"},
        {"game_type": "POST", "week": 1, "home_team": "KC", "away_team": "DEN"},
        {"game_type": "REG", "week": "bogus", "home_team": "KC", "away_team": "NYJ"},
    ]


def _qb(team, week, yds, tds):
    return {"position": "QB", "team": team, "week": week,
            "passing_yards": yds, "passing_tds": tds}


def test_points_allowed_uses_schedule_opponent():
    rows = [_qb("KC", 1, 300, 2)]
    out = compute_opp_defense(rows, _sched(), REF_SCORING)
    expected = score_avg_stats(rows[0], REF_SCORING, "QB")
    assert out["BUF"]["qb_pts_allowed"] == expected
    assert "KC" not in out


def test_window_takes_most_recent():
    rows = [_qb("KC", w, 100 + 10 * w, 1) for w in (1, 2, 1, 2, 1, 2)]
    out = compute_opp_defense(rows, _sched(), REF_SCORING, window=5)
    # Last 5 of 6 rows; both weeks map KC->BUF via schedule
    recent = rows[-5:]
    expected = sum(score_avg_stats(r, REF_SCORING, "QB") for r in recent) / 5
    assert abs(out["BUF"]["qb_pts_allowed"] - expected) < 1e-9


def test_up_to_week_excludes_current_and_future():
    rows = [_qb("KC", 1, 300, 2), _qb("KC", 2, 300, 2)]
    out = compute_opp_defense(rows, _sched(), REF_SCORING, up_to_week=2)
    expected = score_avg_stats(rows[0], REF_SCORING, "QB")
    assert out["BUF"]["qb_pts_allowed"] == expected


def test_filters_kickers_zeropoint_and_unmatched():
    rows = [
        {"position": "K", "team": "KC", "week": 1, "fgm_40_49": 2},
        {"position": "QB", "team": "KC", "week": 1},  # zero stats -> 0 pts
        {"position": "QB", "team": "XXX", "week": 1,
         "passing_yards": 500, "passing_tds": 5},  # no schedule opp
    ]
    out = compute_opp_defense(rows, _sched(), REF_SCORING)
    assert out == {}


if __name__ == "__main__":
    test_points_allowed_uses_schedule_opponent()
    test_window_takes_most_recent()
    test_up_to_week_excludes_current_and_future()
    test_filters_kickers_zeropoint_and_unmatched()
    print("OK")
