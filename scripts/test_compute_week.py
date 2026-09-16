import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
sys.path.insert(0, str(Path(__file__).parent))

from compute_week import compute_projections, fetch_current_and_prior_season_history


def test_thin_sample_qb_regresses_not_raw():
    """A QB with one huge game and league-average history should NOT
    project at the raw single-game rate — this is the Week 1
    overweighting bug this whole port exists to fix."""
    current_week_rows = [{
        "player_id": "TEST1", "player_display_name": "Test QB", "position": "QB",
        "team": "BUF", "opponent_team": "MIA", "season": 2026, "season_type": "REG",
        "week": 1, "passing_yards": "450", "passing_tds": "5",
        "passing_interceptions": "0", "rushing_yards": "10", "rushing_tds": "0",
        "fumbles_lost_total": "0",
    }]
    prior_season_rows = [{
        "player_id": "TEST1", "player_display_name": "Test QB", "position": "QB",
        "team": "BUF", "season": 2025, "season_type": "REG", "week": w,
        "passing_yards": "230", "passing_tds": "1.5", "passing_interceptions": "0.8",
        "rushing_yards": "15", "rushing_tds": "0.1", "fumbles_lost_total": "0.1",
    } for w in range(1, 17)]

    projections = compute_projections(
        current_week_rows, current_week=2, season=2026,
        prior_season_rows=prior_season_rows, game_ctx={}, weather_by_team={},
    )
    assert len(projections) == 1
    proj = projections[0]
    # Raw single-game rate scores ~38+ fantasy pts on standard scoring;
    # blended-and-regressed must land well below that.
    assert proj["projected_points"] < 30.0
    assert proj["avg_stats"]["passing_yards"] < 450


if __name__ == "__main__":
    test_thin_sample_qb_regresses_not_raw()
    print("OK")
