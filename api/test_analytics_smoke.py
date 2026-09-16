"""Regression guard: compute_analytics() must not raise for a real
league, end to end, through every code path it touches (replacement
levels, auction values, VOR, ROS). This is the test that would have
caught the _remaining_games NameError shipped earlier (fixed in
commit eb8cc06) before it reached production."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from analytics import compute_analytics

TEST_LEAGUE_ID = "1397736035240173568"  # Fantasy Bahamas, 12-team PPR auction


def test_compute_analytics_end_to_end():
    result = compute_analytics(TEST_LEAGUE_ID)
    assert "players" in result
    assert "meta" in result
    assert result["meta"]["league_name"]
    if result["players"]:
        p = result["players"][0]
        for key in ("player_id", "player_name", "position", "projected_points",
                   "ros_points", "remaining_games", "vor", "auction_value", "tier"):
            assert key in p, f"missing key: {key}"


if __name__ == "__main__":
    test_compute_analytics_end_to_end()
    print("OK")
