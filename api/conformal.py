"""Split-conformal interval half-width. Ported from the father project
(football-sports-analytics/src/ffanalytics/conformal.py) — backtested,
frozen constants. See stat_projector.py's header for the coverage numbers
these residual tables were measured against (v2, 2026-09-15: overall 84.2%).

The raw qhat gives a formally calibrated interval (Vovk et al. 2005), but
api/stat_projector.py scales it by position/point-magnitude factors, which
breaks the formal coverage guarantee — the displayed intervals are
heuristic, not calibrated. Widths are frozen for display stability; do not
retune without a new backtest.
"""
import math

# Empirical backtested residual distributions by position (2024-2025
# out-of-sample). Used for split-conformal prediction intervals.
POS_RESIDUALS = {
    "QB": [1.2, 2.5, 3.8, 5.1, 6.4, 7.8, 9.2, 10.5, 12.1],
    "RB": [0.8, 1.9, 3.2, 4.3, 5.5, 6.9, 8.4, 9.8, 11.2],
    "WR": [0.7, 1.8, 3.0, 4.4, 5.8, 7.2, 8.8, 10.2, 11.9],
    "TE": [0.5, 1.2, 2.2, 3.4, 4.8, 6.1, 7.5, 8.9, 10.4],
    "K": [0.5, 1.1, 2.1, 3.2, 4.2, 5.5, 6.8, 8.0, 9.5],
}


def qhat(residuals: list[float], alpha: float = 0.2) -> float:
    if not residuals:
        raise ValueError("residuals must be non-empty to compute qhat")
    abs_residuals = sorted(abs(r) for r in residuals)
    n = len(abs_residuals)
    rank = math.ceil((n + 1) * (1 - alpha))
    rank = min(rank, n)
    return abs_residuals[rank - 1]
