"""Tests for scoring.py: safe_float, norm_name, score_avg_stats, bracket_points, score_team_def."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from scoring import safe_float, norm_name, roster_group, score_avg_stats, score_team_def, _bracket_points, describe_scoring, normalize_row_stats, REF_SCORING


def test_safe_float():
    assert safe_float(3.5) == 3.5
    assert safe_float("7") == 7.0
    assert safe_float(None) == 0.0
    assert safe_float("") == 0.0
    assert safe_float("abc") == 0.0
    assert safe_float("abc", default=-1.0) == -1.0
    assert safe_float(0) == 0.0


def test_norm_name():
    assert norm_name("Patrick Mahomes II") == "patrick mahomes"
    assert norm_name("Travis Kelce") == "travis kelce"
    assert norm_name("Marvin Harrison Jr.") == "marvin harrison"
    assert norm_name("") == ""
    assert norm_name(None) == ""
    assert norm_name("D'Andre Swift") == "dandre swift"


def test_roster_group():
    assert roster_group("DE") == "DL"
    assert roster_group("DT") == "DL"
    assert roster_group("CB") == "DB"
    assert roster_group("FS") == "DB"
    assert roster_group("MLB") == "LB"
    assert roster_group("QB") == "QB"
    assert roster_group("") == "UNK"
    assert roster_group(None) == "UNK"


def test_score_avg_stats_basic():
    avg = {"passing_yards": 250.0, "passing_tds": 2.0, "passing_interceptions": 0.5}
    scoring = {"pass_yd": 0.04, "pass_td": 4.0, "pass_int": -1.0}
    pts = score_avg_stats(avg, scoring, "QB")
    expected = 250 * 0.04 + 2 * 4.0 + 0.5 * -1.0
    assert abs(pts - expected) < 0.01


def test_score_avg_stats_ppr():
    avg = {"receptions": 5.0, "receiving_yards": 80.0, "receiving_tds": 0.5}
    scoring = {"rec": 1.0, "rec_yd": 0.1, "rec_td": 6.0}
    pts = score_avg_stats(avg, scoring, "WR")
    expected = 5 * 1.0 + 80 * 0.1 + 0.5 * 6.0
    assert abs(pts - expected) < 0.01


def test_score_avg_stats_empty():
    assert score_avg_stats({}, {}, "QB") == 0.0
    assert score_avg_stats({"passing_yards": 300}, None, "QB") == 0.0


def test_score_avg_stats_te_premium():
    avg = {"receptions": 6.0}
    scoring = {"rec": 1.0, "bonus_rec_te": 0.5}
    pts = score_avg_stats(avg, scoring, "TE")
    assert abs(pts - (6 * 1.0 + 6 * 0.5)) < 0.01


def test_bracket_points():
    scoring = {"pts_allow_0": 10.0, "pts_allow_1_6": 7.0,
               "pts_allow_7_13": 4.0, "pts_allow_14_20": 1.0,
               "pts_allow_35p": -4.0}
    assert _bracket_points(scoring, "pts_allow_", 0) == 10.0
    assert _bracket_points(scoring, "pts_allow_", 3) == 7.0
    assert _bracket_points(scoring, "pts_allow_", 10) == 4.0
    assert _bracket_points(scoring, "pts_allow_", 40) == -4.0
    assert _bracket_points(scoring, "pts_allow_", 25) == 0.0


def test_bracket_points_fractional():
    scoring = {"pts_allow_7_13": 4.0, "pts_allow_14_20": 1.0}
    assert _bracket_points(scoring, "pts_allow_", 13.5) == 1.0


def test_score_team_def():
    avg = {"sacks": 2.5, "ints": 1.0, "pts_allowed": 17.0}
    scoring = {"sack": 1.0, "int": 2.0, "pts_allow_14_20": 1.0}
    pts = score_team_def(avg, scoring)
    expected = 2.5 * 1.0 + 1.0 * 2.0 + 1.0
    assert abs(pts - expected) < 0.01


def test_score_team_def_empty():
    assert score_team_def({}, {}) == 0.0


def test_describe_scoring():
    assert "PPR" in describe_scoring({"rec": 1.0})
    assert "Half PPR" in describe_scoring({"rec": 0.5})
    assert "Standard" in describe_scoring({"rec": 0})


def test_normalize_row_stats():
    row = {"passing_yards": "250.5", "rushing_yards": "45", "name": "Player"}
    out = normalize_row_stats(row)
    assert out["passing_yards"] == 250.5
    assert out["rushing_yards"] == 45.0
    assert out["name"] == "Player"


if __name__ == "__main__":
    test_safe_float()
    test_norm_name()
    test_roster_group()
    test_score_avg_stats_basic()
    test_score_avg_stats_ppr()
    test_score_avg_stats_empty()
    test_score_avg_stats_te_premium()
    test_bracket_points()
    test_bracket_points_fractional()
    test_score_team_def()
    test_score_team_def_empty()
    test_describe_scoring()
    test_normalize_row_stats()
    print("OK")
