"""Tests for train_model pure helpers: arrays, metrics, honest errors.

Audit finding: to_arrays/mae/pairwise_accuracy were untested.
numpy is required for these (present in pipeline envs); without it the
tests skip. Training entry points must raise an honest RuntimeError —
not sys.exit at import — when deps are missing (import-time exit used
to kill test collection).
"""
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
sys.path.insert(0, str(Path(__file__).parent))

try:
    import numpy as np
    HAVE_NP = True
except ImportError:
    HAVE_NP = False

import train_model


def _need_np():
    if not HAVE_NP:
        print("SKIP (numpy missing): pip install -r requirements-ml.txt")
        return False
    return True


def test_to_arrays_shape_and_defaults():
    if not _need_np():
        return
    rows = [{"a": 1.0, "b": 2.0, "residual": 0.5}, {"a": 3.0}]
    X, y = train_model.to_arrays(rows, ["a", "b"])
    assert X.shape == (2, 2) and y.shape == (2,)
    assert float(X[1][1]) == 0.0  # missing key defaults to 0
    assert list(y) == [0.5, 0.0]


def test_mae_known_value():
    if not _need_np():
        return
    assert train_model.mae(np.array([1.0, 2.0]), np.array([1.5, 1.0])) == 0.75


def test_pairwise_edges_and_perfect_ranking():
    if not _need_np():
        return
    assert train_model.pairwise_accuracy([5.0], [1.0]) == 0.5  # n < 2
    y = [1.0, 2.0, 3.0, 4.0]
    assert train_model.pairwise_accuracy(y, y) == 1.0
    rev = [4.0, 3.0, 2.0, 1.0]
    assert train_model.pairwise_accuracy(y, rev) == 0.0


def test_training_entry_points_need_deps():
    if train_model.np is not None and train_model.xgb is not None:
        return  # deps present: nothing to assert about the guard
    for fn in (lambda: train_model.train_position_model("QB", [], []),
               train_model.main):
        try:
            fn()
            assert False, "expected RuntimeError without deps"
        except RuntimeError:
            pass


if __name__ == "__main__":
    test_to_arrays_shape_and_defaults()
    test_mae_known_value()
    test_pairwise_edges_and_perfect_ranking()
    test_training_entry_points_need_deps()
    print("OK")
