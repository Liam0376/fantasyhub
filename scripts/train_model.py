#!/usr/bin/env python3
"""Train XGBoost projection model from training data.

Strict temporal split:
  Train:    2022-2023
  Val:      2024 (early stopping)
  Holdout:  2025 (final gate — never touched during development)

Two modes trained:
  1. Per-position residual models (heuristic + ML correction)
  2. Global direct model (fallback comparison)

Output: data/models/xgb_{pos}.json + data/models/ml_meta.json
"""

import json
import sys
from collections import defaultdict
from pathlib import Path

try:
    import numpy as np
    import xgboost as xgb
except ImportError:
    print("Install: pip install xgboost numpy")
    sys.exit(1)

DATA_PATH = Path(__file__).parent.parent / "data" / "models" / "training_data.jsonl"
MODEL_DIR = Path(__file__).parent.parent / "data" / "models"
META_PATH = MODEL_DIR / "ml_meta.json"

# Shared features (all positions)
BASE_FEATURES = [
    "games_played", "week",
    "curr_ppg_wavg", "prior_ppg", "prior_games",
    "implied_total", "spread", "over_under",
    "wind_mph", "temp_f", "is_home",
    "opp_pts_allowed",
    "pbp_target_share_wavg", "pbp_rush_share_wavg", "pbp_air_yards_share_wavg",
    "pbp_snap_share_wavg", "pbp_redzone_targets_wavg", "pbp_redzone_carries_wavg",
    "prior_pbp_target_share", "prior_pbp_rush_share", "prior_pbp_snap_share",
    "snap_pct_wavg", "years_exp", "draft_number",
    "ppg_std", "ppg_trend", "ppg_max", "ppg_min",
    "heuristic_pts",
]

# Position-specific stat features
POS_FEATURES = {
    "QB": BASE_FEATURES + [
        "curr_passing_yards_wavg", "curr_passing_tds_wavg",
        "curr_rushing_yards_wavg", "curr_rushing_tds_wavg",
        "curr_passing_epa_wavg", "curr_passing_cpoe_wavg",
        "curr_sacks_suffered_wavg", "curr_passing_interceptions_wavg",
        "curr_fumbles_lost_total_wavg",
    ],
    "RB": BASE_FEATURES + [
        "curr_rushing_yards_wavg", "curr_rushing_tds_wavg",
        "curr_carries_wavg", "curr_receiving_yards_wavg",
        "curr_receiving_tds_wavg", "curr_receptions_wavg",
        "curr_fumbles_lost_total_wavg",
    ],
    "WR": BASE_FEATURES + [
        "curr_receiving_yards_wavg", "curr_receiving_tds_wavg",
        "curr_receptions_wavg", "curr_targets_wavg",
        "curr_receiving_air_yards_wavg", "curr_wopr_wavg",
        "curr_rushing_yards_wavg",
    ],
    "TE": BASE_FEATURES + [
        "curr_receiving_yards_wavg", "curr_receiving_tds_wavg",
        "curr_receptions_wavg", "curr_targets_wavg",
        "curr_receiving_air_yards_wavg",
    ],
    "K": BASE_FEATURES + [],
}

POSITIONS = ["QB", "RB", "WR", "TE", "K"]
HEURISTIC_MAE = 4.563  # corrected baseline (father K-zero bug fixed)


def load_data() -> list[dict]:
    rows = []
    with open(DATA_PATH) as f:
        for line in f:
            rows.append(json.loads(line))
    return rows


def to_arrays(rows: list[dict], feature_cols: list[str], target: str = "residual"):
    X = np.array([[r.get(c, 0) for c in feature_cols] for r in rows], dtype=np.float32)
    y = np.array([r.get(target, 0) for r in rows], dtype=np.float32)
    return X, y


def mae(y_true, y_pred):
    return float(np.mean(np.abs(y_true - y_pred)))


def pairwise_accuracy(y_true, y_pred):
    n = len(y_true)
    if n < 2:
        return 0.5
    correct = total = 0
    rng = np.random.default_rng(42)
    pairs = min(50000, n * (n - 1) // 2)
    for _ in range(pairs):
        i, j = rng.integers(0, n, size=2)
        if i == j or y_true[i] == y_true[j]:
            continue
        total += 1
        if (y_pred[i] > y_pred[j]) == (y_true[i] > y_true[j]):
            correct += 1
    return correct / total if total else 0.5


def train_position_model(pos: str, train: list[dict], val: list[dict]) -> tuple:
    """Train residual model for one position. Returns (model, feature_cols)."""
    feature_cols = POS_FEATURES.get(pos, BASE_FEATURES)

    X_train, y_train = to_arrays(train, feature_cols, target="residual")
    X_val, y_val = to_arrays(val, feature_cols, target="residual")

    model = xgb.XGBRegressor(
        objective="reg:pseudohubererror",  # Huber loss for fat tails
        huber_slope=1.5,
        max_depth=5,
        n_estimators=500,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.7,
        min_child_weight=10,
        reg_lambda=1.0,
        random_state=42,
        early_stopping_rounds=30,
        eval_metric="mae",
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    return model, feature_cols


def main():
    print("Loading training data...")
    all_rows = load_data()
    print(f"  {len(all_rows)} total rows")

    train_all = [r for r in all_rows if r["season"] in (2022, 2023)]
    val_all = [r for r in all_rows if r["season"] == 2024]
    holdout_all = [r for r in all_rows if r["season"] == 2025]
    print(f"  Train: {len(train_all)}, Val: {len(val_all)}, Holdout: {len(holdout_all)}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # --- Per-position residual models ---
    print("\n=== Training Per-Position Residual Models ===")
    all_models = {}
    all_feature_cols = {}
    pos_results = {}

    # Collect holdout predictions for overall metrics
    holdout_actual = []
    holdout_pred_ml = []
    holdout_pred_heuristic = []

    for pos in POSITIONS:
        train_pos = [r for r in train_all if r["position"] == pos]
        val_pos = [r for r in val_all if r["position"] == pos]
        holdout_pos = [r for r in holdout_all if r["position"] == pos]

        if len(train_pos) < 50:
            print(f"  {pos}: skipped (only {len(train_pos)} training rows)")
            continue

        print(f"\n  {pos}: train={len(train_pos)}, val={len(val_pos)}, holdout={len(holdout_pos)}")

        model, feature_cols = train_position_model(pos, train_pos, val_pos)
        print(f"    Best iteration: {model.best_iteration}")

        # Evaluate on holdout
        X_ho, y_residual = to_arrays(holdout_pos, feature_cols, target="residual")
        pred_residual = model.predict(X_ho)

        # Final prediction = heuristic + predicted residual
        heuristic_pts = np.array([r.get("heuristic_pts", 0) for r in holdout_pos], dtype=np.float32)
        actual_pts = np.array([r.get("actual_points", 0) for r in holdout_pos], dtype=np.float32)
        pred_pts = heuristic_pts + pred_residual

        ml_mae = mae(actual_pts, pred_pts)
        h_mae = mae(actual_pts, heuristic_pts)

        # Early season
        early_idx = [i for i, r in enumerate(holdout_pos) if r.get("week", 99) <= 4]
        early_ml = mae(actual_pts[early_idx], pred_pts[early_idx]) if early_idx else 0
        early_h = mae(actual_pts[early_idx], heuristic_pts[early_idx]) if early_idx else 0

        delta = ml_mae - h_mae
        print(f"    ML MAE: {ml_mae:.3f} | Heuristic MAE: {h_mae:.3f} | Delta: {delta:+.3f}")
        print(f"    Early-season: ML={early_ml:.3f} | H={early_h:.3f} | Delta: {early_ml - early_h:+.3f}")

        # Feature importance
        importance = dict(zip(feature_cols, model.feature_importances_.tolist()))
        top5 = sorted(importance.items(), key=lambda x: -x[1])[:5]
        print(f"    Top 5: {', '.join(f'{k}={v:.3f}' for k, v in top5)}")

        # Save model
        model_path = MODEL_DIR / f"xgb_{pos.lower()}.json"
        model.save_model(str(model_path))

        pos_results[pos] = {
            "ml_mae": ml_mae, "heuristic_mae": h_mae, "delta": delta,
            "early_ml_mae": early_ml, "early_h_mae": early_h,
            "n": len(holdout_pos), "best_iteration": model.best_iteration,
            "feature_importance": dict(sorted(importance.items(), key=lambda x: -x[1])),
        }
        all_models[pos] = model
        all_feature_cols[pos] = feature_cols

        holdout_actual.extend(actual_pts.tolist())
        holdout_pred_ml.extend(pred_pts.tolist())
        holdout_pred_heuristic.extend(heuristic_pts.tolist())

    # Overall metrics
    holdout_actual = np.array(holdout_actual)
    holdout_pred_ml = np.array(holdout_pred_ml)
    holdout_pred_heuristic = np.array(holdout_pred_heuristic)

    overall_ml_mae = mae(holdout_actual, holdout_pred_ml)
    overall_h_mae = mae(holdout_actual, holdout_pred_heuristic)
    overall_pairwise = pairwise_accuracy(holdout_actual, holdout_pred_ml)
    overall_h_pairwise = pairwise_accuracy(holdout_actual, holdout_pred_heuristic)

    print(f"\n=== Overall Holdout (2025) ===")
    print(f"  ML MAE:        {overall_ml_mae:.3f}")
    print(f"  Heuristic MAE: {overall_h_mae:.3f}")
    print(f"  Delta:         {overall_ml_mae - overall_h_mae:+.3f}")
    print(f"  Pairwise:      {overall_pairwise:.1%}")

    # Gate check
    print(f"\n=== Gate Check ===")
    gates_passed = 0
    gates_total = 3

    if overall_ml_mae < overall_h_mae:
        print(f"  ✓ Overall MAE {overall_ml_mae:.3f} < heuristic {overall_h_mae:.3f}")
        gates_passed += 1
    else:
        print(f"  ✗ Overall MAE {overall_ml_mae:.3f} >= heuristic {overall_h_mae:.3f}")

    positions_regressed = [p for p, r in pos_results.items() if r["delta"] > 0.05]
    if not positions_regressed:
        print(f"  ✓ No position regressed >0.05 MAE")
        gates_passed += 1
    else:
        print(f"  ✗ Positions regressed: {positions_regressed}")

    if overall_pairwise > overall_h_pairwise:
        print(f"  ✓ Pairwise {overall_pairwise:.1%} > heuristic {overall_h_pairwise:.1%}")
        gates_passed += 1
    else:
        print(f"  ✗ Pairwise {overall_pairwise:.1%} <= heuristic {overall_h_pairwise:.1%}")

    ship = gates_passed == gates_total
    print(f"\n  {'✓ ALL GATES PASSED — ship ML' if ship else '✗ GATES FAILED — keep heuristic'}")

    # Save metadata
    meta = {
        "mode": "per_position_residual",
        "overall_ml_mae": overall_ml_mae,
        "overall_heuristic_mae": overall_h_mae,
        "overall_pairwise": overall_pairwise,
        "gates_passed": gates_passed,
        "gates_total": gates_total,
        "ship": ship,
        "per_position": pos_results,
        "feature_cols_by_position": all_feature_cols,
        "train_seasons": [2022, 2023],
        "val_season": 2024,
        "holdout_season": 2025,
    }
    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"\nMetadata saved to {META_PATH}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
