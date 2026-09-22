"""Tests for scripts/grade_weekly_predictions.py (option C evidence base).

Pure-math tests use hand-computed fixtures. No network, no repo data.
"""
import json
import sys
import os
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from grade_weekly_predictions import (
    grade_rows, is_week_final, scheduled_teams, already_graded,
    detect_target_week, TOP_TIER_CUTOFF,
)


def _p(pid, pts, ml, pos="RB", actual=None):
    return {"player_id": pid, "player_name": pid, "position": pos,
            "projected_points": pts, "ml_adjustment": ml}


def test_grade_math_hand_computed():
    # Stored projected_points is FINAL (heuristic + ml); heuristic base is
    # backed out as h - ml. p_a: base=22, ml_pts=20, actual=19.
    # p_b: ml None -> heuristic-only. p_c: no actual -> skipped.
    players = [_p("a", 20.0, -2.0), _p("b", 10.0, None), _p("c", 5.0, 1.0)]
    actual = {"a": 19.0, "b": 12.0}
    out = grade_rows(players, actual)
    assert out["n_skipped"] == 1
    all_s = out["splits"]["ALL"]
    assert all_s["n"] == 2
    assert all_s["mae_h"] == 2.5  # (|22-19| + |10-12|) / 2
    assert all_s["bias_h"] == 0.5  # ((22-19) + (10-12)) / 2
    assert all_s["n_ml"] == 1
    assert all_s["mae_ml"] == 1.0  # |20-19|
    assert all_s["bias_ml"] == 1.0  # 20 - 19


def test_grade_bias_signs():
    # bias = mean(pts - actual): positive = over-projects.
    # p_a: base=30 err +12; ml_pts=25 err +7. p_b: base=20 err +12; ml=15 +7.
    players = [_p("a", 25.0, -5.0), _p("b", 15.0, -5.0)]
    actual = {"a": 18.0, "b": 8.0}
    out = grade_rows(players, actual)["splits"]["ALL"]
    assert out["bias_h"] == 12.0
    assert out["bias_ml"] == 7.0
    assert out["mae_h"] == 12.0
    assert out["mae_ml"] == 7.0


def test_grade_top_tier_split():
    players = [_p("star", 20.0, -1.0), _p("jag", 5.0, 0.5)]
    actual = {"star": 22.0, "jag": 4.0}
    out = grade_rows(players, actual)
    assert out["splits"]["TOP"]["n"] == 1
    assert out["splits"]["RB"]["n"] == 2
    assert TOP_TIER_CUTOFF == 17.0


def test_finality_gate():
    sched = [{"season": "2026", "game_type": "REG", "week": "2",
              "away_team": "A", "home_team": "B"},
             {"season": "2026", "game_type": "REG", "week": "2",
              "away_team": "C", "home_team": "D"}]
    ok, _ = is_week_final(sched, {"A", "B", "C", "D"}, 2026, 2)
    assert ok is True
    # MNF missing: 3/4 teams -> not final, names the missing.
    ok2, reason = is_week_final(sched, {"A", "B", "C"}, 2026, 2)
    assert ok2 is False
    assert "D" in reason
    # Empty schedule -> never final.
    ok3, _ = is_week_final([], {"A"}, 2026, 2)
    assert ok3 is False


def test_scheduled_teams_excludes_byes():
    # why: bye weeks change the game count; the team SET is the exact
    # finality signal. A 30-team week with 2 on bye is final at 30/30,
    # not "missing" 2 teams.
    sched = [{"season": "2026", "game_type": "REG", "week": "5",
              "away_team": "A", "home_team": "B"}]
    assert scheduled_teams(sched, 2026, 5) == {"A", "B"}
    assert scheduled_teams(sched, 2026, 6) == set()


def test_detect_skips_graded_and_missing(tmp_path):
    (tmp_path / "2026_week_02.json").write_text(json.dumps({"players": []}))
    latest = {"season": 2026, "week": 2}
    # Earliest-first: week 2 (only file, ungraded) is the target.
    assert detect_target_week([], proj_dir=tmp_path, latest=latest) == (2026, 2)
    hist = [{"season": 2026, "week": 2}]
    assert already_graded(hist, 2026, 2) is True
    assert already_graded(hist, 2026, 1) is False
    # Week 2 graded, week 1 file missing -> nothing to do.
    assert detect_target_week(hist, proj_dir=tmp_path,
                              latest=latest) == (None, None)
    (tmp_path / "2026_week_01.json").write_text(json.dumps({"players": []}))
    # Week 1 backfills before any newer ungraded week.
    assert detect_target_week(hist, proj_dir=tmp_path,
                              latest=latest) == (2026, 1)
    # Earliest-first with both present and nothing graded: week 1, so a
    # non-final latest week never starves earlier backfill.
    assert detect_target_week([], proj_dir=tmp_path,
                              latest=latest) == (2026, 1)
