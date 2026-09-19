# FantasyHub — agent notes

Project memory lives in claude-mem (`fantasyhub` project). The block below is a
snapshot generated from it; refresh with:
`curl "http://127.0.0.1:37701/api/context/inject?project=fantasyhub"`
Full detail via `get_observations([IDs])` or the mem-search skill.

<claude-mem-context>
# [fantasyhub] recent context, 2026-09-19 1:57pm CST
Mode: Code Development (code)

Legend: 🎯session ●bugfix ◆feature ↻refactor ✓change ○discovery ⚖decision ⚠security_alert ⚷security_note ⊘sensitive
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (16,077t read) | 184,674t work | 91% savings

### Sep 19, 2026
207 2:13a ○ compute_week.py executes silently without output
208 2:14a ○ Background compute_week.py task completed with zero output
209 11:36a ○ Projection output JSON structure confirmed for week 2
210 " ○ ML projections not applied to week 2 output; 0 of 1122 players ML-adjusted
211 " ○ ML import fails silently; ml_predict set to None in compute_week.py
212 11:37a ○ ml_projector imports successfully when api path is added; import fails in compute_week.py context
213 " ○ ML model predictions functional; returns numeric residuals for QB and RB positions
214 11:40a ○ Data flow verification: prior_pbp_data populated, snap_pct_wavg remains hardcoded zero
215 " ○ Vegas lines missing for weeks 4+; schedule CSV has spreads only through week 3
216 " ○ Advanced stats available in nflverse CSV; snap_pct_wavg remains only missing feature
217 " ○ Column name mismatch: compute_week.py seeks 'sacks' but nflverse CSV has 'sacks_suffered' and 'def_sacks'
218 11:41a ○ Sacks column mismatch confirmed; training data also had curr_sacks_wavg=0 (no train/serve skew)
219 " ○ sacks references clarified: team defense uses correct 'def_sacks' column; player stats use wrong 'sacks'
220 " ✓ Fixed sacks column name in training data pipeline: 'sacks' → 'sacks_suffered'
221 11:42a ✓ Fixed sacks column name in training model and inference pipeline: 'sacks' → 'sacks_suffered'
222 " ✓ Added snap_data parameter to compute_projections function signature
223 " ✓ Implemented snap count fetching in main() to populate snap_data for ML inference
224 " ✓ Wired snap_data parameter through compute_projections call; updated hardcoded comment
225 " ✓ Implemented snap_pct_wavg population from snap_data; replaces hardcoded zero with real averages
226 11:43a ✓ Training data rebuilt successfully with sacks_suffered column fix; 20,570 rows generated
227 11:44a ○ sacks_suffered column now properly populated in training data; 98% of QBs have nonzero values
228 " ✓ Model retraining successful; ML projections now pass all deployment gates with -0.212 MAE improvement
229 11:49a ○ compute_week.py silently times out with no output
230 11:50a ○ ML projection pipeline completes successfully; all weekly projections generated
231 11:57a ○ PBP feature population gaps in 2025 WR training data
232 " ○ PBP data at inference keyed by gsis_id, not player name
233 " ○ Inconsistent player ID field handling in compute_week.py
234 11:58a ○ nflverse stats CSV provides player_id in gsis_id format
235 11:59a ○ QB rushing stats configured in projection pipeline; scoring defined for rushing_yards, rushing_tds, carries
236 " ○ QB rushing stats are in COVERED_STATS pipeline; compute_week.py has two-tier projection system
237 " ○ QB rushing projections ARE working; actual output confirms rushing_yards, rushing_tds, carries present
238 12:01p ○ Frontend actively consumes and displays rushing_yards projections for QB and RB
239 " ⚖ Plan: Surface QB rushing stats as top-level fields and add carries to projection pipeline
240 12:03p ✓ Added carries to QB_STATS projection pipeline
241 12:04p ✓ Surfaced QB passing/rushing stats as top-level projection fields
S67 Surface QB rushing yards projections in frontend UI; diagnosed data gap and designed fix (Sep 19 at 12:11 PM)
S68 Verify and deploy market_season_stats field to frontend for displaying aggregated season performance statistics alongside weekly projections (Sep 19 at 12:13 PM)
242 12:14p ◆ Added market_season_stats field to projection output for frontend consumption
243 12:20p ○ ML projection pipeline generates weekly output across weeks 14-18
244 " ○ market_season_stats field verified in projection output with realistic season statistics
245 " ○ market_season_stats calculation verified: per-game averages scaled by total season games
246 12:21p ✓ Frontend build completed successfully with market_season_stats integration
247 " ○ Frontend player card display format verified with market_season_stats aggregation
S69 Verify market_season_stats feature is working end-to-end and ready for deployment; determine status of uncommitted changes (Sep 19 at 12:21 PM)
248 12:23p ✓ latest.json projection file updated with market_season_stats for frontend consumption
S70 Deploy ML projection pipeline to production and commit all changes; verify end-to-end functionality and frontend integration (Sep 19 at 12:24 PM)
250 12:25p ✓ ML pipeline implementation staged for commit across 52 files
251 " ◆ ML projection pipeline committed to main branch (commit 7aded6f)
S71 Complete ML projection pipeline deployment and commit all changes across fantasyhub and parent project repositories (Sep 19 at 12:25 PM)
252 12:26p ✓ Vercel deployment documentation committed to football-sports-analytics (commit 2d88714)
S73 Deploy ML pipeline to production and determine if parent project should also be pushed (Sep 19 at 12:29 PM)
253 12:29p ◆ ML projection pipeline pushed to production (origin/main updated to 7aded6f)
S74 Deploy parent project (gridiron-analytics) to production by pushing unpushed commits to remote master branch (Sep 19 at 12:30 PM)
254 12:33p ○ Parent project remote and unpushed commits verified
255 12:34p ✓ Parent project pushed to remote repository
S75 Verify Vercel deployment configuration for fantasyhub and determine deployment status after pushing changes to main branch (Sep 19 at 12:34 PM)
256 12:36p ○ Vercel project configuration verified for fantasyhub
257 12:46p ○ market_season_stats sourced from comparison data array, mapping by player_id and sleeper_id
S76 Verify whether market_season_stats are sourced from a private repo and properly mapped into the projection output and frontend display (Sep 19 at 12:47 PM)
**Investigated**: Examined enrichPlayer.js (hub/src/lib/enrichPlayer.js) to trace the data flow for market_season_stats: where data originates, how it's matched to players, and how it flows to frontend display fields

**Learned**: market_season_stats originate from compPlayers array (comparison/market data source) passed via opts.compPlayers parameter. Player matching uses dual-ID strategy (player_id/GSIS and sleeper_id) to handle ID format differences between projection source (GSIS) and roster source (Sleeper). enrichPlayer retrieves comp.market_season_stats and exposes it as season_pass_yd, season_rush_yd, season_tds fields. A previous bug (2026-09-10) caused stats to display as 0 when ID matching failed, now fixed in Audit 22.0.

**Completed**: Confirmed market_season_stats wiring is correct end-to-end: projection JSON market_season_stats field → enrichPlayer match via dual-ID lookup → season_* projection fields → frontend player cards and modals. Data flow validated; no frontend rebuild required to use new data.

**Next Steps**: No active work indicated; market_season_stats integration verified as working correctly across projection pipeline, enrichment layer, and frontend consumption


Access 185k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>
