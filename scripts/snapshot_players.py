#!/usr/bin/env python3
"""Snapshot Sleeper player ID map for Fantasy Hub.

Rosters reference players by Sleeper ID; projections use nflverse GSIS
IDs. The full /players/nfl dump (~15MB) is too big for serverless, so
the weekly cron snapshots a compact map (fantasy positions only) to
data/players/latest.json: {sleeper_id: {n, p, t, r?, do?, dp?}} where
r = search_rank (Sleeper popularity order, NOT draft ADP),
do/dp = depth_chart_order/position (Sleeper's own depth chart).
Nulls are omitted to keep the file small. There is no ECR/ADP in
Sleeper's API — those stay honestly empty downstream.

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
        entry = {"n": name, "p": pos or (fps[0].upper() if fps else None), "t": team}
        # Honest consensus-adjacent signals (see docstring). Omit nulls.
        try:
            rank = p.get("search_rank")
            rank = int(rank) if rank is not None else None
        except (ValueError, TypeError):
            rank = None
        if rank is not None:
            entry["r"] = rank
        try:
            dco = p.get("depth_chart_order")
            dco = int(dco) if dco is not None else None
        except (ValueError, TypeError):
            dco = None
        if dco is not None:
            entry["do"] = dco
        dcp = (p.get("depth_chart_position") or "").upper() or None
        if dcp:
            entry["dp"] = dcp
        out[str(pid)] = entry

    out_dir = Path(__file__).parent.parent / "data" / "players"
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "latest.json", "w") as f:
        json.dump({"count": len(out), "players": out}, f)
    print(f"Wrote {len(out)} player mappings to {out_dir / 'latest.json'}")


if __name__ == "__main__":
    main()
