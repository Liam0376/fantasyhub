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
| ML residual bias (early) | RB −1.71, QB −0.43, WR −0.44, TE −0.85 | 2025 holdout weeks ≤4, shipped models | 868 | Mean(predicted − actual residual); negative = model shaves points | `scripts/calibrate_residual_bias.py` + bias probe 2026-09-22 |
| ML residual bias (late) | RB −1.22, QB +0.04, WR −0.83, TE −1.03 | 2025 holdout weeks 5+ | 3,776 | Same measure; QB calibrated, RB/TE systematically low | Same as above |
| Bias-corrected ML | 4.777 (TE +0.115 regress) | Same 2025 holdout, constants fit on 2024 val only | 5,141 | Additive correction per pos/regime; FAILS no-regression gate → NOT shipped | `data/models/bias_correction.json` |

## Known gaps (not contradictions)

- Backtest calls the projector without Vegas/weather, so its MAE is not
  production MAE (`scripts/backtest.py:158` vs `scripts/compute_week.py:389`).
- Displayed intervals are heuristic post-scaling, not calibrated —
  see `api/conformal.py` header. Widths frozen for display stability.
- The ML gate was measured on training-distribution features. Phase C
  (train/serve parity, prod-audit-tier2) aligned serve to that
  distribution; the gate itself is unchanged (model + training data
  untouched).
- The residual models are systematically negative-biased (table above) yet
  win MAE via shrinkage — the 3 ship gates measure MAE/pairwise only, so
  bias is invisible to them. Stars feel it most because residual magnitude
  scales with projection level. A per-position/regime additive correction
  was tried and FAILED the no-regression gate (TE +0.115): the bias is
  load-bearing for the MAE win, so it stays. Do not "fix" bias without
  re-running all 3 gates on untouched holdout data.
