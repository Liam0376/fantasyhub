"""Tests for the residual bias calibration artifact.

Nothing in ml_projector.py changed (the correction FAILED its gates and did
not ship) — these tests pin the artifact that
scripts/calibrate_residual_bias.py produced, so a future retraining that
shifts the numbers fails loudly instead of silently changing the story.
"""
import json
import sys
import os
from pathlib import Path

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

import ml_projector

REPO_ROOT = Path(__file__).resolve().parents[1]
BIAS_PATH = REPO_ROOT / "data" / "models" / "bias_correction.json"
DATA_PATH = REPO_ROOT / "data" / "models" / "training_data.jsonl"


def _load_bias():
    return json.loads(BIAS_PATH.read_text())


def _disabled(b):
    return b["fitted_on"].startswith("disabled")


def test_bias_file_schema():
    # why: the artifact is the entire output of the experiment; a malformed
    # file (partial write, hand-edit) must fail here, not in production.
    # Two valid states: fitted on a validation window, or explicitly disabled
    # with zeroed constants (raw ML passes the gates without correction).
    b = _load_bias()
    assert b["version"] == 1
    disabled = _disabled(b)
    assert disabled or b["fitted_on"].startswith("2024 val"), b["fitted_on"]
    consts = b["constants"]
    for pos in ("QB", "RB", "WR", "TE"):
        assert pos in consts, f"missing position {pos}"
        for regime in ("early", "late"):
            cell = consts[pos][regime]
            assert isinstance(cell["bias"], float) and abs(cell["bias"]) != float("inf")
            assert isinstance(cell["n"], int)
            if disabled:
                assert cell["bias"] == 0.0 and cell["n"] == 0, (pos, regime, cell)
            else:
                assert cell["n"] > 0
    assert "gate_rerun_2025" in b
    if disabled:
        assert b["gate_rerun_2025"].get("note"), "disabled state must document why"
    else:
        assert set(b["gate_rerun_2025"]["gates"]) == {"overall_mae", "no_regression", "pairwise"}


def test_bias_matches_val_fit():
    # why: pins the fitting procedure — bias[RB][early] must equal a fresh
    # mean(predicted - actual) over 2024 RB rows with week <= 4. If a future
    # retraining changes models or data, this fails and forces a recalibration
    # instead of serving stale constants.
    if not DATA_PATH.exists():
        import pytest
        pytest.skip("training_data.jsonl not in repo (30 MB, gitignored)")
    b = _load_bias()
    if _disabled(b):
        import pytest
        pytest.skip("bias correction disabled; no fitted constants to pin")
    ml_projector._load_models()
    model = ml_projector._models.get("RB")
    cols = ml_projector._feature_cols.get("RB", [])
    assert model is not None and cols, "RB model must load for fit-pin test"
    rs = []
    with open(DATA_PATH) as f:
        for line in f:
            r = json.loads(line)
            if (r.get("season") == 2024
                    and (r.get("position") or "").upper() == "RB"
                    and (r.get("week", 99) or 99) <= 4):
                rs.append(r)
    assert len(rs) == b["constants"]["RB"]["early"]["n"]
    X = np.array([[r.get(c, 0) for c in cols] for r in rs], dtype=np.float32)
    actual = np.array([r.get("residual", 0) for r in rs], dtype=np.float32)
    fresh = float(np.mean(model.predict(X) - actual))
    assert abs(fresh - b["constants"]["RB"]["early"]["bias"]) < 1e-3
