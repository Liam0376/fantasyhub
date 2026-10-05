"""Regression test for /hub-api/news trending-adds, wired to the real
free Sleeper endpoint this session's graphify research confirmed
Draftly was stubbing out despite having no ToS restriction on it
(unlike ECR/ADP/market data, which stays correctly dropped)."""
import sys
import os
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(__file__))

import pytest

from hubapi import hub_news


@pytest.mark.network
def test_hub_news_returns_real_trending_data():
    result = hub_news(limit=5)
    assert "trending_adds" in result
    assert "fantasypros_news" in result
    assert result["fantasypros_news"] == []
    adds = result["trending_adds"]
    assert isinstance(adds, list)
    assert len(adds) > 0, "Sleeper trending endpoint returned no players — check the endpoint is reachable"
    for p in adds:
        assert "player_id" in p
        assert "player_name" in p
        assert "position" in p
        assert "team" in p
        assert "count" in p
        assert isinstance(p["count"], int)


def test_hub_news_handles_def_team_ids():
    """Sleeper's trending list includes team-abbreviation ids for DEF
    (e.g. 'TB') that are NOT in data/players/latest.json's snapshot
    (snapshot_players.py's KEEP set excludes 'DEF'). These must resolve
    to a DEF entry, not crash and not silently drop the row.

    Synthesized trending payload so the mapping logic is asserted
    deterministically (a live top-25 list may hold no DEF row, which
    made the old loop vacuous)."""
    synthetic = [
        {"player_id": "TB", "count": 42},
        {"player_id": "3114", "count": 7},  # numeric id, not in snapshot
    ]
    with patch("hubapi._sleeper", return_value=synthetic):
        result = hub_news(limit=25)
    rows = result["trending_adds"]
    assert len(rows) == 2, "rows must not be dropped when a DEF id is present"
    def_row = next(p for p in rows if p["player_id"] == "TB")
    assert def_row["position"] == "DEF"
    assert def_row["team"] == "TB"
    assert def_row["count"] == 42
    num_row = next(p for p in rows if p["player_id"] == "3114")
    assert num_row["position"] != "DEF"
    assert num_row["count"] == 7


def test_hub_news_soft_fails_on_sleeper_error():
    """Verify the soft-fail error-handling path: when Sleeper API is
    unreachable or raises an exception, hub_news() returns gracefully
    with empty arrays instead of crashing."""
    with patch("hubapi._sleeper", side_effect=Exception("simulated network failure")):
        result = hub_news(limit=5)
    assert result == {"trending_adds": [], "fantasypros_news": []}


if __name__ == "__main__":
    test_hub_news_returns_real_trending_data()
    test_hub_news_handles_def_team_ids()
    test_hub_news_soft_fails_on_sleeper_error()
    print("OK")
