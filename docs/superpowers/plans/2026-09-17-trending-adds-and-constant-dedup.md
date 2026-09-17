# Trending Adds + Constant Dedup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up real trending-adds data (free Sleeper endpoint, currently a hardcoded empty stub) and consolidate three duplicated constant tables into single sources, matching the father project's already-polished single-source pattern.

**Architecture:** Two independent, small tasks. Task 1 adds `hubapi.hub_news()` calling Sleeper's free trending endpoint, enriched via the existing local player snapshot. Task 2 moves three copy-pasted constant tables into their natural single homes (`api/conformal.py`, `api/scoring.py`) with no behavior change, verified by re-running the existing backtest gate.

**Tech Stack:** Python 3.12, stdlib + `requests` (already a dependency). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-17-trending-adds-and-constant-dedup-design.md`

## Global Constraints

- No new dependencies.
- No `/hub-api/*` response schema changes beyond filling in the currently-empty `trending_adds` array with real data in the same shape.
- `fantasypros_news` stays a hardcoded empty array — out of scope, ToS-gated.
- Task 2 must not change any computed value — verify via the existing backtest gate producing identical numbers to `data/models/backtest_2025.json`.
- Real Sleeper endpoint confirmed working during spec research: `GET https://api.sleeper.app/v1/players/nfl/trending/add?limit=N` returns `[{"count": N, "player_id": "..."}]`, including team-abbreviation IDs for DEF trending (e.g. `"TB"`) that are NOT in `data/players/latest.json` (its `KEEP` set in `scripts/snapshot_players.py` excludes `"DEF"`).

---

## Task 1: Trending Adds

**Files:**
- Modify: `api/hubapi.py` (add `hub_news()`)
- Modify: `api/index.py` (route `/hub-api/news` to it)
- Test: `api/test_hub_news.py`

**Interfaces:**
- Produces: `hub_news(limit=25) -> dict` returning `{"trending_adds": [{"player_id", "player_name", "position", "team", "count"}], "fantasypros_news": []}`.

- [ ] **Step 1: Write the failing test**

```python
# api/test_hub_news.py
"""Regression test for /hub-api/news trending-adds, wired to the real
free Sleeper endpoint this session's graphify research confirmed
fantasyhub was stubbing out despite having no ToS restriction on it
(unlike ECR/ADP/market data, which stays correctly dropped)."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from hubapi import hub_news


def test_hub_news_returns_real_trending_data():
    result = hub_news(limit=5)
    assert "trending_adds" in result
    assert "fantasypros_news" in result
    assert result["fantasypros_news"] == []
    adds = result["trending_adds"]
    assert isinstance(adds, list)
    assert len(adds) > 0, "Sleeper trending endpoint returned no players — check the endpoint is reachable"
    for p in adds:
        assert "player_id" in p
        assert "player_name" in p
        assert "position" in p
        assert "team" in p
        assert "count" in p
        assert isinstance(p["count"], int)


def test_hub_news_handles_def_team_ids():
    """Sleeper's trending list includes team-abbreviation ids for DEF
    (e.g. 'TB') that are NOT in data/players/latest.json's snapshot
    (snapshot_players.py's KEEP set excludes 'DEF'). These must resolve
    to a DEF entry, not crash and not silently drop the row."""
    result = hub_news(limit=25)
    def_rows = [p for p in result["trending_adds"] if p["position"] == "DEF"]
    # Not asserting def_rows is non-empty (Sleeper's top-25 trending adds
    # may or may not include a DEF on any given day) — asserting that IF
    # one is present, it's well-formed, and that the full call didn't
    # crash or drop rows silently when one is present.
    for p in def_rows:
        assert p["team"] == p["player_id"]
        assert len(p["player_id"]) <= 3 and p["player_id"].isalpha()


if __name__ == "__main__":
    test_hub_news_returns_real_trending_data()
    test_hub_news_handles_def_team_ids()
    print("OK")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python api/test_hub_news.py`
Expected: `ImportError: cannot import name 'hub_news' from 'hubapi'`

- [ ] **Step 3: Add `hub_news()` to `api/hubapi.py`**

`api/hubapi.py` already imports `players_map` from `rosters` (see its existing `from rosters import assign_slots, build_rosters, players_map, resolve_player, scored_index` line — do not add a duplicate import) and already has a `_sleeper(path, timeout=10)` helper used by other hub_* functions. Add this function in the same file, near the other simple read-only endpoints (e.g. after `hub_meta`/`hub_draft`, before the projections section):

```python
def hub_news(limit=25) -> dict:
    """Trending adds from Sleeper's free trending endpoint — no
    FantasyPros dependency, no ToS restriction (unlike ECR/ADP/market
    data). Enriches player_id -> name/position/team via the existing
    local snapshot (players_map()) instead of a live 5MB player-dump
    fetch. fantasypros_news stays empty — out of scope, ToS-gated."""
    try:
        limit = int(limit or 25)
    except (ValueError, TypeError):
        limit = 25
    try:
        raw = _sleeper(f"/players/nfl/trending/add?limit={limit}")
    except Exception:
        return {"trending_adds": [], "fantasypros_news": []}

    pmap = players_map()
    out = []
    for r in raw or []:
        pid = str(r.get("player_id") or "")
        if not pid:
            continue
        try:
            count = int(r.get("count") or 0)
        except (ValueError, TypeError):
            count = 0
        # Team defenses: Sleeper trending returns the team abbreviation
        # as player_id (e.g. "TB"), never in players_map()'s snapshot
        # (snapshot_players.py's KEEP set excludes "DEF").
        if pid.isalpha() and pid.isupper() and len(pid) <= 3:
            out.append({"player_id": pid, "player_name": pid,
                       "position": "DEF", "team": pid, "count": count})
            continue
        meta = pmap.get(pid, {})
        out.append({
            "player_id": pid,
            "player_name": meta.get("n", f"Player {pid}"),
            "position": meta.get("p", ""),
            "team": meta.get("t") or "",
            "count": count,
        })
    return {"trending_adds": out, "fantasypros_news": []}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python api/test_hub_news.py`
Expected: `OK` (this test hits the live Sleeper API — that's intentional, it's a smoke/integration test, not a pure unit test)

- [ ] **Step 5: Wire the route in `api/index.py`**

Find this exact block (currently `api/index.py:81-82`):

```python
            elif path == "/hub-api/news":
                status, body = 200, {"trending_adds": [], "fantasypros_news": []}
```

Replace with:

```python
            elif path == "/hub-api/news":
                status, body = 200, hubapi.hub_news(limit=g("limit", 25))
```

- [ ] **Step 6: Verify the route end-to-end**

Run a local server and hit the route (adapt to however this repo runs locally — check `README.md`'s "Local development" section for the exact command, e.g. `vercel dev`), then:

```bash
curl -s "http://localhost:3000/hub-api/news"
```

Expected: a JSON body with `trending_adds` containing real player names, positions, teams, and counts (not an empty array).

- [ ] **Step 7: Commit**

```bash
git add api/hubapi.py api/index.py api/test_hub_news.py
git commit -m "feat: wire /hub-api/news to real Sleeper trending data

Was a hardcoded empty stub. Sleeper's trending/add endpoint is free,
no key, no FantasyPros dependency — unlike ECR/ADP/market data (which
stays correctly dropped), there's no ToS reason this was empty. Found
via cross-repo graphify comparison against the father project's
adapters/news.py::get_trending_adds()."
```

---

## Task 2: Constant Deduplication

**Files:**
- Modify: `api/conformal.py` (add `POS_WIDTH_FACTORS` + `interval_width()`)
- Modify: `api/analytics.py` (replace `_interval_width` body with a call to `conformal.interval_width`)
- Modify: `scripts/compute_week.py` (remove local `POS_WIDTH` + inline width formula + `REF_SCORING`; import from `api/conformal.py` and `api/scoring.py`)
- Modify: `scripts/backtest.py` (same as compute_week.py)
- Modify: `api/scoring.py` (add `REF_SCORING`)

**Interfaces:**
- Produces: `conformal.interval_width(pos: str, pts: float) -> float`, `conformal.POS_WIDTH_FACTORS: dict` (both consumed by `api/analytics.py`, `scripts/compute_week.py`, `scripts/backtest.py`); `scoring.REF_SCORING: dict` (consumed by `scripts/compute_week.py`, `scripts/backtest.py`).
- Consumes: `api/conformal.py`'s existing `qhat` and `POS_RESIDUALS` (from this session's earlier port — do not modify their values).

This task is pure refactoring — every constant value and formula step must be byte-identical to what's already shipped. Read each file's current content before editing (it may have drifted slightly from the exact line numbers below if other work landed first — find the equivalent block by content, not by line number alone).

- [ ] **Step 1: Record the pre-refactor baseline**

Before touching anything, run the backtest and save its output for comparison:

```bash
python3 scripts/backtest.py --season 2025 --weeks 4-18 > /tmp/baseline_backtest_output.txt 2>&1
cat /tmp/baseline_backtest_output.txt
cp data/models/backtest_2025.json /tmp/baseline_backtest_2025.json
```

Also record three player widths from the current committed projections for the hand-verification in Step 6:

```bash
python3 -c "
import json
data = json.load(open('data/projections/2026_week_02.json'))
for name in ('Josh Allen', 'Jahmyr Gibbs', 'Jaxon Smith-Njigba'):
    p = next((x for x in data['players'] if x['player_name'] == name), None)
    if p:
        print(name, p['position'], p['projected_points'], p['width'])
"
```
Save this output too — you'll compare against it in Step 6.

- [ ] **Step 2: Add the shared constant + function to `api/conformal.py`**

Read the current `api/conformal.py` in full first. Add this to it (the exact `POS_WIDTH_FACTORS` values and formula are copied verbatim from `api/analytics.py`'s current `_interval_width` — do not alter them):

```python
# Position width-scaling factors, applied on top of the real conformal
# base width. Single source — api/analytics.py, scripts/compute_week.py,
# and scripts/backtest.py all import this instead of each keeping their
# own copy (found duplicated 3x via ponytail-audit this session).
POS_WIDTH_FACTORS = {"QB": 1.55, "RB": 1.07, "WR": 1.12, "TE": 0.88, "K": 0.85, "DEF": 0.75}


def interval_width(pos: str, pts: float) -> float:
    """Confidence interval half-width: real conformal base (qhat) scaled
    by position and point-magnitude factors, clamped to [3.0, 14.0].
    Single implementation — see POS_WIDTH_FACTORS docstring."""
    base = qhat(POS_RESIDUALS.get(pos, POS_RESIDUALS["WR"]))
    pf = POS_WIDTH_FACTORS.get(pos, 1.0)
    qf = 1.0 if pts <= 12 else min(1.60, 1.0 + (pts - 12) * 0.022)
    return max(3.0, min(14.0, base * pf * qf))
```

- [ ] **Step 3: Point `api/analytics.py` at it**

Read `api/analytics.py` in full. It currently has its own `POS_WIDTH_FACTORS` dict (near the top, around where it imports from `conformal`) and its own `_interval_width` function (currently calling `qhat(...)` directly with the same formula, added earlier this session). Replace:

1. Remove the local `POS_WIDTH_FACTORS = {...}` dict definition.
2. Replace the body of `_interval_width(pos, pts)` so it delegates instead of recomputing:
   ```python
   def _interval_width(pos: str, pts: float) -> float:
       return interval_width(pos, pts)
   ```
   (Keep the function name `_interval_width` — it's called elsewhere in this file — just delegate its body.)
3. Update the `from conformal import qhat, POS_RESIDUALS` line (or however it's currently imported — check the actual import line) to also import `interval_width`: `from conformal import qhat, POS_RESIDUALS, interval_width`.

- [ ] **Step 4: Point `scripts/compute_week.py` and `scripts/backtest.py` at it**

Read both files in full first. Each currently has:
- Its own `POS_WIDTH = {...}` dict (compute_week.py) — remove it.
- An inline width-calculation block doing `base = qhat(POS_RESIDUALS.get(pos, POS_RESIDUALS["WR"])); pf = POS_WIDTH.get(pos, 1.0); qf = ...; width = max(3.0, min(14.0, base * pf * qf))` (or equivalent — the exact variable names may differ slightly between the two files) — replace with a single call: `width = interval_width(pos, avg_pts)` (or whatever the local point-estimate variable is named at that point in each file — use the correct local variable name, not `avg_pts` literally if the file calls it something else).
- Its own `REF_SCORING = {...}` dict — remove it.

Both files already have `sys.path.insert(0, str(Path(__file__).parent.parent / "api"))` near the top (compute_week.py) or an equivalent import setup (backtest.py) — add `from conformal import interval_width` and `from scoring import REF_SCORING` (or extend an existing `from scoring import ...` line if one exists) to each file's imports instead of adding a new sys.path line if one already works.

- [ ] **Step 5: Add `REF_SCORING` to `api/scoring.py`**

Read `api/scoring.py` in full. Add this near `AVG_STAT_KEYS` (copied verbatim from `scripts/compute_week.py`'s current `REF_SCORING` — do not alter values):

```python
# Reference scoring for standalone reference-points computation (the
# scripts/compute_week.py "projected_points" field before per-league
# rescoring, and scripts/backtest.py's old-method comparison). Real
# per-league scoring always uses score_avg_stats() with the league's
# actual Sleeper scoring_settings — this is never that. Single source —
# found duplicated across compute_week.py and backtest.py.
REF_SCORING = {
    "pass_yd": 0.04, "pass_td": 4.0, "pass_int": -1.0,
    "rush_yd": 0.1, "rush_td": 6.0,
    "rec": 1.0, "rec_yd": 0.1, "rec_td": 6.0,
    "fum_lost": -2.0, "xpm": 1.0, "xpmiss": -1.0,
    "fgm_0_19": 3.0, "fgm_20_29": 3.0, "fgm_30_39": 3.0,
    "fgm_40_49": 4.0, "fgm_50_59": 5.0, "fgm_60_": 6.0, "fgmiss": -1.0,
}
```

(Verify this matches the exact dict currently in both `scripts/compute_week.py` and `scripts/backtest.py` byte-for-byte before deleting either — if they've drifted from each other, STOP and report the discrepancy rather than picking one arbitrarily; that would be a real behavior change, not a refactor.)

- [ ] **Step 6: Verify no behavior changed**

Run the full test suite:
```bash
python api/test_conformal.py
python api/test_stat_projector.py
python api/test_weather.py
python scripts/test_compute_week.py
python scripts/test_backtest.py
python api/test_analytics_smoke.py
python api/test_hub_news.py
```
All must pass.

Re-run the backtest and diff against the baseline from Step 1:
```bash
python3 scripts/backtest.py --season 2025 --weeks 4-18
diff /tmp/baseline_backtest_2025.json data/models/backtest_2025.json
```
Expected: no diff (or only a `date`/timestamp field differing, if the JSON stores a run timestamp — check the actual file structure; the `mae`/`pairwise`/`picp`/`spearman`/`me` numeric fields must be identical).

Re-check the three players from Step 1:
```bash
python3 -c "
import json
data = json.load(open('data/projections/2026_week_02.json'))
for name in ('Josh Allen', 'Jahmyr Gibbs', 'Jaxon Smith-Njigba'):
    p = next((x for x in data['players'] if x['player_name'] == name), None)
    if p:
        print(name, p['position'], p['projected_points'], p['width'])
"
```
Expected: identical output to Step 1's recording (this refactor doesn't regenerate the committed projection data, so this just confirms nothing else silently touched it — if compute_week.py needs a re-run for any reason, the widths must recompute to the exact same numbers as before, since the formula is unchanged).

If anything differs, do not proceed — find and fix the discrepancy (likely a copy-paste error in the consolidation) before committing.

- [ ] **Step 7: Commit**

```bash
git add api/conformal.py api/analytics.py api/scoring.py scripts/compute_week.py scripts/backtest.py
git commit -m "chore: consolidate 3x-duplicated constant tables into single sources

POS_WIDTH_FACTORS + the interval-width formula now live once in
api/conformal.py; REF_SCORING now lives once in api/scoring.py.
api/analytics.py, scripts/compute_week.py, and scripts/backtest.py all
import instead of hand-copying. Pure refactor — verified identical
backtest numbers and identical per-player widths before/after.

Flagged by an earlier ponytail-audit this session, confirmed still
duplicated via the father-project cross-repo graphify comparison."
```

---

## Final steps (both tasks)

- [ ] Run the full test suite one more time to confirm both tasks together are clean.
- [ ] Push the branch and open a PR against `hunt/overnight-polish` (same pattern as the earlier projection-engine-port PR this session) — do not merge autonomously, do not deploy autonomously.
