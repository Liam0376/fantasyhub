import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from conformal import qhat, POS_RESIDUALS


def test_qhat_known_values():
    # 9 QB residuals, alpha=0.2 -> rank = ceil((9+1)*0.8) = 8th smallest abs value
    residuals = [1.2, 2.5, 3.8, 5.1, 6.4, 7.8, 9.2, 10.5, 12.1]
    assert qhat(residuals, alpha=0.2) == 10.5


def test_qhat_empty_raises():
    try:
        qhat([])
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_pos_residuals_has_all_positions():
    for pos in ("QB", "RB", "WR", "TE", "K"):
        assert pos in POS_RESIDUALS
        assert len(POS_RESIDUALS[pos]) > 0


if __name__ == "__main__":
    test_qhat_known_values()
    test_qhat_empty_raises()
    test_pos_residuals_has_all_positions()
    print("OK")
