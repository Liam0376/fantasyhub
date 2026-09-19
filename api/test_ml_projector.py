"""Tests for ml_projector.py: residual path and graceful fallbacks.

Audit finding: ml_predict's residual/None fallback was untested.
These tests hold with AND without xgboost installed: when models cannot
load, the contract is None (heuristic stands); when they load, a numeric
residual comes back.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import ml_projector


def _snapshot():
    return (ml_projector._loaded, ml_projector._ship,
            dict(ml_projector._models), dict(ml_projector._feature_cols),
            ml_projector.META_PATH)


def _restore(snap):
    (ml_projector._loaded, ml_projector._ship, models,
     cols, ml_projector.META_PATH) = snap
    ml_projector._models.clear()
    ml_projector._models.update(models)
    ml_projector._feature_cols.clear()
    ml_projector._feature_cols.update(cols)


def test_none_when_meta_missing():
    snap = _snapshot()
    try:
        ml_projector.META_PATH = ml_projector.MODEL_DIR / "does_not_exist.json"
        ml_projector._loaded = False
        assert ml_projector.ml_predict({"position": "QB"}, "QB") is None
    finally:
        _restore(snap)


def test_none_for_unknown_position():
    snap = _snapshot()
    try:
        ml_projector._loaded = False
        assert ml_projector.ml_predict({"position": "XX"}, "XX") is None
    finally:
        _restore(snap)


def test_qb_residual_or_graceful_none():
    snap = _snapshot()
    try:
        ml_projector._loaded = False
        cols = []
        try:
            import json
            with open(ml_projector.META_PATH) as f:
                cols = json.load(f).get("feature_cols_by_position", {}).get("QB", [])
        except (OSError, ValueError):
            cols = []
        feats = {"position": "QB", **{c: 0 for c in cols}}
        r = ml_projector.ml_predict(feats, "QB")
        try:
            import xgboost  # noqa: F401
            assert isinstance(r, float), f"expected numeric residual, got {r!r}"
        except ImportError:
            assert r is None
    finally:
        _restore(snap)


def test_ship_false_means_none():
    snap = _snapshot()
    try:
        ml_projector._loaded = True
        ml_projector._ship = False
        ml_projector._models.clear()
        assert ml_projector.ml_predict({"position": "QB"}, "QB") is None
    finally:
        _restore(snap)


if __name__ == "__main__":
    test_none_when_meta_missing()
    test_none_for_unknown_position()
    test_qb_residual_or_graceful_none()
    test_ship_false_means_none()
    print("OK")
