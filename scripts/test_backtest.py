# scripts/test_backtest.py
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from backtest import compute_metrics, _spearman, _pairwise, _picp


def test_compute_metrics_perfect_prediction():
    pairs = [(10.0, 10.0), (20.0, 20.0), (5.0, 5.0)]
    result = compute_metrics(pairs)
    assert result["mae"] == 0.0
    assert result["me"] == 0.0
    assert result["pairwise"] == 1.0


def test_compute_metrics_empty():
    assert compute_metrics([]) == {"n": 0}


def test_pairwise_ranks_correctly():
    projected = [20.0, 10.0, 5.0]
    actual = [20.0, 10.0, 15.0]
    # pair (0,1): both agree 0 > 1 -> right
    # pair (0,2): both agree 0 > 2 -> right
    # pair (1,2): proj says 1 > 2, actual says 2 > 1 -> wrong
    result = _pairwise(projected, actual)
    assert abs(result - 2 / 3) < 0.001


def test_picp_counts_coverage_hits():
    projected = [10.0, 10.0]
    actual = [11.0, 20.0]
    widths = [2.0, 2.0]
    # first hit (11 within [8,12]), second miss (20 outside [8,12])
    assert _picp(projected, actual, widths) == 0.5


if __name__ == "__main__":
    test_compute_metrics_perfect_prediction()
    test_compute_metrics_empty()
    test_pairwise_ranks_correctly()
    test_picp_counts_coverage_hits()
    print("OK")
