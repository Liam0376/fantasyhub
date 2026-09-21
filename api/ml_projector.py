"""ML projection: per-position XGBoost residual models.

Predicts residual (actual - heuristic), added to heuristic projection.
Falls back to None if model files missing.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

MODEL_DIR = Path(__file__).parent.parent / "data" / "models"
META_PATH = MODEL_DIR / "ml_meta.json"

_models: dict[str, object] = {}
_feature_cols: dict[str, list[str]] = {}
_loaded = False
_ship = False
_load_error: str | None = None


def _load_models():
    global _loaded, _ship, _load_error
    if _loaded:
        return
    _loaded = True

    if not META_PATH.exists():
        _load_error = f"meta missing: {META_PATH}"
        print(f"[ml_projector] {_load_error}", file=sys.stderr)
        return

    try:
        import xgboost as xgb

        with open(META_PATH) as f:
            meta = json.load(f)

        _ship = meta.get("ship", False)
        if not _ship:
            _load_error = "ship=false, ML disabled by gate"
            print(f"[ml_projector] {_load_error}", file=sys.stderr)
            return

        cols_by_pos = meta.get("feature_cols_by_position", {})
        for pos in ("QB", "RB", "WR", "TE", "K"):
            model_path = MODEL_DIR / f"xgb_{pos.lower()}.json"
            if model_path.exists() and pos in cols_by_pos:
                m = xgb.XGBRegressor()
                m.load_model(str(model_path))
                _models[pos] = m
                _feature_cols[pos] = cols_by_pos[pos]
        if not _models:
            _load_error = "no models loaded"
            print(f"[ml_projector] {_load_error}", file=sys.stderr)
    except Exception as e:
        # Loud, not silent: a swallowed load error once zeroed every
        # residual production-wide (xgboost 2.x loader vs 3.x artifacts).
        _load_error = f"{type(e).__name__}: {e}"
        print(f"[ml_projector] load failed: {_load_error}", file=sys.stderr)


def ml_predict(features: dict, position: str = None) -> float | None:
    """Predict residual (actual - heuristic) for a player.

    Returns the RESIDUAL to add to heuristic projection, or None if unavailable.
    Caller should do: final_pts = heuristic_pts + ml_predict(features, pos)
    """
    _load_models()

    pos = (position or features.get("position", "")).upper()
    model = _models.get(pos)
    if model is None:
        return None

    cols = _feature_cols.get(pos, [])
    if not cols:
        return None

    try:
        import numpy as np
        X = np.array([[features.get(c, 0) for c in cols]], dtype=np.float32)
        return float(model.predict(X)[0])
    except Exception:
        return None
