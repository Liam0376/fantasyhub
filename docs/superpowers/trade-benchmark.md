# Trade Analyzer Validation Benchmark

Status: LATENCY DONE — trade table PENDING (needs the user's real league IDs).

## Warm latency (2026-09-30, real 12-team PPR league 1397736035240173568)

Legacy full-eval `hub_trade('...', '1', '2')`, 10 consecutive warm calls:

| Build | Median warm |
|---|---|
| Pre-optimization | 13.1 s |
| + regex hoist, `_slot_eligible` cache, exact fill prune | 3.1 s |
| + per-position slot lists, `norm_name` cache | **2.35 s** |

Target was < 3 s warm. Breakdown at 2.35 s: ~0.6 s Sleeper
(`build_rosters` + `fetch_league` with traded picks), ~1.8 s engine
(36k optimal assignments across 14 weeks × teams × drops/fills).

All perf changes are exact (same outputs): hoisted regexes, memoized
pure functions, best-first fill prune (gain ≤ player's own points),
per-position eligible-slot lists. No compact per-week file needed —
direct 1.1 MB week-file loads stay (decision 8: optimize only if slow;
it wasn't, after the engine fixes).

## Trade table (TODO)

20-30 realistic trades across the user's leagues. Columns per trade:
our verdict (winner, band, gain/week) | FantasyCalc calculator |
FantasyPros analyzer | Hashtag Football analyzer | source + date |
disagreement reason (roster need / byes / playoff schedule / superflex).

Outside results entered by hand — no FantasyPros/Hashtag data,
scrapers, or adapters in this repo (open-source constraint). Bar:
every disagreement carries a cause the engine can show.

Needed from user: league IDs (12-team PPR test league + any
superflex / half-PPR / TE-premium / 14-team / dynasty leagues).
