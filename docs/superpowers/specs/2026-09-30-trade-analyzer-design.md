# Trade Analyzer Rebuild — Design Spec

Date: 2026-09-30
Status: PROPOSED (awaiting user OK)
Source prompt: `/Users/liam/Desktop/fantasy-trade-analyst-prompt.md`

## Context

`hub_trade` / `hub_rec_trade` (`api/hubapi.py`) verdict = Σ per-package `vor × remaining_games × flat_injury_mult`. All 10 weaknesses in the prompt were re-verified in code on 2026-09-30, plus two corrections:

- `playoff_week_start` / `playoff_teams` ARE fetched (`api/league.py:170-171`) but unused by trade math. Actually missing: `settings.type`, `trade_deadline`, `playoff_round_type`, `/league/{id}/traded_picks`.
- Week files are ~1.1 MB each (not 0.5), 1422 players, fields: `avg_stats`, `ml_adjustment`, `projected_points`, `projection_lower/upper`, `bye_week`, `remaining_games`, `byes` map, `team_def` (32 rows).
- FantasyCalc verified live: `maybeTier`/`maybeAdp`/`maybeRosterPercent`/`maybeMovingStandardDeviation`/`maybeTradeFrequency` are top-level item fields (script reads them from `entry["player"]` → 197/197 null). Redraft ≈ 198 rows; dynasty ≈ 421 incl. 24 PICK rows (`sleeperId: "FP_2027_early_0"`).
- Shipped bundle (`public/assets/trade-C7UOKMUh.js`) reads: `winner`, `value_difference`, `market_a/b`, `.cold`, `slots.{gained_a/b, credit_a_ros, credit_b_ros, fill_a/b, remaining_games}`, `packages.a/b[]` entries (`weekly`, `ros`, `market`). It does NOT read `trend30` (kept anyway).

## Decisions (user, 2026-09-30)

1. Scope: **redraft now, dynasty-ready** (fetch type + traded_picks; no dynasty verdict logic).
2. Playoff weighting: **1.25×, only for teams inside the playoff field** (not 1.5).
3. Direction: **infer + per-team query override**.
4. Verdict basis: **lineup points only**; market shown alongside, never blended in.
5. Injury horizon: **Out = 1 week, IR = 4 weeks**, engine-side, applied to raw week-file projections (bypasses `projections.py`'s IR-season-zeroing, which stays for the boards).
6. Counteroffers: **later**.
7. UI: **API only**, backward compatible.
8. Week files: **load directly, measure; compact per-week file only if warm > 2 s**.
9. Errors: `{"winner": null, "cold": true, "error": "..."}` — no fake "Even". `test_trade_cold_shape` updates (it encodes the flaw).
10. League IDs for the validation benchmark: pending, user sends later.

## Architecture

New module `api/trade_engine.py` holds all math. `hubapi.hub_trade` / `hub_rec_trade` stay as thin wrappers (same signatures, plus optional `direction_a`/`direction_b`). One `build_rosters` call per request feeds everything — no nested refetches.

```
build_rosters(league_id)          # single fetch_league + analytics
   │
   v
trade_engine.evaluate(league, teams, traded_a, traded_b, overrides)
   ├─ league profile      (settings incl. type/deadline/round_type, calendar, traded_picks)
   ├─ week projections    (data/projections/{season}_week_{NN}.json, rescored, weeks now→fantasy final)
   ├─ lineup delta        (optimal lineup before/after per team per week)
   ├─ needs + direction   (per team)
   ├─ market              (FantasyCalc, league-matched params, cached)
   └─ verdict             (gains, Even bands, acceptance, warnings)
```

## Part 1: League profile (once per request)

`fetch_league` gains, in `settings`: `type` (0 redraft / 1 keeper / 2 dynasty), `trade_deadline`, `playoff_round_type`; taxi/reserve counts derive from `roster_positions` (count of `TAXI`/`IR` entries). New optional param `include_traded_picks=False` — only the trade path pays for `/league/{id}/traded_picks` (rows: `season`, `round`, `roster_id`, `previous_owner_id`, `new_owner_id`).

Calendar from `settings.playoff_week_start`, `playoff_teams`, and `/state/nfl` (existing `get_nfl_state`):

- `current_week` = NFL state week
- `last_regular_week` = `playoff_week_start - 1`
- `final_week` = `min(18, playoff_week_start + ceil(log2(playoff_teams)))` — 2→1, 4→2, 6→3, 8→3 playoff weeks
- `weeks_left` = `[current_week .. final_week]`

Every response carries `settings_used` (scoring summary, roster shape incl. flex/SUPER_FLEX/bench/IR/taxi counts, num_teams, type, deadline, calendar) so the UI can show assumptions. Weeks after the fantasy final contribute 0 by construction.

## Part 2: Week-by-week projections

For each week in `weeks_left`, load `data/projections/{season}_week_{NN}.json` directly (bypassing `get_projections` so the projection layer's IR-season-zeroing does not apply — the engine applies its own horizon). Per player:

- points = `score_avg_stats(avg_stats, scoring, pos) + ml_adjustment` (existing `scoring.py`; same rescore path as `analytics.rescore_player`, which becomes the shared call)
- `lower/upper` = `conformal.interval_fields(pos, points)` (same as analytics)
- bye week (from the file's `byes` team map or `bye_week`) → 0 points
- injury horizon: Out → ×0.6 for the next 1 week only; IR (no return date) → ×0.6 for the next 4 weeks only; Q/D → ×0.85 current week only; healthy after. Status source: same `data/injuries/latest.json` snapshot analytics uses, plus roster `injury_status`.
- team DEF rows rescored via `score_team_def` (existing).

Cost control: per week, keep only players that appear on any roster, plus the top ~60 FA candidates by rescored points (enough to fill open slots at every position). Cache parsed files per instance. Measure warm latency; if > 2 s, `compute_week.py` writes a compact per-week trade file (deferred per decision 8).

## Part 3: Lineup delta (core)

For each team, each week: optimal starting lineup before the trade (current roster) and after (roster with the trade applied). Team gain = Σ over weeks of `weight_w × (after_w − before_w)`.

- `weight_w` = 1.25 in playoff weeks **iff the team is inside the playoff field** by current standings (seed ≤ `playoff_teams`, ranked by wins then fpts; `direction` override can force on/off), else 1.0.
- Optimal lineup: `assign_slots` is greedy by slot order. Add a brute-force comparison test over randomized rosters; the SUPER_FLEX + QB shape is a known greedy failure (greedy puts RB1 in SF over QB2 and loses total). On failure, replace the greedy pass inside `assign_slots` with max-weight bipartite matching (Kuhn's augmenting path, stdlib, ~30 lines) — same signature, same slot labels, same callers (start-sit and rosters views get the same fix).
- **Getting more players than sent:** drop lowest-value players back to the league roster size (`len(roster_positions)`). A player's value = his marginal lineup contribution: Σ over weeks of (lineup with him − lineup without him). Bye and injury cover count automatically — a bench player who would start during a starter's discounted/injury weeks has nonzero marginal value. Dropped players appear in `drops[]` with that value charged against the receiving team.
- **Getting fewer:** each open roster spot fills with the best free agent for that week (FAs = players on no roster), again by marginal lineup contribution. Fills appear in `adds[]`.

One mechanism covers 2-for-1, positional need, bye holes, and bench depth — no bolt-on multipliers. Both teams can gain; the output reports `win_win` / `lose_lose` when it happens.

Legacy no-package mode (no `traded_a`/`traded_b`): degenerate case — nothing changes hands, verdict "Even", keeps returning roster lineup totals for the old full-roster compare view.

## Part 4: Needs and direction

- Needs (per team, per position group QB/RB/WR/TE): team's optimal starter average over `weeks_left` vs the league-median starter at that slot across all teams. Positive gap = need. Plus bye clusters: weeks where ≥2 starters at one position share a bye.
- Direction: infer from wins% rank + fpts rank + playoff seed. Contender = playoff seed and top-half fpts; rebuilder = bottom third by wins; else middle. Query override `direction_a`/`direction_b` = `contend|middle|rebuild`. In dynasty (out of verdict scope for now) a rebuilder direction still reports market long-term value alongside.

## Part 5: Market (FantasyCalc) — context, not verdict

- `scripts/snapshot_fantasycalc.py`: params from the league — `isDynasty` = (`settings.type == 2`), `numQbs` = 2 if any `SUPER_FLEX` slot or ≥2 QB slots else 1, `numTeams` from league, `ppr` = `round(rec)` (0 / 0.5 / 1). Field fix: read `value`, `trend30Day`, `maybeTier`, `maybeAdp`, `maybeRosterPercent`, `maybeMovingStandardDeviation`, `maybeTradeFrequency` from the **top level** of each item, `sleeperId` from `player`.
- Caching: cron keeps writing the default-combo file (`data/market/fantasycalc.json`). The API, for non-default combos, fetches live on first use per instance with a module-level TTL cache (6 h), `User-Agent: fantasyhub/1.0`, 10 s timeout, never fails the request (market null + warning).
- Missing player = `null` market entry, never 0. `market_a` / `market_b` (legacy display sums) sum covered players only; `coverage_a/b` report counts. No market sum ever feeds the verdict.
- Market usage: (a) acceptance odds, (b) per-player buy-low/sell-high gaps — flag when a player's market rank within position differs from his model-points rank by a large margin (report both ranks), (c) dynasty long-term block (incl. PICK rows) — parsed and reported when the league is dynasty, not used in verdict.

## Part 6: Verdict and confidence

Per team: `gains.gain_total` (weighted points), `gains.gain_per_week`, `gains.gain_playoffs` (weighted playoff-weeks portion), `gains.weekly_delta[]` per week. Edge also as % of the team's weekly starting total, so thresholds scale across leagues.

Even bands from projection uncertainty, not fixed numbers:

- For week w and one side's package, `u_w = sqrt(Σ ((upper − lower)/2)²)` over that package's players that week. Packages with no projection that week contribute 0.
- `k = sqrt(Σ_w (u_a,w + u_b,w)²)` — the two packages' uncertainties combined across weeks.
- `|gain_a − gain_b| ≤ k` → **Even**; `≤ 2k` → Leans (winner = bigger gain); `> 2k` → Clear win.

`value_difference` keeps its legacy sign convention (positive = Team A wins) but is now the gain difference. `winner` = team with the bigger gain; both gains reported; `win_win` when both gains > 0 and each ≥ 0.25k (flag, not verdict change).

Acceptance (`likely | possible | unlikely`, for the giving side): likely = partner's gain ≥ 0 and market packages within 15% of each other (covered players); possible = partner's gain ≥ −0.5k or market within 30%; otherwise unlikely. Market unavailable → acceptance from lineup delta alone + warning.

## Part 7: Failure handling

- Any exception in the engine: `{"winner": null, "cold": true, "error": "<msg>", "warnings": [...]}` from both `/hub-api/trade` and `/hub-api/recommendations/trade`; legacy numeric fields present as `null`. `hub_rec_trade` no longer swallows into "Even" (decision 9; updates `test_recommendations.py::test_trade_cold_shape`, which encodes the flaw).
- Unknown traded IDs: listed in `unknown_ids[]`, never dropped silently; matched players must belong to the giving team (cross-team ID → warning + excluded).
- IR/taxi players tradable: package matching searches starters + bench + reserve + taxi.
- One `fetch_league` per request (plus the opt-in traded_picks call); no `hub_waiver` re-entry — FA logic lives in the engine on already-loaded data.
- Trade deadline: if past, response carries `deadline_passed: true` and a warning, but still evaluates.

## Output contract

Kept verbatim (bundle + existing tests): `winner`, `recommendation`, `value_difference`, `team_a_ros`, `team_b_ros`, `team_a_weekly`, `team_b_weekly`, `packages.a/b[]` entry fields (`player_id`, `sleeper_id`, `headshot_url`, `player_name`, `position`, `team`, `weekly`, `ros`, `market`, `trend30`), `market_a`, `market_b`, `market_coverage_a/b`, `slots.{gained_a, gained_b, credit_a_ros, credit_b_ros, fill_a, fill_b, remaining_games}`, `timestamp`, `cold`.

Meaning updates (same names): `team_*_ros`/`team_*_weekly` = post-trade lineup totals; `slots.credit_*_ros` = FA-fill credit in lineup points; `slots.remaining_games` = weeks to fantasy final.

New alongside: `settings_used`, `calendar {current_week, playoff_weeks, weeks_left, final_week}`, `team_a`/`team_b` each `{gains {gain_total, gain_per_week, gain_playoffs, weekly_delta[]}, lineup_before[], lineup_after[], drops[], adds[], needs[], direction}`, `confidence {k, edge_pct}`, `acceptance`, `market {params, coverage_a, coverage_b, gaps[]}`, `warnings[]`, `unknown_ids[]`, `data_freshness {projections, market}`.

## Tests (pytest, mocked Sleeper + file loads, style of `test_trade_slots.py`)

Fixture leagues: 12-team 1QB PPR; 10-team superflex half-PPR; TE premium (+1.5 rec TE); 14-team deep bench; dynasty-with-picks (profile only). Must-pass, mapped to the prompt:

1. Bench player both sides ≈ 0 lineup change.
2. 2-for-1: best-player receiver wins when the extra player wouldn't start; loses when both would.
3. Same QB-for-WR trade: different verdicts 1QB vs superflex.
4. Third RB sharing a bye with both starters < third RB on a different bye week.
5. Out this week, healthy after: keeps most ROS value (horizon 1 week).
6. Weeks after fantasy final contribute 0.
7. Symmetry: swapping A/B mirrors gains and winner.
8. Market missing/stale: verdict stands, market null, warning.
9. Exceptions → error flag, never "Even".
10. IR player tradable.
11. Greedy `assign_slots` vs brute force on randomized rosters incl. SUPER_FLEX (drives the matching fix if it fails).
12. Uncertainty bands: wider player intervals → wider Even band.

Existing tests: `test_trade_slots.py` is replaced wholesale (all five tests encode the VOR-sum math being rebuilt — named here as required). `test_recommendations.py` cold-shape test updates per decision 9; its live tests stay.

## Validation beyond unit tests

20-30 realistic trades from the user's real leagues (IDs pending, decision 10). For each: our verdict next to FantasyCalc's calculator, FantasyPros' analyzer, Hashtag Football's analyzer — outside results entered by hand with source + date. Manual benchmark only; no FantasyPros/Hashtag data, scrapers, or adapters in this repo (open-source constraint). Bar: every disagreement has an articulable cause (roster need, byes, playoff schedule, superflex). Table shown to the user before the work is called done.

## Constraints

- No new dependencies (stdlib, requests, existing requirements.txt).
- FantasyCalc only via public JSON API, cached, graceful fallback.
- Warm request < 3 s on Vercel, measured before done.
- Code style: short "why" docstrings, honest `None`, never made-up values.
- Small reviewable commits; no push or deploy without asking.
