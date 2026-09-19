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
from build_training_data import weighted_avg
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


def _run_with_recorder(rows, **kw):
    seen = {}

    def _recorder(feats, pos):
        seen["feats"] = feats
        return 0.0

    real = compute_week.ml_predict
    compute_week.ml_predict = _recorder
    try:
        out = compute_week.compute_projections(
            rows, current_week=4, season=2026, pbp_data={}, **kw)
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


if __name__ == "__main__":
    test_c1_curr_ppg_is_weighted_history_not_heuristic()
    print("OK")
