#!/usr/bin/env python3
"""Backtest: old naive-average method vs the ported stat_projector
pipeline, scored on real out-of-sample nflverse data. This is the
evidence gate for the projection engine port (spec:
docs/superpowers/specs/2026-09-16-projection-engine-port-design.md) —
run before compute_week.py's new pipeline replaces the old one in
production, per AGENTS.md's "tie every change to a measurable outcome"
rule.

Usage:
    python scripts/backtest.py --season 2025 --weeks 4-18
"""
import argparse
import csv
import io
import json
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
from conformal import qhat, POS_RESIDUALS
from scoring import score_avg_stats, normalize_row_stats
from stat_projector import project_player_stats, COVERED_STATS

STATS_URL = "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{season}.csv"

REF_SCORING = {
    "pass_yd": 0.04, "pass_td": 4.0, "pass_int": -1.0,
    "rush_yd": 0.1, "rush_td": 6.0,
    "rec": 1.0, "rec_yd": 0.1, "rec_td": 6.0,
    "fum_lost": -2.0, "xpm": 1.0, "xpmiss": -1.0,
    "fgm_0_19": 3.0, "fgm_20_29": 3.0, "fgm_30_39": 3.0,
    "fgm_40_49": 4.0, "fgm_50_59": 5.0, "fgm_60_": 6.0, "fgmiss": -1.0,
}


def _spearman(x: list[float], y: list[float]) -> float | None:
    n = len(x)
    if n < 3:
        return None

    def _rank(vals):
        indexed = sorted(range(n), key=lambda i: vals[i])
        ranks = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j < n - 1 and vals[indexed[j]] == vals[indexed[j + 1]]:
                j += 1
            avg_rank = (i + j) / 2.0 + 1
            for k in range(i, j + 1):
                ranks[indexed[k]] = avg_rank
            i = j + 1
        return ranks

    rx, ry = _rank(x), _rank(y)
    d2 = sum((a - b) ** 2 for a, b in zip(rx, ry))
    return 1 - (6 * d2) / (n * (n * n - 1))


def _pairwise(projected: list[float], actual: list[float]) -> float | None:
    n = len(projected)
    if n < 2:
        return None
    correct = total = 0
    for i in range(n):
        for j in range(i + 1, n):
            if actual[i] == actual[j]:
                continue
            total += 1
            if (projected[i] > projected[j]) == (actual[i] > actual[j]):
                correct += 1
            elif projected[i] == projected[j]:
                correct += 0.5
    return correct / total if total > 0 else None


def _picp(projected: list[float], actual: list[float], widths: list[float]) -> float | None:
    if not projected:
        return None
    hits = sum(1 for p, a, w in zip(projected, actual, widths) if p - w <= a <= p + w)
    return hits / len(projected)


def compute_metrics(pairs: list[tuple[float, float]], widths: list[float] | None = None) -> dict:
    if not pairs:
        return {"n": 0}
    projected = [p for p, _ in pairs]
    actual = [a for _, a in pairs]
    n = len(pairs)
    errors = [p - a for p, a in pairs]
    abs_errors = [abs(e) for e in errors]
    result = {"n": n, "mae": round(sum(abs_errors) / n, 3),
              "me": round(sum(errors) / n, 3), "spearman": None, "pairwise": None}
    sp = _spearman(projected, actual)
    if sp is not None:
        result["spearman"] = round(sp, 3)
    pw = _pairwise(projected, actual)
    if pw is not None:
        result["pairwise"] = round(pw, 3)
    if widths and len(widths) == n:
        picp = _picp(projected, actual, widths)
        if picp is not None:
            result["picp"] = round(picp, 3)
    return result


def _fetch(season: int) -> list[dict]:
    r = requests.get(STATS_URL.format(season=season), timeout=30)
    r.raise_for_status()
    return list(csv.DictReader(io.StringIO(r.text)))


def _num(v) -> float:
    try:
        return float(v or 0)
    except (ValueError, TypeError):
        return 0.0




def _old_method(history: list[dict], stat_keys: list[str]) -> dict:
    """Reimplements the pre-port weighted_recent_avg loop for comparison."""
    weights = [2 if i >= len(history) - 3 else 1 for i in range(len(history))]
    total_w = sum(weights) or 1
    return {k: sum(_num(g.get(k)) * w for g, w in zip(history, weights)) / total_w
           for k in stat_keys}


def run_backtest(season: int, weeks: list[int]) -> dict:
    all_rows = _fetch(season)
    reg = [r for r in all_rows if r.get("season_type", "REG") == "REG"
          and int(r.get("season", 0) or 0) == season]

    old_pairs, new_pairs = [], []
    old_widths, new_widths = [], []
    pos_width_factors = {"QB": 1.55, "RB": 1.07, "WR": 1.12, "TE": 0.88, "K": 0.85, "DEF": 0.75}

    for target_week in weeks:
        by_player: dict[str, list] = {}
        actuals: dict[str, dict] = {}
        for row in reg:
            pid = row.get("player_id") or row.get("player_name", "")
            if not pid:
                continue
            try:
                wk = int(row.get("week", 0))
            except (ValueError, TypeError):
                continue
            if wk == target_week:
                actuals[pid] = row
            elif 0 < wk < target_week:
                by_player.setdefault(pid, []).append(row)

        for pid, actual_row in actuals.items():
            pos = (actual_row.get("position") or "").upper()
            covered = COVERED_STATS.get(pos)
            if not covered:
                continue
            history = sorted(by_player.get(pid, []), key=lambda r: int(r.get("week", 0)))
            if not history:
                continue

            old_avg = _old_method(history, covered)
            old_pts = score_avg_stats(old_avg, REF_SCORING, pos)

            # Normalize row stats to floats before passing to project_player_stats
            norm_history = [normalize_row_stats(g) for g in history]
            new_avg = project_player_stats(norm_history, pos)
            new_pts = score_avg_stats(
                {k: new_avg.get(k, 0.0) for k in covered}, REF_SCORING, pos)

            actual_pts = score_avg_stats(
                {k: _num(actual_row.get(k)) for k in covered}, REF_SCORING, pos)
            if actual_pts < 0.5 and pos != "K":
                continue

            old_pairs.append((old_pts, actual_pts))
            new_pairs.append((new_pts, actual_pts))

            # Compute widths using conformal base + heuristic scaling
            def compute_width(pts):
                base_width = qhat(POS_RESIDUALS.get(pos, POS_RESIDUALS["WR"]))
                pf = pos_width_factors.get(pos, 1.0)
                qf = 1.0 if pts <= 12 else min(1.60, 1.0 + (pts - 12) * 0.022)
                return max(3.0, min(14.0, base_width * pf * qf))

            old_widths.append(compute_width(old_pts))
            new_widths.append(compute_width(new_pts))

    return {
        "old": compute_metrics(old_pairs, old_widths),
        "new": compute_metrics(new_pairs, new_widths)
    }


def main():
    parser = argparse.ArgumentParser(description="Backtest old vs new projection method")
    parser.add_argument("--season", type=int, required=True)
    parser.add_argument("--weeks", type=str, default="4-18",
                        help="week range, e.g. 4-18")
    args = parser.parse_args()

    lo, hi = (int(x) for x in args.weeks.split("-"))
    weeks = list(range(lo, hi + 1))

    print(f"Backtesting {args.season} weeks {lo}-{hi}...")
    results = run_backtest(args.season, weeks)

    print(f"\n{'method':<10}{'n':>6}{'mae':>8}{'me':>8}{'spearman':>10}{'pairwise':>10}{'picp':>8}")
    for name in ("old", "new"):
        r = results[name]
        print(f"{name:<10}{r.get('n', 0):>6}{r.get('mae', 0):>8}{r.get('me', 0):>8}"
             f"{r.get('spearman', 0) or 0:>10}{r.get('pairwise', 0) or 0:>10}{r.get('picp', 0) or 0:>8}")

    out_dir = Path(__file__).parent.parent / "data" / "models"
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / f"backtest_{args.season}.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nWrote data/models/backtest_{args.season}.json")


if __name__ == "__main__":
    main()
