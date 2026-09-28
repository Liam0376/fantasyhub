"""Top-level contract tests for /hub-api/games/predictions and
/props/board.

hub/src/api.js maps data.timestamp/week/season (NOT data.meta.*), so a
response with only nested meta leaves the SPA's cache metadata undefined.
Both handlers are stubbed offline: games.csv fetch and compute_analytics
swapped out by attribute.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from unittest.mock import patch

import hubapi


def test_hub_games_exposes_top_level_fields():
    csv_text = ("game_id,season,game_type,week,home_team,away_team,"
                "home_score,away_score,spread_line,total_line,"
                "home_moneyline,away_moneyline,gameday,gametime,stadium\n"
                "1,2026,REG,3,BUF,MIA,20,17,-3.0,44.5,155,120,"
                "2026-09-20,13:00:00,Highmark Stadium\n")

    class _Resp:
        text = csv_text
        def raise_for_status(self):
            pass

    with patch("hubapi.requests.get", return_value=_Resp()), \
         patch("hubapi._st", return_value={"season": 2026, "week": 3}):
        out = hubapi.hub_games("LID", week="3", season="2026")
    assert out["week"] == 3
    assert out["season"] == 2026
    assert isinstance(out["timestamp"], int) and out["timestamp"] > 0
    assert len(out["games"]) == 1
    # meta kept for older consumers
    assert out["meta"]["week"] == 3 and out["meta"]["season"] == 2026


def test_hub_games_csv_failure_is_cold_not_broken():
    with patch("hubapi.requests.get", side_effect=OSError("net down")), \
         patch("hubapi._st", return_value={"season": 2026, "week": 3}):
        out = hubapi.hub_games("LID", week="3", season="2026")
    assert out["games"] == []
    assert out["meta"]["cold"] is True
    # top-level fields still present so the SPA cache keys stay defined
    assert out["week"] == 3 and out["season"] == 2026
    assert isinstance(out["timestamp"], int)


def test_hub_props_board_exposes_top_level_fields():
    real_a, real_w = hubapi.compute_analytics, hubapi._weekly_actuals
    hubapi.compute_analytics = lambda *a, **k: {
        "players": [], "meta": {"week": 5, "season": 2026}}
    hubapi._weekly_actuals = lambda *a, **k: {}
    try:
        out = hubapi.hub_props_board("LID")
    finally:
        hubapi.compute_analytics, hubapi._weekly_actuals = real_a, real_w
    assert out["week"] == 5
    assert out["season"] == 2026
    assert isinstance(out["timestamp"], int) and out["timestamp"] > 0
    assert out["meta"]["week"] == 5


if __name__ == "__main__":
    test_hub_games_exposes_top_level_fields()
    test_hub_games_csv_failure_is_cold_not_broken()
    test_hub_props_board_exposes_top_level_fields()
    print("OK")
