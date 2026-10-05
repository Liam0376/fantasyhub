#!/usr/bin/env python3
"""Snapshot FantasyCalc redraft trade values for Draftly.

Default league-average cut (12-team/1-QB/PPR) for market-vs-model
deltas; exact league econ still comes from our VBD. Non-default
combos fetch live at request time (api/market.py TTL cache).

Output data/market/fantasycalc.json feeds the trade engine's market
context with graceful fallback when absent or stale — never fail the
pipeline on it.

Usage:
    python scripts/snapshot_fantasycalc.py
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

from market import _DEFAULT_PARAMS, fc_fetch, parse_fc


def main() -> None:
    print("Fetching FantasyCalc redraft values...")
    items = fc_fetch(_DEFAULT_PARAMS)
    print(f"  Got {len(items)} players")
    players = parse_fc(items)

    out_dir = Path(__file__).parent.parent / "data" / "market"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": "https://api.fantasycalc.com/values/current",
        "params": _DEFAULT_PARAMS,
        "count": len(players),
        "players": players,
    }
    (out_dir / "fantasycalc.json").write_text(json.dumps(out))
    print(f"  Wrote {len(players)} market values")


if __name__ == "__main__":
    main()
