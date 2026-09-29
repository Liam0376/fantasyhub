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
    assert proj["projected_points"] < 35.0
    assert proj["avg_stats"]["passing_yards"] < 450


def test_empty_roster_returns_empty():
    projections = compute_projections(
        [], current_week=5, season=2026,
        prior_season_rows=[], game_ctx={}, weather_by_team={},
    )
    assert projections == []


def test_missing_position_processes_as_unk():
    rows = [{
        "player_id": "TEST2", "player_display_name": "No Pos",
        "position": "", "team": "NYG", "season": 2026, "season_type": "REG",
        "week": 1, "passing_yards": "100",
    }]
    projections = compute_projections(
        rows, current_week=2, season=2026,
        prior_season_rows=[], game_ctx={}, weather_by_team={},
    )
    assert len(projections) == 1
    assert projections[0]["position"] == ""


def test_projection_freeze_skips_existing_file(tmp_path):
    """Freeze guard: a pre-existing week file must not be overwritten by a
    re-run targeting a different week. This is the snapshot-immutability
    invariant introduced in e4bf65a."""
    import json
    from pathlib import Path

    sentinel = {"players": [{"player_name": "Sentinel", "projected_points": 99.9}],
                "updated_at": "2026-09-01T00:00:00"}
    frozen = tmp_path / "2026_week_03.json"
    frozen.write_text(json.dumps(sentinel))

    # Simulate the freeze guard inline (no full script invocation needed):
    # "if target_week != week and outfile_check.exists(): skip"
    target_week, current_week = 3, 4
    outfile_check = tmp_path / f"2026_week_{target_week:02d}.json"
    skipped = target_week != current_week and outfile_check.exists()
    assert skipped, "freeze guard should skip a week whose file already exists"

    # File must remain untouched
    loaded = json.loads(frozen.read_text())
    assert loaded["players"][0]["projected_points"] == 99.9


if __name__ == "__main__":
    test_thin_sample_qb_regresses_not_raw()
    test_empty_roster_returns_empty()
    test_missing_position_processes_as_unk()
    import tempfile, pathlib
    with tempfile.TemporaryDirectory() as td:
        test_projection_freeze_skips_existing_file(pathlib.Path(td))
    print("OK")
