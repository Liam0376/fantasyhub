# Trending Adds + Constant Deduplication — Design Spec

Date: 2026-09-17
Status: PROPOSED (autonomous overnight run, per explicit user instruction)

## Context

Cross-repo knowledge graph (fantasyhub + football-sports-analytics, `graphify-out/graph.json`) built this session to compare both codebases systematically for reimplementation/duplication. Two concrete findings, both evidence-backed:

1. fantasyhub's `/hub-api/news` endpoint (`api/index.py`) returns a hardcoded stub: `{"trending_adds": [], "fantasypros_news": []}`. The father project's `src/ffanalytics/adapters/news.py::get_trending_adds()` implements this for real, hitting Sleeper's free `/v1/players/nfl/trending/add` endpoint — no API key, no FantasyPros dependency, no ToS restriction (unlike ECR/ADP/market data, which stays correctly dropped).
2. An earlier ponytail-audit this session (before this graphify pass) found three constant tables copy-pasted verbatim across `api/analytics.py`, `scripts/compute_week.py`, and `scripts/backtest.py`: `POS_WIDTH`/`POS_WIDTH_FACTORS`, the interval-width composition formula (`base * pos_factor * point_factor`, clamped 3-14), and `REF_SCORING`. Never fixed. Father project keeps each of these in exactly one place.

A third candidate — `hub/src/lib/relevance.js`'s depth-chart-based player-relevance tiering — was investigated and explicitly rejected: it depends on a build-time-baked JSON snapshot derived from FantasyPros' depth-chart CSV, the same ToS-restricted data class already excluded from fantasyhub. It is correctly absent from fantasyhub's shipped bundle (confirmed via grep — no trace of `depthChart`/`isDepthRelevant`/`DEPTH_TOP_N`). Do not port it.

## Goals

- Wire up trending-adds for real, using only free, unrestricted Sleeper data.
- Consolidate the three duplicated constant tables into one source each, referenced everywhere.
- No new dependencies, no schema changes to `/hub-api/*` response shapes beyond filling in the currently-empty `trending_adds` array.
- Reuse fantasyhub's existing local player snapshot (`data/players/latest.json`, `rosters.py::players_map()`) instead of father's live 5MB player-dump fetch — cheaper, already-cached, same lookup semantics.

## Part 1: Trending Adds

### Data flow

```
Sleeper /v1/players/nfl/trending/add?limit=25   [live, free, no key]
        │
        v
api/hubapi.py::hub_news(league_id=None)
        │  cross-reference player_id -> name/position via
        │  rosters.players_map() (existing local snapshot,
        │  NOT a live fetch of the full player dump)
        v
{"trending_adds": [{"player_id", "player_name", "position", "team", "count"}],
 "fantasypros_news": []}   # stays empty — FantasyPros-gated, correctly dropped
```

### Response shape

Sleeper's raw trending response is `[{"player_id": "...", "count": N}, ...]`. Match the father project's enrichment pattern (`get_trending_adds`) but sourced from the local snapshot instead of a live dump fetch:

```json
{
  "trending_adds": [
    {"player_id": "4046", "player_name": "Patrick Mahomes", "position": "QB", "team": "KC", "count": 128}
  ],
  "fantasypros_news": []
}
```

`fantasypros_news` stays a hardcoded empty array — same reasoning as the earlier market-data decision, not addressed by this spec.

### Error handling

Soft-fail, matching every other Sleeper call in `hubapi.py`/`league.py`: on any exception (network, malformed response), return `{"trending_adds": [], "fantasypros_news": []}` — the same shape the endpoint already returns today, so a failure degrades to current behavior, never a 500.

### Files touched

- `api/hubapi.py`: add `hub_news()` function.
- `api/index.py`: change the `/hub-api/news` route from the inline stub dict to call `hubapi.hub_news()`.

## Part 2: Constant Deduplication

### Current duplication (confirmed via ponytail-audit + direct read this session)

| Constant | Copies | Locations |
|---|---|---|
| `POS_WIDTH` / `POS_WIDTH_FACTORS` | 3 | `api/analytics.py:14`, `scripts/compute_week.py:55`, `scripts/backtest.py` (inline in width calc) |
| Interval-width formula (`base=qhat(...)`, `*pf*qf`, clamp 3-14) | 3 | `api/analytics.py::_interval_width`, `scripts/compute_week.py` width calc block, `scripts/backtest.py` width calc block |
| `REF_SCORING` | 2 | `scripts/compute_week.py:36`, `scripts/backtest.py:29` |

### Target: single source per constant

- **`POS_WIDTH_FACTORS` + interval-width formula**: move into `api/conformal.py` (already the shared module housing `qhat`/`POS_RESIDUALS` — the natural home for interval-width math) as one function:
  ```python
  POS_WIDTH_FACTORS = {"QB": 1.55, "RB": 1.07, "WR": 1.12, "TE": 0.88, "K": 0.85, "DEF": 0.75}

  def interval_width(pos: str, pts: float) -> float:
      base = qhat(POS_RESIDUALS.get(pos, POS_RESIDUALS["WR"]))
      pf = POS_WIDTH_FACTORS.get(pos, 1.0)
      qf = 1.0 if pts <= 12 else min(1.60, 1.0 + (pts - 12) * 0.022)
      return max(3.0, min(14.0, base * pf * qf))
  ```
  `api/analytics.py::_interval_width`, `scripts/compute_week.py`'s inline width block, and `scripts/backtest.py`'s inline width block all become one-line calls to this function.

- **`REF_SCORING`**: move to `api/scoring.py` (already the home of `AVG_STAT_KEYS`, `score_avg_stats`, and the now-shared `normalize_row_stats`). Both `scripts/compute_week.py` and `scripts/backtest.py` import it from there instead of hand-copying the dict.

### Behavior must not change

This is pure deduplication — the composed formula and the constant values are byte-identical to what's already shipped and verified (backtest-gated, PICP-measured this session: 89.7%/89.8% coverage). No re-verification of the model's accuracy is needed; only that the refactor doesn't change any computed value. Verification: re-run `scripts/backtest.py --season 2025 --weeks 4-18` after the refactor and confirm the printed MAE/pairwise/PICP numbers are identical to the last recorded run (in `data/models/backtest_2025.json`), and spot-check the same three players (Josh Allen, Jahmyr Gibbs, Jaxon Smith-Njigba) from the earlier verified width recompute.

## Testing

- `api/test_hub_news.py` (new): mock the Sleeper trending endpoint, verify enrichment via `players_map()`, verify soft-fail on network error returns the empty-array shape.
- Existing 6 test suites must still pass unchanged after the dedup refactor (no behavior change).
- Manual verification: `python3 scripts/backtest.py --season 2025 --weeks 4-18` produces identical MAE/pairwise/PICP to the last recorded run in `data/models/backtest_2025.json`.

## Out of scope

- `fantasypros_news` — stays empty, ToS-gated, not addressed here.
- Depth-chart relevance tiering — explicitly rejected above, ToS-gated.
- Any other father-project feature not named in this spec — this is a scoped two-part fix, not a full re-audit.

## Process note

Built via subagent-driven-development in an isolated worktree, same guardrails as the earlier projection-engine port this session: push + PR when done, no autonomous merge to `hunt/overnight-polish`, no autonomous `vercel --prod` deploy.
