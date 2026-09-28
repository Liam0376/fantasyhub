# Accuracy claims

Every number below is measured, with provenance. They disagree with each
other because they measure different things — read the Scope column
before comparing. Do not "reconcile" them by editing; re-measure via
the listed gate.

| Claim | Value | Measured on | n | Scope | Source |
|---|---|---|---|---|---|
| Heuristic MAE (port gate) | 4.563 | Father backtest, weeks 4-18, true scoring | 10,351 | Heuristic only, pre-ML | `api/stat_projector.py` header |
| Heuristic corr / pairwise | 0.648 / 74.1% | Same as above | 10,351 | Same as above | `api/stat_projector.py` header |
| Displayed-interval coverage (father v1) | 82.1% | 2025 holdout (2024 calibration), displayed widths after pos x point-factor scaling | 5,425 | Displayed v1-scaled widths; raw qhat was 80.5% on the same sample | father `data/models/coverage_2025.json` + `src/ffanalytics/stat_projector.py:130-143` |
| Displayed-interval coverage (v2) | 84.2% | 2026-09-15, 2025 holdout rebuilt true-OOS at shipped v2 factors, displayed widths | 5,239 | Heuristic, display-scaled (not formally calibrated); factors identical in this repo (`api/conformal.py:29`) | father `src/ffanalytics/stat_projector.py:144-147` + `src/ffanalytics/projection.py:14-23` |
| This-repo backtest, new pipeline | MAE 4.728, PICP 0.898 | `scripts/backtest.py --season 2025 --weeks 4-18` | 4,251 | Heuristic only, no Vegas/weather (known gap); PICP sample drops rows with actual < 0.5 (non-K) | `data/models/backtest_2025.json` |
| This-repo backtest, old method | MAE 4.828, PICP 0.897 | Same run | 4,251 | Naive-average baseline | `data/models/backtest_2025.json` |
| ML holdout gate, heuristic | 4.753 | 2025 holdout, training features | per-pos n in meta | Heuristic baseline for residual gate | `data/models/ml_meta.json` |
| ML holdout gate, ML+heuristic | 4.541 | Same holdout | same | Shipped residual models (3/3 gates, ship:true) | `data/models/ml_meta.json` |
| ML residual bias (early) | RB −1.71, QB −0.43, WR −0.44, TE −0.85 | 2025 holdout weeks ≤4, shipped models | 868 | Mean(predicted − actual residual); negative = model shaves points | `scripts/calibrate_residual_bias.py` + bias probe 2026-09-22 |
| ML residual bias (late) | RB −1.22, QB +0.04, WR −0.83, TE −1.03 | 2025 holdout weeks 5+ | 3,776 | Same measure; QB calibrated, RB/TE systematically low | Same as above |
| Bias-corrected ML | 4.777 (TE +0.115 regress) | Same 2025 holdout (QB/RB/WR/TE only; no K constants), constants fit on 2024 val only | 4,644 | Additive correction per pos/regime; FAILS no-regression gate → NOT shipped | `data/models/bias_correction.json` |
| Live grades, W1 (heuristic only) | OFFENSE MAE 4.777, bias −0.543 (ALL 1.667, −0.192) | 2026 Week 1 final actuals (REF-scored) vs `2026_week_01.json` | 389 offense (1,117 all) | ML off; ALL diluted by ~728 IDP rows scoring 0 vs 0; TOP-24 MAE 8.397, bias −0.233 | `data/grades/weekly.json` via `scripts/grade_weekly_predictions.py` |
| Live grades, W2 (ML on) | OFFENSE ML 4.326 vs paired H 4.672, bias +0.084 (H +0.832); TOP ML 9.197 vs H 8.290, bias −2.832 | 2026 Week 2 final actuals (REF-scored) vs `2026_week_02.json` | 391 offense / 390 ML (1,096 all) | `mae_h_ml` is the heuristic MAE on the same ML rows (cross-denominator trap: ALL `mae_h` covers ~705 IDP 0-vs-0 rows); ML clears MAE+bias on OFFENSE, regresses on TOP-24 stars | Same |

## Known gaps (not contradictions)

- Backtest calls the projector without Vegas/weather, so its MAE is not
  production MAE (`scripts/backtest.py:158` vs `scripts/compute_week.py:444`).
- Displayed intervals are heuristic post-scaling, not calibrated —
  see `api/conformal.py` header. Widths frozen for display stability.
- The ML gate was measured on training-distribution features. Phase C
  (train/serve parity, prod-audit-tier2) aligned serve to that
  distribution; the gate itself is unchanged (model + training data
  untouched).
- The residual models are systematically negative-biased (table above) yet
  win MAE via shrinkage — the 3 ship gates measure MAE/pairwise only, so
  bias is invisible to them. Stars feel it most because residual magnitude
  scales with projection level. Live W2 grades corroborate: TOP-24 bias
  −2.83 with ML vs −1.68 heuristic on identical rows. A per-position/regime
  additive correction was tried and FAILED the no-regression gate
  (TE +0.115): the bias is load-bearing for the MAE win, so it stays. Do
  not "fix" bias without re-running all 3 gates on untouched holdout data.
- Live weekly grades now score actuals with the same reference scoring
  as the projections for modeled positions (QB/RB/WR/TE/K), so absolute
  MAE carries no scoring offset there — the old PPR-only actuals bug
  inflated kicker bias to +7.2; it now grades −0.94 (W1) / −0.10 (W2).
  Unmodeled IDP/DEF rows still fall back to nflverse PPR and grade
  0 vs 0, diluting the ALL split only (read OFFENSE, not ALL).
  Per-player ML-vs-heuristic deltas share the same base either way.
  A week grades only when final (all scheduled teams have actuals);
  partial weeks are skipped, never backfilled with projections.
