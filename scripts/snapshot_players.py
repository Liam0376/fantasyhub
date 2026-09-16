#!/usr/bin/env python3
"""Snapshot Sleeper player ID map for Fantasy Hub.

Rosters reference players by Sleeper ID; projections use nflverse GSIS
IDs. The full /players/nfl dump (~15MB) is too big for serverless, so
the weekly cron snapshots a compact map (fantasy positions only) to
data/players/latest.json: {sleeper_id: {n, p, t}}.

Usage:
    python scripts/snapshot_players.py
"""
import json
import sys
from pathlib import Path

import requests

# Positions that can appear in a fantasy lineup. Everything else
# (OT/G/C/LS/P/...) is dead weight for the map.
KEEP = {"QB", "RB", "WR", "TE", "K",
        "DL", "LB", "DB", "DE", "DT", "CB", "S", "SAF", "FS", "SS",
        "MLB", "ILB", "OLB", "NT", "EDGE", "FB"}


def main() -> None:
    print("Fetching Sleeper player DB...")
    r = requests.get("https://api.sleeper.app/v1/players/nfl", timeout=120)
    r.raise_for_status()
    all_players = r.json()
    print(f"  Got {len(all_players)} players")

    out = {}
    for pid, p in all_players.items():
        if not isinstance(p, dict):
            continue
        pos = (p.get("position") or "").upper()
        fps = p.get("fantasy_positions") or []
        if pos not in KEEP and not (set(fps or []) & KEEP):
            continue
        name = p.get("full_name") or f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()
        if not name:
            continue
        team = (p.get("team") or "").upper() or None
        out[str(pid)] = {"n": name, "p": pos or (fps[0].upper() if fps else None), "t": team}

    out_dir = Path(__file__).parent.parent / "data" / "players"
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "latest.json", "w") as f:
        json.dump({"count": len(out), "players": out}, f)
    print(f"Wrote {len(out)} player mappings to {out_dir / 'latest.json'}")


if __name__ == "__main__":
    main()
