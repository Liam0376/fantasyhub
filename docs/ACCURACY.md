# Accuracy claims

Every number below is measured, with provenance. They disagree with each
other because they measure different things — read the Scope column
before comparing. Do not "reconcile" them by editing; re-measure via
the listed gate.

| Claim | Value | Measured on | n | Scope | Source |
|---|---|---|---|---|---|
| Heuristic MAE (port gate) | 4.563 | Father backtest, weeks 4-18, true scoring | 10,351 | Heuristic only, pre-ML | `api/stat_projector.py` header |
| Heuristic corr / pairwise | 0.648 / 74.1% | Same as above | 10,351 | Same as above | `api/stat_projector.py` header |
| Displayed-interval coverage (father) | 82.1% | Same as above | 10,351 | Raw qhat intervals | `api/stat_projector.py` header |
| Displayed-interval coverage (v2) | 84.2% | 2026-09-15, displayed widths after pos x magnitude scaling | — | Heuristic, display-scaled (not formally calibrated) | `api/conformal.py` header |
| This-repo backtest, new pipeline | MAE 4.728, PICP 0.898 | `scripts/backtest.py --season 2025 --weeks 4-18` | 4,251 | Heuristic only, no Vegas/weather (known gap) | `data/models/backtest_2025.json` |
| This-repo backtest, old method | MAE 4.828, PICP 0.897 | Same run | 4,251 | Naive-average baseline | `data/models/backtest_2025.json` |
| ML holdout gate, heuristic | 4.753 | 2025 holdout, training features | per-pos n in meta | Heuristic baseline for residual gate | `data/models/ml_meta.json` |
| ML holdout gate, ML+heuristic | 4.541 | Same holdout | same | Shipped residual models (3/3 gates, ship:true) | `data/models/ml_meta.json` |

## Known gaps (not contradictions)

- Backtest calls the projector without Vegas/weather, so its MAE is not
  production MAE (`scripts/backtest.py:158` vs `scripts/compute_week.py:389`).
- Displayed intervals are heuristic post-scaling, not calibrated —
  see `api/conformal.py` header. Widths frozen for display stability.
- The ML gate was measured on training-distribution features. Phase C
  (train/serve parity, prod-audit-tier2) aligned serve to that
  distribution; the gate itself is unchanged (model + training data
  untouched).
