"""Tests for opp_features.compute_opp_defense: aggregation and windows.

Audit finding: opponent-defense math was untested. Expected values are
derived from scoring.score_avg_stats directly, so these tests pin the
aggregation/windowing/filtering — not the scoring table (covered in
test_scoring.py).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from opp_features import compute_opp_defense, matchup_ranks
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


def test_sample_counts_ride_along():
    rows = [_qb("KC", 1, 300, 2), _qb("KC", 2, 300, 2)]
    out = compute_opp_defense(rows, _sched(), REF_SCORING)
    # Both weeks map KC->BUF, window default keeps both
    assert out["BUF"]["qb_n"] == 2
    assert out["BUF"]["rb_n"] == 0


def _mini_league(n_teams=12):
    # Synthetic opp_defense: team T00 allows the most, T11 the least.
    d = {}
    for i in range(n_teams):
        d[f"T{i:02d}"] = {"qb_pts_allowed": 30.0 - i, "qb_n": 4.0,
                          "rb_pts_allowed": 0.0, "rb_n": 0.0,
                          "wr_pts_allowed": 0.0, "wr_n": 0.0,
                          "te_pts_allowed": 0.0, "te_n": 0.0}
    return d


def test_rank_polarity_and_difficulty():
    ranks = matchup_ranks(_mini_league(), prior_weight=0.0)
    # Rank 1 = fewest allowed = hardest defense; rank 12 = easiest.
    assert ranks["T11"]["QB"]["rank"] == 1
    assert ranks["T11"]["QB"]["difficulty"] == "HARD"
    assert ranks["T00"]["QB"]["rank"] == 12
    assert ranks["T00"]["QB"]["difficulty"] == "EASY"
    # No samples -> no entry for that position.
    assert "RB" not in ranks["T00"]


def test_shrinkage_pulls_single_game_toward_mean():
    d = _mini_league()
    d["T00"]["qb_pts_allowed"] = 60.0  # one-game outlier
    d["T00"]["qb_n"] = 1.0
    ranks = matchup_ranks(d, prior_weight=3.0)
    blended = ranks["T00"]["QB"]["pts_allowed"]
    # (1*60 + 3*mean)/4 lands between the outlier and the mean.
    mean = sum(30.0 - i for i in range(12)) / 12
    assert mean < blended < 60.0
    assert ranks["T00"]["QB"]["n"] == 1


if __name__ == "__main__":
    test_points_allowed_uses_schedule_opponent()
    test_window_takes_most_recent()
    test_up_to_week_excludes_current_and_future()
    test_filters_kickers_zeropoint_and_unmatched()
    test_sample_counts_ride_along()
    test_rank_polarity_and_difficulty()
    test_shrinkage_pulls_single_game_toward_mean()
    print("OK")
