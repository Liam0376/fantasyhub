#!/usr/bin/env python3
"""Snapshot Sleeper injury statuses for Fantasy Hub.

The /players/nfl dump (~15MB) is too big for serverless per-request
fetch, so the weekly cron snapshots the compact injury map to
data/injuries/latest.json and api/analytics.py merges it by
normalized name + position.

Usage:
    python scripts/fetch_injuries.py
"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

import requests
from scoring import norm_name as _norm_name


def main() -> None:
    print("Fetching Sleeper player DB...")
    r = requests.get("https://api.sleeper.app/v1/players/nfl", timeout=120)
    r.raise_for_status()
    all_players = r.json()
    print(f"  Got {len(all_players)} players")

    injured = {}
    for pid, p in all_players.items():
        if not isinstance(p, dict):
            continue
        status = (p.get("injury_status") or "").strip()
        if not status or status in ("Healthy",):
            continue
        fp = p.get("fantasy_positions") or []
        pos = (p.get("position") or (fp[0] if fp else "") or "").upper()
        name = p.get("full_name") or f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()
        key = f"{_norm_name(name)}|{pos}"
        if not key.startswith("|"):
            injured[key] = status

    out_dir = Path(__file__).parent.parent / "data" / "injuries"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = {
        # Real UTC instant (naive local .now() + "Z" skewed freshness;
        # see compute_week.py).
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(injured),
        "players": injured,
    }
    with open(out_dir / "latest.json", "w") as f:
        json.dump(out, f)
    print(f"Wrote {len(injured)} injury statuses to {out_dir / 'latest.json'}")


if __name__ == "__main__":
    main()
