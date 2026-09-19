"""Serve<->training parity: compute_week.py must build ML features with
the exact formulas build_training_data.py used (Phase C audit).

Method: swap compute_week.ml_predict with a recorder, run
compute_projections on fixture CSV-like rows, assert the recorded
feature dict matches the training definition. One test per skew.
"""
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
sys.path.insert(0, str(Path(__file__).parent))

import compute_week
from build_training_data import weighted_avg, linear_trend
from scoring import REF_SCORING, score_avg_stats


def _qb_rows(pid="QB1"):
    rows = []
    for w, yds, tds in ((1, 250, 2), (2, 300, 3), (3, 200, 1)):
        rows.append({
            "player_id": pid, "player_display_name": "Test QB",
            "position": "QB", "team": "BUF", "opponent_team": "MIA",
            "season": 2026, "season_type": "REG", "week": w,
            "passing_yards": str(yds), "passing_tds": str(tds),
            "passing_interceptions": "1", "rushing_yards": "10",
            "rushing_tds": "0", "fumbles_lost_total": "0",
        })
    return rows


def _qb_rows_7(pid="QB7"):
    rows = []
    for w in range(1, 8):
        rows.append({
            "player_id": pid, "player_display_name": "Test QB7",
            "position": "QB", "team": "BUF", "opponent_team": "MIA",
            "season": 2026, "season_type": "REG", "week": w,
            "passing_yards": str(200 + 10 * w), "passing_tds": "2",
            "passing_interceptions": "1", "rushing_yards": "10",
            "rushing_tds": "0", "fumbles_lost_total": "0",
        })
    return rows


def _run_with_recorder(rows, current_week=4, **kw):
    seen = {}

    def _recorder(feats, pos):
        seen["feats"] = feats
        return 0.0

    real = compute_week.ml_predict
    compute_week.ml_predict = _recorder
    try:
        kw.setdefault("pbp_data", {})
        out = compute_week.compute_projections(
            rows, current_week=current_week, season=2026, **kw)
    finally:
        compute_week.ml_predict = real
    return out, seen.get("feats", {})


def test_c1_curr_ppg_is_weighted_history_not_heuristic():
    rows = _qb_rows()
    out, feats = _run_with_recorder(rows)
    assert feats, "ML block did not run"
    expected = weighted_avg(
        [score_avg_stats(g, REF_SCORING, "QB") for g in rows])
    assert abs(feats["curr_ppg_wavg"] - expected) < 1e-9
    # Heuristic stays its own feature...
    assert feats["heuristic_pts"] != feats["curr_ppg_wavg"]
    # ...and the residual flows to the output entry
    entry = next(p for p in out if p["player_id"] == "QB1")
    assert entry["ml_adjustment"] == 0.0  # recorder returns 0.0 residual


def test_c2_stat_avgs_are_weighted():
    rows = _qb_rows_7()
    _, feats = _run_with_recorder(rows, current_week=8)
    yds = [float(g["passing_yards"]) for g in rows]
    assert abs(feats["curr_passing_yards_wavg"] - weighted_avg(yds)) < 1e-9
    assert abs(weighted_avg(yds) - sum(yds) / len(yds)) > 1e-9  # genuinely differ


def test_c2_ppg_block_matches_training():
    rows = _qb_rows_7()
    _, feats = _run_with_recorder(rows, current_week=8)
    ppgs = [score_avg_stats(g, REF_SCORING, "QB") for g in rows]
    assert abs(feats["curr_ppg_wavg"] - weighted_avg(ppgs)) < 1e-9
    mean_w = feats["curr_ppg_wavg"]
    expected_std = (sum((p - mean_w) ** 2 for p in ppgs) / len(ppgs)) ** 0.5
    assert abs(feats["ppg_std"] - expected_std) < 1e-9
    assert abs(feats["ppg_trend"] - linear_trend(ppgs[-5:])) < 1e-9
    assert feats["ppg_max"] == max(ppgs) and feats["ppg_min"] == min(ppgs)


def test_c2_pbp_and_snap_are_weighted():
    rows = _qb_rows_7()
    pbp = {("QB7", w): {
        "target_share": 0.0, "rush_share": 0.0, "air_yards_share": 0.0,
        "snap_share": 0.05 * w, "redzone_targets": 0, "redzone_carries": 0,
    } for w in range(1, 8)}
    snap = {("test qb7", "BUF", w): 10.0 * w for w in range(1, 8)}
    _, feats = _run_with_recorder(rows, current_week=8,
                                  pbp_data=pbp, snap_data=snap)
    snaps = [0.05 * w for w in range(1, 8)]
    assert abs(feats["pbp_snap_share_wavg"] - weighted_avg(snaps)) < 1e-9
    pcts = [10.0 * w for w in range(1, 8)]
    assert abs(feats["snap_pct_wavg"] - weighted_avg(pcts)) < 1e-9


if __name__ == "__main__":
    test_c1_curr_ppg_is_weighted_history_not_heuristic()
    test_c2_stat_avgs_are_weighted()
    test_c2_ppg_block_matches_training()
    test_c2_pbp_and_snap_are_weighted()
    print("OK")
