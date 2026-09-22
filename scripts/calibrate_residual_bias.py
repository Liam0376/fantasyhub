#!/usr/bin/env python3
"""Fit per-position/regime residual bias correction (user-caught live bug).

Finding (2026-09-22, verified on the gate's own 2025 holdout): the shipped
XGBoost residual models are systematically negative-biased — RB early
weeks bias -1.71, overall -0.85 — while MAE still beats the heuristic
(variance reduction > bias cost). The 3 ship gates measure MAE/pairwise
only, so bias is invisible to them. Stars feel it most because residual
magnitude scales with projection level (Gibbs -4.1, Taylor -1.9 in 2026-W2).

Fix: additive correction, corrected = predicted - bias[pos][regime],
regime = week <= 4 (early) else late — mirroring train_model.py:208.
Constants fit on 2024 VAL ONLY (never the 2025 gate data), then the 3 ship
gates re-run on 2025 holdout with corrected residuals. Report-only: prints
PASS/FAIL per gate; changes nothing on disk except bias_correction.json.

Usage:
    python scripts/calibrate_residual_bias.py [--write/--no-write]

Exit 0 always (verdict in stdout + json); promotion is a human decision.
"""
import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "api"))
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from ml_projector import _load_models, _models, _feature_cols  # noqa: E402
from train_model import mae, pairwise_accuracy  # noqa: E402 (metric parity with gates)

DATA_PATH = REPO_ROOT / "data" / "models" / "training_data.jsonl"
OUT_PATH = REPO_ROOT / "data" / "models" / "bias_correction.json"
POSITIONS = ("QB", "RB", "WR", "TE")
REGIMES = ("early", "late")


def regime_of(week):
    try:
        w = int(week)
    except (TypeError, ValueError):
        w = 99
    return "early" if w <= 4 else "late"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action=argparse.BooleanOptionalAction, default=True)
    args = ap.parse_args()

    _load_models()
    rows = [json.loads(l) for l in open(DATA_PATH)]
    val = [r for r in rows if r.get("season") == 2024]
    holdout = [r for r in rows if r.get("season") == 2025]
    print(f"val rows: {len(val)}, holdout rows: {len(holdout)}")

    # Fit bias on 2024 val: mean(predicted - actual residual).
    bias = {}
    for pos in POSITIONS:
        model = _models.get(pos)
        cols = _feature_cols.get(pos, [])
        if model is None or not cols:
            print(f"  {pos}: model missing, skipping")
            continue
        bias[pos] = {}
        for regime in REGIMES:
            rs = [r for r in val
                  if (r.get("position") or "").upper() == pos
                  and regime_of(r.get("week")) == regime]
            if not rs:
                bias[pos][regime] = {"bias": 0.0, "n": 0}
                continue
            X = np.array([[r.get(c, 0) for c in cols] for r in rs], dtype=np.float32)
            pred = model.predict(X)
            actual = np.array([r.get("residual", 0) for r in rs], dtype=np.float32)
            b = float(np.mean(pred - actual))
            bias[pos][regime] = {"bias": round(b, 4), "n": len(rs)}
            print(f"  {pos} {regime}: bias={b:+.4f} (n={len(rs)})")

    payload = {"version": 1,
               "method": "corrected = predicted - bias[pos][regime], regime = week<=4 early else late",
               "fitted_on": "2024 val (early-stopping split, never gate data)",
               "constants": bias}
    if args.write:
        OUT_PATH.write_text(json.dumps(payload, indent=2))
        print(f"wrote {OUT_PATH}")

    # Re-run the 3 ship gates on 2025 holdout with corrected residuals.
    corr_of = {(pos, reg): bias.get(pos, {}).get(reg, {}).get("bias", 0.0)
               for pos in POSITIONS for reg in REGIMES}
    all_actual, all_pred_ml, all_pred_h = [], [], []
    pos_delta = {}
    for pos in POSITIONS:
        model = _models.get(pos)
        cols = _feature_cols.get(pos, [])
        rs = [r for r in holdout if (r.get("position") or "").upper() == pos]
        if not rs or model is None:
            continue
        X = np.array([[r.get(c, 0) for c in cols] for r in rs], dtype=np.float32)
        raw = model.predict(X)
        h = np.array([r.get("heuristic_pts", 0) for r in rs], dtype=np.float32)
        a = np.array([r.get("actual_points", 0) for r in rs], dtype=np.float32)
        corr = np.array([corr_of[(pos, regime_of(r.get("week")))] for r in rs],
                        dtype=np.float32)
        pred_corr = h + raw - corr
        pred_raw = h + raw
        ml_mae = mae(a, pred_corr)
        h_mae = mae(a, h)
        raw_mae = mae(a, pred_raw)
        print(f"  {pos}: H={h_mae:.3f} rawML={raw_mae:.3f} corrML={ml_mae:.3f} "
              f"delta={ml_mae - h_mae:+.3f} (n={len(rs)})")
        pos_delta[pos] = ml_mae - h_mae
        all_actual.extend(a.tolist())
        all_pred_ml.extend(pred_corr.tolist())
        all_pred_h.extend(h.tolist())

    all_actual = np.array(all_actual)
    overall_ml = mae(all_actual, np.array(all_pred_ml))
    overall_h = mae(all_actual, np.array(all_pred_h))
    pw = pairwise_accuracy(all_actual, np.array(all_pred_ml))
    pw_h = pairwise_accuracy(all_actual, np.array(all_pred_h))
    print(f"\nOverall: ML={overall_ml:.3f} H={overall_h:.3f} "
          f"pairwise={pw:.1%} vs H {pw_h:.1%}")
    gates = {"overall_mae": overall_ml < overall_h,
             "no_regression": not [p for p, d in pos_delta.items() if d > 0.05],
             "pairwise": pw > pw_h}
    for k, v in gates.items():
        print(f"  {'PASS' if v else 'FAIL'} {k}")
    payload["gate_rerun_2025"] = {
        "overall_ml_mae": overall_ml, "overall_h_mae": overall_h,
        "pairwise": pw, "heuristic_pairwise": pw_h,
        "pos_delta": pos_delta, "gates": gates,
        "all_pass": all(gates.values())}
    if args.write:
        OUT_PATH.write_text(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
