"""Fetch league data from Sleeper API."""
import requests

BASE = "https://api.sleeper.app/v1"


def fetch_league(league_id: str) -> dict:
    """Fetch league settings, rosters, and users from Sleeper."""
    league_id = str(league_id).strip()

    r = requests.get(f"{BASE}/league/{league_id}", timeout=10)
    r.raise_for_status()
    league = r.json()

    r = requests.get(f"{BASE}/league/{league_id}/rosters", timeout=10)
    r.raise_for_status()
    rosters = r.json()

    r = requests.get(f"{BASE}/league/{league_id}/users", timeout=10)
    r.raise_for_status()
    users = r.json()

    user_map = {}
    for u in users:
        user_map[u["user_id"]] = {
            "display_name": u.get("display_name") or u.get("username") or "Unknown",
            "team_name": u.get("metadata", {}).get("team_name") or u.get("display_name") or "Unknown",
            "avatar": u.get("avatar"),
        }

    teams = []
    for rost in rosters:
        rid = str(rost.get("roster_id", ""))
        owner_id = str(rost.get("owner_id", ""))
        user_info = user_map.get(owner_id, {})
        teams.append({
            "roster_id": rid,
            "owner_id": owner_id,
            "display_name": user_info.get("display_name", f"Team {rid}"),
            "team_name": user_info.get("team_name", f"Team {rid}"),
            "avatar": user_info.get("avatar"),
            "players": rost.get("players") or [],
            "wins": rost.get("wins", 0),
            "losses": rost.get("losses", 0),
            "ties": rost.get("ties", 0),
            "fpts": rost.get("fpts", 0),
            "fpts_against": rost.get("fpts_against", 0),
        })

    scoring = league.get("scoring_settings", {})
    roster_positions = league.get("roster_positions", [])

    # Auction budget + draft type come from the drafts endpoint, never
    # hardcoded. League object has no drafts key — must fetch separately.
    draft_type = "unknown"
    budget = None
    draft_teams = None
    try:
        dr = requests.get(f"{BASE}/league/{league_id}/drafts", timeout=10)
        if dr.ok:
            for d in dr.json() or []:
                dtype = (d.get("type") or "").lower()
                dset = d.get("settings") or {}
                if dtype == "auction":
                    draft_type = "auction"
                    budget = int(dset.get("budget") or 200)
                    draft_teams = int(dset.get("teams") or 0) or None
                    break
                elif dtype in ("snake", "linear"):
                    if draft_type == "unknown":
                        draft_type = dtype
    except Exception:
        pass
    if budget is None:
        # Snake leagues have no auction budget; keep None so the UI
        # hides the auction tab instead of showing fake $200 values.
        budget = 200 if draft_type == "auction" else 0

    return {
        "league_id": league_id,
        "name": league.get("name", "Unknown League"),
        "season": int(league.get("season", 2026)),
        "settings": {
            "scoring": scoring,
            "roster_positions": roster_positions,
            "budget": budget,
            "draft_type": draft_type,
            "num_teams": league.get("total_rosters") or draft_teams or len(teams),
        },
        "teams": teams,
    }
