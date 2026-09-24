#!/usr/bin/env python3
"""Snapshot FantasyCalc redraft trade values for Fantasy Hub.

FantasyCalc derives per-player trade values from millions of real
trades (market price, not a model). The 12-team/1-QB/1-PPR cut is a
league-average baseline — close enough for market-vs-model deltas;
exact league econ still comes from our VBD.

Output data/market/fantasycalc.json is read by api/hubapi.hub_trade
(market package sums in the trade lab) with graceful fallback when
the file is absent or stale — never fail the pipeline on it.

Usage:
    python scripts/snapshot_fantasycalc.py
"""
import json
from datetime import datetime, timezone
from pathlib import Path

import requests

URL = ("https://api.fantasycalc.com/values/current"
       "?isDynasty=false&numQbs=1&numTeams=12&ppr=1")


def main() -> None:
    print("Fetching FantasyCalc redraft values...")
    r = requests.get(URL, timeout=60, headers={"User-Agent": "fantasyhub/1.0"})
    r.raise_for_status()
    items = r.json()
    print(f"  Got {len(items)} players")

    players = {}
    for it in items:
        p = it.get("player") or {}
        sid = str(p.get("sleeperId") or "")
        if not sid:
            continue
        players[sid] = {
            "v": it.get("value", 0),            # market trade value units
            "or": it.get("overallRank"),        # overall rank
            "pr": it.get("positionRank"),       # positional rank
            "t30": it.get("trend30Day", 0),     # 30-day value trend
            "tier": p.get("maybeTier"),
            "adp": p.get("maybeAdp"),
            "rosterPct": p.get("maybeRosterPercent"),
        }

    out_dir = Path(__file__).parent.parent / "data" / "market"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": URL,
        "count": len(players),
        "players": players,
    }
    (out_dir / "fantasycalc.json").write_text(json.dumps(out))
    print(f"  Wrote {len(players)} market values")


if __name__ == "__main__":
    main()
