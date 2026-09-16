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
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

import requests


def _norm_name(n: str) -> str:
    n = (n or "").lower()
    n = re.sub(r"\b(jr\.?|sr\.?|ii|iii|iv|v)\b", "", n)
    return re.sub(r"[^a-z0-9 ]", "", n).strip()


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
        "updated_at": __import__("datetime").datetime.now().isoformat() + "Z",
        "count": len(injured),
        "players": injured,
    }
    with open(out_dir / "latest.json", "w") as f:
        json.dump(out, f)
    print(f"Wrote {len(injured)} injury statuses to {out_dir / 'latest.json'}")


if __name__ == "__main__":
    main()
