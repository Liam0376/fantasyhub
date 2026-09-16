# Projection Engine Port — Design Spec

Date: 2026-09-16
Status: PROPOSED

## Context

fantasyhub (`~/projects/fantasyhub`) is a $0, public, stateless Vercel port of
`~/projects/football-sports-analytics` ("the father project") — paste a
Sleeper league link, get projections and auction values, no sign-up. It
currently ships a stripped-down projection method: `scripts/compute_week.py`
computes a weighted-recent average of raw stats (last 3 games at 2x) with no
regression toward any prior. With one game of 2026 data on the books, this
means a single-week outlier IS the season projection — a Week 1 breakout
scores as a top-tier player for the rest of the year. Confirmed live: Josh
Allen projected 41.66 pts/week (624.9 ROS) off one game.

The father project already solved this. `src/ffanalytics/stat_projector.py`
is a backtested, evidence-gated pipeline (MAE 4.563, corr 0.648, pairwise
74.1%, coverage 82% — frozen production numbers, see that file's header) that
blends toward a prior when the sample is thin, regresses TDs to a position
mean, caps usage-trend swings, and damps Vegas/weather adjustments. This spec
ports that validated pipeline into fantasyhub's serverless architecture.

## Goals

- Fix the Week 1 (and generally thin-sample) overweighting bug at the root,
  not with a clamp.
- Bring fantasyhub's model quality to parity with the father project's frozen
  benchmark, verified by the same class of backtest metrics, not by eyeballing
  a few players.
- Preserve fantasyhub's constraints: $0 hosting, fully public with no
  sign-up, stateless Vercel functions, weekly GitHub Action as the only
  scheduled compute.
- Stay out of scope creep: port the validated production path only, not the
  father project's research/backtest infrastructure, rejected ML experiments,
  or its unused team-rating system (see decision log below).

## Decisions already made (this session)

1. **Port scope: production path only.** Bring over `stat_projector.py`'s
   shrinkage/regression pipeline, `conformal.py`'s interval math, and weather
   (Open-Meteo, free, no key). Do NOT port: backtest scripts as a wholesale
   directory, the XGBoost/ML experiments (all REJECTED per that file's
   header), the Elo/Glicko team-rating system (`rating.py`, `rating_updates.py`
   — unused in the frozen production path; opponent-defense factors were
   tested and REJECTED, corr 0.690→0.687).
2. **Compute location: weekly GitHub Action.** No new infra. The Action
   already fetches nflverse + schedule; it gains a prior-season fetch and a
   weather fetch, then runs the real pipeline instead of the naive average.
3. **Market data ($ECR/ADP/edge-triangle): dropped, not ported.**
   FantasyPros' free API tier is ToS-restricted to personal/non-production
   use (confirmed: https://api.fantasypros.com/public/v2/docs, 50 req/day,
   "limited to non-production use"). fantasyhub is public — wiring that key
   in would violate FantasyPros' terms. The CSV fallback (`fantasypros_csv.py`)
   is a manual per-week export, incompatible with an unattended public cron.
   fantasyhub stays model-only; `hubapi.py` already returns `null` for these
   fields with the comment "anything without a source... returns empty" —
   no code change needed here, just confirming the null stays intentional
   and is not a bug to chase.

## Architecture

```
GitHub Action (weekly, Tue 6am UTC — unchanged trigger)
  │
  ├─ fetch nflverse weekly stats (current season)        [existing]
  ├─ fetch nflverse weekly stats (PRIOR season)           [NEW]
  ├─ fetch schedule (byes, team def, Vegas lines)         [existing]
  ├─ fetch Open-Meteo forecast per stadium                [NEW]
  │
  v
scripts/compute_week.py
  │
  ├─ api/stat_projector.py   [NEW — ported from father project]
  │    weighted_recent_avg, _td_regression, _usage_trend_adjustment,
  │    _vegas_adjustment, _weather_adjustment, project_player_stats,
  │    build_weekly_projections, compute_ros_projections
  │
  ├─ api/conformal.py        [NEW — ported from father project]
  │    qhat() — split-conformal interval half-width from POS_RESIDUALS
  │
  v
data/projections/{season}_week_{week:02d}.json   [existing shape, richer values]
  │
  v
api/analytics.py  (unchanged contract — still rescores avg_stats per league)
```

Nothing changes about how `api/analytics.py`, `api/hubapi.py`, or
`api/index.py` read projections — they consume the same JSON shape from
`data/projections/`, just with materially better numbers underneath. This
keeps the blast radius contained to `scripts/compute_week.py` and two new
`api/` modules.

## Components

### `api/stat_projector.py` (new)

Direct, minimal port of the father project's validated functions. Ported
1:1 where fantasyhub's data shapes already match (they do — both group
nflverse weekly rows by player, list-of-dicts history). Constants
(`POS_TD_MEANS`, `VEGAS_TD_DAMPING`, `WIND_THRESHOLD_MPH`, etc.) copied
verbatim — these are backtested values, not tunable knobs to second-guess
during a port.

Not ported: `xfp_adjust`/`td_prior` parameters (both REJECTED or
default-off research instruments per the source file's header — no
evidence they help, adds surface area for no benefit).

### `api/conformal.py` (new)

Just `qhat()` and `POS_RESIDUALS` — replaces fantasyhub's current heuristic
`_interval_width` (pos-factor × point-factor formula with no real residual
data underneath). `POS_RESIDUALS` table copied verbatim (backtested,
frozen — see stat_projector.py header).

### `scripts/compute_week.py` (modified)

- Add `fetch_weekly_stats(season - 1)` for the blend-when-thin path.
- Add a minimal Open-Meteo weather fetch, keyed by stadium — needs a
  stadium → (lat, lon) table. Father project's `adapters/weather.py` has
  this; port the coordinate table only (no adapter abstraction needed for
  one call site).
- Replace `compute_projections()`'s body: instead of a single
  `weighted_recent_avg` over raw stat columns, call
  `stat_projector.build_weekly_projections()` per remaining week and sum
  (mirrors `compute_ros_projections()`), producing the same
  `avg_stats`-keyed JSON shape `api/analytics.py` already expects — the
  emitted schema does not change, only how the numbers inside it are
  computed.
- `REF_SCORING`/`POS_WIDTH` module-level dicts become dead once this
  ships (superseded by `conformal.py` + `stat_projector.py` constants) —
  delete them, don't leave a second copy of the same table around (this is
  exactly the kind of duplication flagged in the ponytail-audit pass
  earlier this session).

### `scripts/backtest.py` (new — the test harness)

Ports `scorecard.py`'s metric functions verbatim (`_spearman`, `_pairwise`,
`_picp`, MAE/bias) — pure stdlib math, no new dependency. Usage:

```
python scripts/backtest.py --season 2025 --weeks 4-18
```

For each week in range: build a projection using ONLY data before that
week (true out-of-sample, same as father project), score against nflverse's
actual results for that week with real league scoring. Report MAE, bias,
Spearman rho, pairwise%, PICP (coverage) — old naive-average method vs. new
ported pipeline, side by side, on the identical holdout.

**Gate**: the ported pipeline ships to `compute_week.py`'s production path
only if it beats the naive-average baseline on MAE and does not regress
coverage below ~75%. If it doesn't clear that bar, that's a finding to
report, not a result to paper over — matches the father project's own
"REJECTED — evidence: ..." discipline (see `stat_projector.py`'s header for
the pattern this project's own history already follows, per AGENTS.md's
process section).

## Data flow — weekly cron, step by step

1. Fetch current-season nflverse weekly stats (existing).
2. Fetch prior-season nflverse weekly stats (new — same URL pattern, `season - 1`).
3. Fetch schedule CSV (existing — already used for byes/team-def/Vegas lines).
4. Fetch Open-Meteo forecast per stadium for the target week's games (new).
5. For each remaining week (current through 18), call
   `stat_projector.build_weekly_projections()` with that week's actual
   opponent/Vegas/weather context, using only prior-week history — this
   is what makes ROS a real per-week sum instead of `avg × remaining`.
6. Sum into `ros_points`, compute `conformal.qhat()`-based intervals.
7. Write `data/projections/{season}_week_{week:02d}.json` — same shape,
   commit, Vercel auto-deploys (unchanged).

## Error handling

Matches the father project's stated policy in its own design spec
(`docs/superpowers/specs/2026-08-26-fantasy-football-analytics-design.md`):
a missing secondary source degrades gracefully, never blocks the whole run.

- Prior-season fetch fails → blend step falls back to current-season-only
  average (today's behavior for a player with `>=3` games; for a player
  with `<3` games and no prior data, `project_player_stats` already
  handles this — falls through to `sum(values)/len(values)`).
- Open-Meteo fetch fails → weather adjustment is skipped for that run
  (`wind_mph=0, temp_f=None` — no adjustment applied, not a fabricated one).
- Schedule fetch fails → today's existing fallback holds (no byes/team-def,
  documented in `compute_week.py` already).

## Testing

Per AGENTS.md's "tests every time" rule — this is a `large` change (model
math, hub-facing numbers), so it gets a full local test pass on every
touched area, not just the new files:

- `scripts/backtest.py` itself is the evidence gate described above — run
  it, capture the before/after numbers in the plan's verification step
  (not asserted from memory).
- Unit tests for `api/stat_projector.py`'s pure functions
  (`weighted_recent_avg`, `_td_regression`, `_usage_trend_adjustment` caps,
  `_vegas_adjustment` damping) — port the shape of the father project's
  existing unit tests for these functions where they exist, otherwise write
  new ones asserting the documented backtested behavior (e.g., the ±50%
  usage-trend cap, the TD-regression weight).
- Unit test for `api/conformal.py`'s `qhat()` against a known
  `POS_RESIDUALS` input/output pair.
- Regression test: `api/analytics.py`'s existing consumers (`compute_analytics`,
  `hub_projections`, etc.) still produce a valid response shape against a
  real league ID — this already broke once this session (`_remaining_games`
  NameError) from an unrelated edit; a smoke test hitting
  `compute_analytics()` end-to-end belongs in the suite so that class of
  regression can't ship silently again.

## Out of scope (this port)

- FantasyPros market data (decided above — dropped).
- Father project's Elo/Glicko team-rating system (unused in its own
  production path).
- Backtest infrastructure as a general framework — `scripts/backtest.py`
  here is purpose-built for this one gate, not a reusable harness for
  future ML experiments fantasyhub doesn't need yet (YAGNI — the father
  project's own XGBoost/ensemble attempts were all REJECTED anyway).
- The small, independent bugfixes identified earlier this session
  (`sleeper_id`/headshot join for the standalone Projections tab, auction
  `$0` investigation for specific players, matchups breakdown click,
  Projections tab columns rendering `-`) — bounded fixes, tracked
  separately, not blocked on this port and not blocking it either.

## Process note (per father project's AGENTS.md, applied here)

This is a `large` change per that file's triage sizing (model-math,
cross-cutting, judgment-heavy). Branch: `feat/stat-projector-port` off
`hunt/overnight-polish` (or `main`, confirm at plan time). Implementation
proceeds task-by-task per the plan this spec feeds into, with the backtest
gate run and its numbers reported before the new pipeline replaces the old
one in `compute_week.py`'s production path — not after.
