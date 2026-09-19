"""Tests for pbp_features.aggregate_pbp: share math on fixture rows.

Audit finding: PBP aggregation was untested. Fixtures pin the share
denominators (team plays/targets/carries/air) that serve-time features
divide by — a wrong denominator silently zeroes ML usage features.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from pbp_features import aggregate_pbp


def _rows():
    base = {"posteam": "KC", "season_type": "REG", "aborted_play": "0",
            "pass_attempt": "0", "pass": "0", "rush_attempt": "0", "rush": "0",
            "play_type": "", "air_yards": "", "yardline_100": ""}
    return [
        # Two targets to P1 (one redzone), both from Q1
        dict(base, week="1", pass_attempt="1", receiver_player_id="P1",
             passer_player_id="Q1", air_yards="10", yardline_100="10"),
        dict(base, week="1", pass_attempt="1", receiver_player_id="P1",
             passer_player_id="Q1", air_yards="20", yardline_100="50"),
        # One redzone carry for P2
        dict(base, week="1", rush_attempt="1", rusher_player_id="P2",
             yardline_100="5"),
        # Aborted play: skipped entirely
        dict(base, week="1", pass_attempt="1", aborted_play="1",
             receiver_player_id="P9"),
        # Missing week: skipped
        dict(base, week="", pass_attempt="1", receiver_player_id="P9"),
        # NA receiver: counts as a team play, credits no player
        dict(base, week="1", pass_attempt="1", receiver_player_id="NA",
             passer_player_id="Q1"),
        # NOTE: season_type REG filtering is fetch_pbp_csv's job (network);
        # aggregate_pbp takes already-filtered rows, so no POST row here.
    ]


def test_target_and_air_shares():
    out = aggregate_pbp(_rows(), 2026)
    p1 = out[("P1", 1)]
    assert p1["targets"] == 2
    assert p1["target_share"] == 1.0
    assert p1["air_yards"] == 30.0
    assert p1["air_yards_share"] == 1.0
    assert p1["redzone_targets"] == 1
    assert p1["team"] == "KC"


def test_rush_and_redzone_carries():
    out = aggregate_pbp(_rows(), 2026)
    p2 = out[("P2", 1)]
    assert p2["carries"] == 1
    assert p2["rush_share"] == 1.0
    assert p2["redzone_carries"] == 1


def test_snap_share_denominator_includes_na_play():
    out = aggregate_pbp(_rows(), 2026)
    # Team plays: r1, r2, r3, r6(NA receiver) = 4
    assert out[("P1", 1)]["snap_share"] == 2 / 4
    assert out[("P2", 1)]["snap_share"] == 1 / 4
    # Passer-only involvement still counts as a play
    assert out[("Q1", 1)]["snap_share"] == 3 / 4
    assert out[("Q1", 1)]["targets"] == 0


def test_skipped_rows_leave_no_trace():
    out = aggregate_pbp(_rows(), 2026)
    assert ("P9", 1) not in out


if __name__ == "__main__":
    test_target_and_air_shares()
    test_rush_and_redzone_carries()
    test_snap_share_denominator_includes_na_play()
    test_skipped_rows_leave_no_trace()
    print("OK")
