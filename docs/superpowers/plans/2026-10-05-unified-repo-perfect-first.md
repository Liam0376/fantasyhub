# Unified Repo ("perfect first") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden fantasyhub + football-sports-analytics to shippable, then assemble them into one new monorepo with full history.

**Architecture:** Phase A hardens hub on main with prod verified. Phase B hardens father on main. Phase C subtree-merges both mains into a new repo (`apps/fantasyhub/` + `research/`), records canonical-path ADR, wires root CI.

**Tech Stack:** git subtree, pytest, Vercel (root dir `apps/fantasyhub`), GitHub archive.

**Spec:** This plan is the spec (user brief 2026-10-05: new combined repo, both perfect first). No separate design doc.

## Global Constraints

- History preserved: use `git subtree add`, never squash or filter-repo.
- Commit counts are small (hub 167, father 268). No history surgery justified.
- Serve path canonical = hub. Research canonical = father engine. No new ports without a spec.
- Frozen accuracy numbers for any public copy: MAE 4.563, corr 0.648, pairwise 74.1%.
- Hub suite baseline: 201 passed, 1 skipped (`pytest -q`, 7.6s).

## Review Focus

- Schedule cache drift: `data/nfl_cache/schedule_2026.json` regenerates often; a dirty tree hides real changes. Task A1 pins it.
- Vercel serving stale bundle: push + curl check in A2, else post links old code.
- Seed week-1 row outranking live week-0 in father DB. Task B1 pins it.
- Missing FP key must not kill Sleeper news (fixed at `refresh.py:1009`; regression covered by `test_refresh.py`). B2 re-runs suite.
- Public copy must never cite 4.163 (superseded). C2 ADR repeats the freeze.

---

### Task A1: Hub tree clean, branch merged to main

**Files:**
- Modify: `/Users/liam/projects/fantasyhub/data/nfl_cache/schedule_2026.json` (inspect, then commit or revert)
- Git: branch `trade-analysis` → `main`

**Interfaces:**
- Consumes: nothing
- Produces: clean `main` at HEAD for Task C1 to subtree.

- [ ] **Step 1: Inspect the dirty cache file**

Run: `git diff -- data/nfl_cache/schedule_2026.json | head -n 30`
Expected: small data refresh diff (scores/weeks) or junk.

- [ ] **Step 2: Commit if legit regeneration, else revert**

Run: `git add data/nfl_cache/schedule_2026.json && git commit -m "chore: refresh schedule cache"` or `git checkout -- data/nfl_cache/schedule_2026.json`
Expected: `git status --short` empty.

- [ ] **Step 3: Merge to main**

Run: `git checkout main && git merge trade-analysis && git push`
Expected: `git status -sb` shows `main...origin/main` with nothing ahead/behind.

### Task A2: Verify Vercel prod equals main HEAD

**Files:** none (verification only)

**Interfaces:**
- Consumes: Task A1 clean main.
- Produces: prod-is-current proof for LinkedIn post.

- [ ] **Step 1: Confirm auto-deploy picked up HEAD**

Run: `curl -s https://fantasyhub-five.vercel.app/health`
Expected: `{"status": "ok"}`.

- [ ] **Step 2: Spot-check one served value against local**

Run: compare `projected_points` for one player from prod `/hub-api/projections?league_id=<id>&week=<w>` vs local `python3 -c` loading `data/projections/<season>_week_<NN>.json`.
Expected: equal. If not, redeploy from Vercel dashboard and re-check.

### Task A3: Hub suite green on main

**Files:** none

- [ ] **Step 1: Run suite**

Run: `python3 -m pytest -q`
Expected: 201 passed, 1 skipped (matches baseline; investigate any delta, do not relax).

### Task B1: Father seed writes week 0, docstring fixed

**Files:**
- Modify: `/Users/liam/projects/football-sports-analytics/scripts/seed_demo.py:2` (docstring says week 10, code writes week 1)
- Modify: `/Users/liam/projects/football-sports-analytics/scripts/seed_demo.py:90` (`(2026, 1, ...)` → `(2026, 0, ...)`)
- Test: `tests/test_seed_demo.py` (create)

**Interfaces:**
- Consumes: nothing
- Produces: seed never outranks live (`hub` prefers week<=cw ordering; week 0 loses to any live week).

- [ ] **Step 1: Write failing test**

```python
def test_seed_writes_week_zero(tmp_db):
    run_seed(tmp_db)
    weeks = {r[0] for r in tmp_db.execute("SELECT week FROM player_stats")}
    assert weeks == {0}
```

- [ ] **Step 2: Run to verify it fails**

Run: `pytest tests/test_seed_demo.py -v`
Expected: FAIL (writes week 1).

- [ ] **Step 3: Change insert to week 0, fix docstring to week 0**

Exact: `(2026, 1, json.dumps(...))` → `(2026, 0, json.dumps(...))`; docstring `week 10` → `week 0`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_seed_demo.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed_demo.py tests/test_seed_demo.py
git commit -m "fix(seed): demo writes week 0 so live data outranks it"
```

### Task B2: Father suite green, audit follow-up closed

**Files:** none (verification + triage)

- [ ] **Step 1: Run suite**

Run: `python3 -m pytest -q` (without `RUN_INTEGRATION=1`; integration gated)
Expected: all pass. Fix failures at root cause; do not skip.

- [ ] **Step 2: Close DECISIONS D3b**

File: `docs/audits/2026-reliability/DECISIONS.md:30` (deferred robots.txt check). Either run the check and record outcome, or mark wontfix with one-line reason. Commit the edit.

- [ ] **Step 3: Merge to main**

Run: `git checkout main && git merge implement-fantasy-football-analytics && git push`
Expected: main clean, nothing ahead.

### Task C1: Assemble new monorepo with full history

**Files:** new repo, e.g. `/Users/liam/projects/fantasy-football/`

**Interfaces:**
- Consumes: A1 + B3 clean mains.
- Produces: monorepo for C2/C3.

- [ ] **Step 1: Init and subtree both mains**

```bash
git init fantasy-football && cd fantasy-football
git subtree add -P apps/fantasyhub /Users/liam/projects/fantasyhub main
git subtree add -P research /Users/liam/projects/football-sports-analytics main
```

Expected: `git log --oneline | wc -l` ≈ 435 combined; both subtrees build.

- [ ] **Step 2: Prune non-portable weight from research/**

Delete from `research/`: `hub/` local app (superseded by Vercel app), `FantasyHub.app`, `StartFantasyHub.command`, `data/fantasy.db*`, `data/nfl_cache/`. Keep: `src/`, `scripts/`, `tests/`, `docs/`, `rejected-ml-evidence`, specs.
Expected: `pytest` still collects in both subtrees; no binary blobs (`find . -size +10M` empty).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: monorepo from fantasyhub + football-sports-analytics mains"
```

### Task C2: Record canonical-path ADR

**Files:**
- Create: `research/docs/architecture-decisions/0005-monorepo-canonical-paths.md`

Content (one page): serve = `apps/fantasyhub`; research = `research/src|scripts`; `research/hub/` deleted as superseded; FP/StatsGuy/ECR not ported (FantasyCalc instead, ECR null by design); accuracy freeze numbers; shadow/rating excluded from serve.

- [ ] **Step 1: Write ADR and commit**

Expected: reviewer (Liam) approves wording; commit message `docs: ADR-0005 monorepo canonical paths`.

### Task C3: Root CI + Vercel repoint + archive olds

**Files:**
- Create: `.github/workflows/pytest.yml` (two jobs: `apps/fantasyhub` pytest, `research` pytest)
- Vercel dashboard: root directory → `apps/fantasyhub`

- [ ] **Step 1: Add workflow, push, watch green**

Expected: both jobs pass on first push.

- [ ] **Step 2: Repoint Vercel, verify `/health` ok on new project URL**

Expected: `{"status": "ok"}` + projection spot-check per A2.

- [ ] **Step 3: Archive old repos**

README pointer commit on both olds, then GitHub Archive. Expected: olds read-only, new repo sole active.
