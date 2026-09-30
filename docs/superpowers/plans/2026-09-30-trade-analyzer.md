# Trade Analyzer Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the trade verdict so it derives from each team's optimal-lineup change week by week, under the league's own settings, calendar, and rosters.

**Architecture:** New `api/trade_engine.py` holds all math; `hubapi.hub_trade` / `hub_rec_trade` become thin wrappers. One `build_rosters` call per request feeds everything. FantasyCalc becomes a league-matched, cached context source (`api/market.py` + fixed snapshot script). `assign_slots` becomes an optimal assignment (validated against brute force).

**Tech Stack:** Python 3.12, stdlib + `requests` (already a dependency). pytest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-30-trade-analyzer-design.md`

## Global Constraints

- Verdict = lineup points only; market never blended in (spec decision 4).
- Playoff weight 1.25×, only for teams inside the playoff field (decision 2).
- Injury horizon: Out = 1 week, IR = 4 weeks, Q/D = current week; engine-side on raw week files (decision 5).
- Legacy output fields kept verbatim with the same sign conventions (spec Output contract).
- No new dependencies. FantasyCalc via public API only, cached, graceful.
- IR/taxi players tradable. One `fetch_league` per request.
- Errors return `{"winner": null, "cold": true, "error": ...}`, never fake "Even".
- Small reviewable commits; no push or deploy without asking the user.
- Code style: short "why" docstrings, honest `None`, never made-up values.

## Review Focus

- **Week file missing for a future week** (pipeline gap mid-season) → engine falls back to the nearest earlier file for that week, flags `data_freshness.projections` and adds a warning; never crashes. Test in Task 2.
- **Traded ID on the wrong team or on neither roster** → cross-team ID goes to `unknown_ids` with a warning; the package evaluation proceeds without it. Test in Task 7.
- **League with `playoff_week_start` null/missing** (Sleeper default) → calendar assumes `playoff_week_start=15`, `playoff_teams=6`… no, assumes the Sleeper defaults 15/6 and reports the assumption in `settings_used`. Test in Task 1.
- **Packages containing K/DEF** (allowed on Sleeper) → rescored via `score_avg_stats`/`score_team_def`, slotted like any starter, no special-case crash. Test in Task 4.
- **Team over/under the roster limit before the trade** (taxi squads, mid-season drops) → drops/fills target `len(roster_positions)` exactly; already-under teams still fill opens, already-over teams still drop lowest. Test in Task 4.

---

### Task 1: League profile + fantasy calendar

**Files:**
- Modify: `api/league.py` (`fetch_league` settings block, ~line 153-172)
- Create: `api/trade_engine.py` (profile + calendar section)
- Test: `api/test_trade_engine.py`

**Interfaces:**
- Consumes: `fetch_league(league_id, include_traded_picks=False)` (this task adds the param and settings keys).
- Produces: `fantasy_calendar(settings: dict, current_week: int) -> dict` returning `{"current_week", "last_regular_week", "final_week", "weeks_left": [int...], "playoff_weeks": [int...]}`; `league_profile(league: dict, st: dict) -> dict` returning the `settings_used` block (scoring summary via `describe_scoring`, roster shape incl. `super_flex`, flex counts, bench/IR/taxi counts, `num_teams`, `type`, `trade_deadline`, calendar). `fetch_league` settings gains: `type` (int, `league["settings"]["type"]`), `trade_deadline`, `playoff_round_type`, `playoff_teams` default 6, `playoff_week_start` default 15 when missing; top-level `traded_picks` list of `{"season", "round", "roster_id", "previous_owner_id", "new_owner_id"}` when `include_traded_picks=True` (else `[]`).

- [ ] **Step 1: Write the failing tests**

```python
# in api/test_trade_engine.py — fixture helpers _league(**overrides), _st(week=7)
def test_calendar_6_team_playoffs_from_week_15():
    cal = fantasy_calendar({"playoff_week_start": 15, "playoff_teams": 6}, 7)
    assert cal["weeks_left"] == list(range(7, 18))       # final = 15 + ceil(log2 6) = 18
    assert cal["playoff_weeks"] == [15, 16, 17]
    assert cal["final_week"] == 18

def test_calendar_missing_playoff_settings_assumes_defaults():
    cal = fantasy_calendar({}, 5)
    assert cal["last_regular_week"] == 14                # defaults 15/6, reported
    assert cal["weeks_left"][0] == 5

def test_fetch_league_keeps_type_and_deadline(monkeypatch):  # monkeypatch requests.get
    lg = fetch_league("1", include_traded_picks=True)
    assert lg["settings"]["type"] == 2                   # from fixture league JSON
    assert lg["settings"]["trade_deadline"] == 123
    assert lg["traded_picks"][0]["round"] == 2           # from /traded_picks fixture
    assert fetch_league("1")["traded_picks"] == []       # opt-in only
```

- [ ] **Step 2: Run tests to verify they fail** — `pytest api/test_trade_engine.py -v`; expect `ImportError`/`AttributeError`.
- [ ] **Step 3: Implement** — `fetch_league` param + settings keys + `/league/{id}/traded_picks` fetch (same try/except-soft pattern as `/drafts`); `fantasy_calendar` with `final_week = min(18, playoff_week_start + math.ceil(math.log2(playoff_teams)))`; `league_profile` reading the new keys. `describe_scoring` already exists in `scoring.py`.
- [ ] **Step 4: Run tests to verify they pass** — `pytest api/test_trade_engine.py -v`.
- [ ] **Step 5: Commit** — `git add api/league.py api/trade_engine.py api/test_trade_engine.py && git commit -m "feat(trade): league profile with type, deadline, traded picks, fantasy calendar"`

### Task 2: Week-by-week league-scored projections

**Files:**
- Modify: `api/trade_engine.py`
- Test: `api/test_trade_engine.py`

**Interfaces:**
- Consumes: `analytics.rescore_player(avg, scoring, pos, ml_adjustment)` (existing), `conformal.interval_fields(pos, pts)` (existing), `scoring.score_team_def` (existing), injuries snapshot `data/injuries/latest.json` via `analytics._load_injuries()`.
- Produces: `load_week_points(settings: dict, weeks: list, rostered_names: set, fa_limit=60) -> dict[int, dict]` — `{week: {(norm_name, pos): {"pts", "lo", "hi", "pos", "team", "bye", "inj"}}}` plus `("DEF", team)` entries keyed `("DEF_<TEAM>", "DEF")`. Loads `data/projections/{season}_week_{NN:02d}.json` directly (NOT `get_projections` — engine owns injury horizons). Per week keeps rostered names + top-`fa_limit` remaining by pts. Instance-level cache keyed `(season, week, scoring-hash)`.

- [ ] **Step 1: Write the failing tests**

```python
def test_rescore_uses_league_scoring(monkeypatch):   # fixture week file via monkeypatched open
    pts = load_week_points(_settings(rec=1.0), [5], {"Jahmyr Gibbs"}, fa_limit=0)
    ppr = pts[5][(_norm("Jahmyr Gibbs"), "RB")]["pts"]
    half = load_week_points(_settings(rec=0.5), [5], {"Jahmyr Gibbs"}, fa_limit=0)
    assert abs((ppr - half) - 0.5 * rec_count_fixture) < 0.01

def test_bye_week_scores_zero(): ...
def test_out_injury_discounted_one_week_only():      # Out: wk7 x0.6, wk8 full
def test_ir_injury_discounted_four_weeks_only():    # IR: wks 7-10 x0.6, wk 11 full
def test_missing_week_file_falls_back_with_warning():  # wk 9 absent -> uses wk 8 rows, warning set
```

- [ ] **Step 2: Run tests to verify they fail**.
- [ ] **Step 3: Implement** — per week: parse file, keep rostered + top FA rows, rescore offense via `rescore_player`, DEF rows via `score_team_def`, intervals via `interval_fields`, bye → pts 0, apply horizon multipliers per injury status (`data/injuries/latest.json` keyed `norm_name|POS`), fallback to nearest earlier existing file + `"fallback_week"` marker on the week dict. Return warnings via a second return value: `load_week_points(...) -> (weeks: dict, warnings: list)`.
- [ ] **Step 4: Run tests to verify they pass**.
- [ ] **Step 5: Commit** — `git commit -m "feat(trade): per-week league-scored projections with bye and injury horizon"`

### Task 3: Optimal lineup assignment

**Files:**
- Modify: `api/rosters.py::assign_slots` (~line 111-145)
- Test: `api/test_assign_optimal.py`

**Interfaces:**
- Produces: `assign_slots(players, roster_positions)` — unchanged signature and labels; internally an optimal (max total points) assignment instead of first-fit greedy.
- Consumes: `rosters._slot_eligible` (existing).

- [ ] **Step 1: Write the failing test** — seeded fuzz vs brute force:

```python
def _brute_force_total(pool, rp): ...          # itertools.permutations over eligible picks

def test_greedy_vs_brute_force_randomized():   # 100 seeds, real Sleeper shapes:
    # shapes: 1QB; superflex (QB+SF+2RB+3WR+TE+2FLEX);
    # WRRB_FLEX+REC_FLEX+FLEX mix; K+DEF leagues
    for seed in range(100):
        pool, rp = _random_roster(seed)
        greedy_total = _total(assign_slots(pool, rp))
        assert greedy_total == _brute_force_total(pool, rp), seed

def test_superflex_q2_over_rb1():              # the known greedy counterexample:
    # QB1=22, QB2=18, RB1=20, RB2=8 -> optimal starts QB1+SF:QB2+RB1 = 60
    starters, _ = assign_slots(pool, ["QB", "SUPER_FLEX", "RB", "BN"])
    assert _total(starters) == 60.0
```

- [ ] **Step 2: Run tests to verify they fail** — expect the superflex test and some fuzz seeds to fail greedy.
- [ ] **Step 3: Implement** — replace the greedy fill in `assign_slots` with max-weight bipartite matching over slots × players (weights = weekly pts if eligible else excluded). Small n (≤16 slots × ~30 players): successive augmenting-path assignment maximizing weight, deterministic tie-break (higher pts, then canonical slot order, then sleeper_id). Slot labels assigned after matching by canonical slot order. Bench list unchanged (everyone unused).
- [ ] **Step 4: Run tests to verify they pass** — including full existing suite: `pytest api/ -x -q` (start-sit and rosters views now get optimal lineups; any existing test that encoded a suboptimal greedy lineup updates with a note in the commit message).
- [ ] **Step 5: Commit** — `git commit -m "fix(rosters): optimal slot assignment (greedy lost total on superflex/flex mixes)"`

### Task 4: Lineup delta engine (drops, adds, 2-for-1)

**Files:**
- Modify: `api/trade_engine.py`
- Test: `api/test_trade_engine.py`

**Interfaces:**
- Consumes: `assign_slots` (Task 3), `load_week_points` (Task 2), `fantasy_calendar` (Task 1).
- Produces: `team_week_points(players: list, week_pts: dict, rp: list) -> float` (optimal lineup total for a player list at one week, on rescored points); `marginal_value(player, roster, weeks_pts, rp, weights) -> float` = Σ weeks `weight × (lineup with − lineup without)`; `apply_trade(team: dict, incoming: list, outgoing: list, weeks_pts, rp, roster_limit) -> {"before", "after", "drops", "adds", "weekly_delta"}` — `drops[]` entries `{"player_name", "position", "value"}` when the roster exceeds the limit (drop lowest marginal value), `adds[]` per-week FA fills `{"player_name", "position", "week", "value"}` when under it (best FA by marginal value, from `load_week_points` non-rostered rows).
- Roster limit = `len(roster_positions)`; reserve/taxi players never enter lineups (existing `build_rosters` split).

- [ ] **Step 1: Write the failing tests**

```python
def test_bench_player_neither_side_starts():       # prompt case 1
    # WR5 who starts for neither: gains ~0 for both (within 0.5 pts)
def test_two_for_one_best_player_wins_when_extra_benches():  # prompt case 2a
def test_two_for_one_loses_when_both_start():       # prompt case 2b
def test_drop_charges_marginal_injury_cover():     # dropped handcuff covers an Out week
def test_add_fills_open_slot_with_best_fa():       # under limit: FA fill reported, credited
def test_over_limit_drops_lowest_marginal():       # pre-existing over-limit roster still drops
def test_k_and_def_in_packages_resolve():          # review focus: K/DEF no crash
def test_symmetry_mirrors():                        # prompt case 8 (A↔B swaps gains sign)
```

- [ ] **Step 2: Run tests to verify they fail**.
- [ ] **Step 3: Implement** — as in Interfaces; FA pool = week rows whose `(norm_name, pos)` is on no roster (starters+bench+reserve+taxi across all teams); FA fills chosen per week by marginal value, reported once per player with summed value; drops decided once on full-weeks marginal value.
- [ ] **Step 4: Run tests to verify they pass**.
- [ ] **Step 5: Commit** — `git commit -m "feat(trade): lineup-delta engine with roster moves as marginal lineup value"`

### Task 5: Verdict, playoff weighting, needs, direction

**Files:**
- Modify: `api/trade_engine.py`
- Test: `api/test_trade_engine.py`

**Interfaces:**
- Consumes: Task 4 outputs, `calendar`, standings from `build_rosters` teams.
- Produces: `playoff_weight(week, cal, team, direction) -> float` (1.25 iff week in `playoff_weeks` and team seeded ≤ `playoff_teams` by wins→fpts, or direction override `contend`; `rebuild` override forces 1.0); `direction_of(team, teams, playoff_teams) -> "contend"|"middle"|"rebuild"`; `needs_of(team, teams, weeks_pts, rp) -> [{"position", "gap", "bye_cluster"}...]` (team's optimal starter avg vs league-median starter per group; bye weeks where ≥2 starters at a group share a bye); `verdict(gains_a, gains_b, k) -> {"winner", "band", "edge_pct"}`; `acceptance(partner_gain, k, market_gap_pct) -> "likely"|"possible"|"unlikely"` (spec Part 6: likely = partner gain ≥ 0 and market within 15%; possible = partner gain ≥ −0.5k or market within 30%; market `None` → lineup delta only); `uncertainty_k(pkg_a_pts, pkg_b_pts) -> float` per spec Part 6 formula; `evaluate_trade(...)` assembling `{team_a, team_b, calendar, settings_used, confidence, acceptance, warnings}` (public entry, completed by Task 7 wiring).

- [ ] **Step 1: Write the failing tests**

```python
def test_same_qb_wr_trade_differs_1qb_vs_superflex():   # prompt case 3
def test_third_rb_same_bye_worth_less():                # prompt case 4
def test_short_injury_keeps_most_ros():                 # prompt case 5 (Out 1 wk only)
def test_weeks_after_fantasy_final_zero():              # prompt case 6 (cal final=17, week 18 row = 0)
def test_playoff_weight_only_for_playoff_field():       # seed 5/6 at 1.25, seed 7 at 1.0
def test_wider_intervals_widen_even_band():             # prompt case 12
def test_acceptance_likely_partner_gains():             # partner gain>0 + market within 15% -> "likely"
def test_needs_reported_per_team():                     # thin WR vs league median
```

- [ ] **Step 2: Run tests to verify they fail**.
- [ ] **Step 3: Implement** — per Interfaces; `edge_pct` = `|gain_a − gain_b| / avg weekly starting total`; Even bands per spec `k`/`2k`.
- [ ] **Step 4: Run tests to verify they pass**.
- [ ] **Step 5: Commit** — `git commit -m "feat(trade): calendar-weighted verdict with uncertainty bands, needs, direction"`

### Task 6: FantasyCalc market — league-matched, cached, coverage

**Files:**
- Create: `api/market.py`
- Modify: `scripts/snapshot_fantasycalc.py`
- Test: `api/test_trade_market.py`

**Interfaces:**
- Produces: `fc_params(settings) -> {"isDynasty": bool, "numQbs": 1|2, "numTeams": int, "ppr": 0|0.5|1}`; `fc_fetch(params, timeout=10) -> list` (public API, UA `fantasyhub/1.0`); `fc_load(settings) -> dict` — default-combo file first, else live fetch under module-level TTL cache (6 h), else `{}` + warning; `parse_fc(items) -> dict[sleeper_id, {"v", "t30", "tier", "adp", "roster_pct", "msd", "freq"}]` reading the seven fields from item top level.
- Consumes: `data/market/fantasycalc.json` (default combo, cron-written).

- [ ] **Step 1: Write the failing tests** — fixture items with `maybeTier` etc. at top level and `player.sleeperId` nested:

```python
def test_params_from_league_settings():          # SF league -> numQbs=2; type=2 -> isDynasty; rec=0.5 -> ppr=0.5
def test_parse_reads_top_level_fields():         # tier/adp/msd/freq non-null (the bug)
def test_missing_player_null_not_zero():         # package entry market=None, excluded from sums
def test_market_down_still_verdict():            # prompt case 9: fc_load -> {}, verdict + warning
def test_default_combo_uses_file_no_network():   # monkeypatch requests.get -> raise; file path wins
```

- [ ] **Step 2: Run tests to verify they fail**.
- [ ] **Step 3: Implement** — `api/market.py` per Interfaces; snapshot script rewired onto `fc_params`/`fc_fetch`/`parse_fc` (writes the same default file) — script imports from `api/` via `sys.path` insert, matching `scripts/compute_week.py` conventions.
- [ ] **Step 4: Run tests to verify they pass** — plus `python scripts/snapshot_fantasycalc.py` once manually: file count > 190, `tier` values non-null.
- [ ] **Step 5: Commit** — `git commit -m "fix(market): league-matched FantasyCalc params, top-level field parse, TTL cache, coverage"`

### Task 7: Output contract + failure handling + wiring

**Files:**
- Modify: `api/hubapi.py` (`hub_trade`, `hub_rec_trade`, delete `_trade_pkg_value`/`_slot_fill`/`_pkg_entry`/`_injury_mult` trade usages), `api/index.py` (pass `direction_a`/`direction_b`), `api/trade_engine.py` (error wrapper)
- Test: `api/test_trade_slots.py` (replaced), `api/test_recommendations.py` (cold test updated)

**Interfaces:**
- Consumes: `evaluate_trade` (Tasks 4-6), `fc_load` (Task 6), `build_rosters` (existing).
- Produces: `hub_trade(league_id, team_a_id, team_b_id, traded_a, traded_b, direction_a=None, direction_b=None)` — legacy fields verbatim (spec Output contract: `winner`, `recommendation`, `value_difference` positive = A wins, `team_*_ros`/`team_*_weekly` = post-trade lineup totals, `packages.a/b[]` entries with `weekly`/`ros`/`market`/`trend30`, `market_a/b` covered-only sums, `market_coverage_*`, `slots.*` with `remaining_games` = weeks to fantasy final, plus every new block). `hub_rec_trade` same signature + `timestamp`, error path `{"winner": None, "cold": True, "error": msg}`.

- [ ] **Step 1: Write the failing tests** — replace `test_trade_slots.py` wholesale (old five tests encode the VOR-sum math this rebuild deletes; that's the named reason):

```python
def test_contract_legacy_fields_present():       # every field the bundle reads, incl. slots.* shape
def test_unknown_id_reported_not_dropped():      # prompt case: unknown_ids[] + warning
def test_ir_player_tradable():                   # prompt case 10: reserve-list ID matches
def test_deadline_passed_flags():                # warning + deadline_passed true, still evaluates
def test_exception_returns_error_never_even():   # prompt case 9/decision 9 (both endpoints)
def test_no_packages_legacy_mode_even():        # degenerate: no trade -> Even, roster totals
```

Update `test_recommendations.py::test_trade_cold_shape`: asserts `winner is None`, `cold is True`, `"error"` in out (it encoded the fake-Even flaw). Live tests unchanged.

- [ ] **Step 2: Run tests to verify they fail**.
- [ ] **Step 3: Implement** — wiring per Interfaces; `_slot_fill`/`hub_waiver` re-entry deleted from the trade path (waiver endpoint untouched); one `build_rosters` + one `fetch_league(include_traded_picks=True)` per request, shared into every step; unknown/cross-team IDs → `unknown_ids`; `settings_used`, `data_freshness`, `calendar`, team blocks, `confidence`, `acceptance`, `market` block, `warnings` populated from earlier tasks' returns.
- [ ] **Step 4: Run the full suite** — `pytest api/ -q` (add `-m "not network"` first, then live smoke on the real league: `curl "localhost:3000/hub-api/trade?..."`-equivalent via `hub_rec_trade` print, verify bundle fields non-empty).
- [ ] **Step 5: Commit** — `git commit -m "feat(trade): wire lineup-delta verdict into hub_trade with full output contract"`

### Task 8: Performance + validation benchmark

**Files:**
- Create: `docs/superpowers/trade-benchmark.md`
- Modify: `api/trade_engine.py` only if measurements demand it (compact week files from `compute_week.py`)

**Interfaces:**
- Consumes: finished engine; user-supplied league IDs (pending — ask when this task starts; validation table cannot close without them).

- [ ] **Step 1: Measure warm latency** — 10 consecutive calls of `hub_trade` on the real 12-team league (single process, caches warm): median < 3 s. Record numbers in the benchmark doc. If > 2 s (decision 8 threshold): add compact per-week trade file to `compute_week.py` output (rostered + top-100 rows only, `avg_stats`/`ml_adjustment`/`bye` fields) and re-measure.
- [ ] **Step 2: Build the benchmark table** — 20-30 realistic trades across the user's leagues; columns: our verdict (winner, band, gain/week), FantasyCalc calculator result, FantasyPros result, Hashtag Football result, source+date, disagreement reason (roster need / byes / playoff schedule / superflex). Outside results entered by hand — never committed data, scrapers, or adapters for FantasyPros/Hashtag.
- [ ] **Step 3: Show the table to the user** — every disagreement must carry a cause the engine can show. Work is done only after the user accepts the table.
- [ ] **Step 4: Commit** — `git commit -m "docs(trade): validation benchmark + warm latency measurements"`
