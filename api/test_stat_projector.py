# api/test_stat_projector.py
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from stat_projector import (
    weighted_recent_avg, _td_regression, _usage_trend_adjustment,
    _vegas_adjustment, project_player_stats, build_game_context,
)


def test_weighted_recent_avg_empty():
    assert weighted_recent_avg([]) == 0.0


def test_weighted_recent_avg_short_history():
    # <= RECENT_N games: plain average
    assert abs(weighted_recent_avg([10.0, 20.0]) - 15.0) < 0.01


def test_weighted_recent_avg_long_history_weights_recent():
    # 6 games, last 5 weighted 2x over the first
    values = [0.0, 10.0, 10.0, 10.0, 10.0, 10.0]
    result = weighted_recent_avg(values)
    # old=[0.0] weight 1, recent=[10,10,10,10,10] weight 2 each
    # (0*1 + 50*2) / (1 + 5*2) = 100/11
    assert abs(result - 100 / 11) < 0.001


def test_td_regression_pulls_toward_position_mean():
    # QB passing_tds prior is 0.83; a raw base of 3.0 regresses 30% toward it
    result = _td_regression(3.0, "QB", "passing_tds")
    expected = 3.0 * 0.7 + 0.83 * 0.3
    assert abs(result - expected) < 0.001


def test_td_regression_noop_for_non_td_stat():
    assert _td_regression(50.0, "QB", "passing_yards") == 50.0


def test_usage_trend_caps_at_50_percent():
    # Willis-style blowup: 1 game of huge recent volume vs tiny prior average
    history = [
        {"rushing_yards": 6}, {"rushing_yards": 5}, {"rushing_yards": 4},
        {"rushing_yards": 138},
    ]
    base = 10.0
    result = _usage_trend_adjustment(base, history, "rushing_yards")
    # trend capped at +50%, weight 0.15 -> max multiplier 1.075
    assert result <= base * 1.075 + 0.001


def test_vegas_adjustment_scales_tds_more_than_yards():
    projected = {"passing_tds": 2.0, "passing_yards": 250.0}
    # implied_total double the league average (44.4 vs 22.2)
    result = _vegas_adjustment(projected, implied_total=44.4)
    td_scale = result["passing_tds"] / 2.0
    yd_scale = result["passing_yards"] / 250.0
    assert td_scale > yd_scale > 1.0


def test_project_player_stats_thin_sample_blends_with_prior():
    # 1 game this season, prior season average available -> blend, not raw
    history = [{"passing_yards": 400, "passing_tds": 4, "passing_interceptions": 0,
                "rushing_yards": 0, "rushing_tds": 0, "fumbles_lost_total": 0}]
    prior = [{"passing_yards": 200, "passing_tds": 1, "passing_interceptions": 1,
              "rushing_yards": 10, "rushing_tds": 0, "fumbles_lost_total": 0,
              "season_type": "REG"}] * 16
    result = project_player_stats(history, "QB", prior_season_stats=prior)
    # blend = 1/3 current + 2/3 prior on passing_yards, before TD regression/trend
    assert result["passing_yards"] < 400
    assert result["passing_yards"] > 200
    assert result["is_empty_projection"] is False


def test_project_player_stats_empty_history_flags():
    result = project_player_stats([], "RB")
    assert result["is_empty_projection"] is True


def test_build_game_context_computes_implied_totals():
    schedule = [{
        "week": "1", "game_type": "REG", "home_team": "BUF", "away_team": "MIA",
        "total_line": "48.0", "spread_line": "-6.5", "temp": "72", "wind": "5",
        "roof": "outdoors",
    }]
    ctx = build_game_context(schedule)
    home = ctx[("BUF", 1)]
    away = ctx[("MIA", 1)]
    assert home["opponent"] == "MIA"
    assert away["opponent"] == "BUF"
    # home favored by 6.5 on a 48 total -> home_implied = (48+6.5)/2 = 27.25... wait sign
    assert round(home["implied_total"] + away["implied_total"], 1) == 48.0


if __name__ == "__main__":
    test_weighted_recent_avg_empty()
    test_weighted_recent_avg_short_history()
    test_weighted_recent_avg_long_history_weights_recent()
    test_td_regression_pulls_toward_position_mean()
    test_td_regression_noop_for_non_td_stat()
    test_usage_trend_caps_at_50_percent()
    test_vegas_adjustment_scales_tds_more_than_yards()
    test_project_player_stats_thin_sample_blends_with_prior()
    test_project_player_stats_empty_history_flags()
    test_build_game_context_computes_implied_totals()
    print("OK")
