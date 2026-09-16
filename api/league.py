"""Fetch league data from Sleeper API."""
import requests

BASE = "https://api.sleeper.app/v1"


def fetch_league(league_id: str) -> dict:
    """Fetch league settings, rosters, and users from Sleeper."""
    league_id = str(league_id).strip()

    # League settings
    r = requests.get(f"{BASE}/league/{league_id}", timeout=10)
    r.raise_for_status()
    league = r.json()

    # Rosters
    r = requests.get(f"{BASE}/league/{league_id}/rosters", timeout=10)
    r.raise_for_status()
    rosters = r.json()

    # Users
    r = requests.get(f"{BASE}/league/{league_id}/users", timeout=10)
    r.raise_for_status()
    users = r.json()

    # Build user map: user_id -> display info
    user_map = {}
    for u in users:
        user_map[u["user_id"]] = {
            "display_name": u.get("display_name") or u.get("username") or "Unknown",
            "team_name": u.get("metadata", {}).get("team_name") or u.get("display_name") or "Unknown",
            "avatar": u.get("avatar"),
        }

    # Build roster list
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

    # Extract scoring and roster settings
    scoring = league.get("scoring_settings", {})
    roster_positions = league.get("roster_positions", [])

    # Determine budget from draft or settings
    budget = 200  # default
    try:
        drafts = league.get("drafts") or []
        for d in drafts:
            if d.get("type") == "auction":
                budget = d.get("settings", {}).get("budget", 200)
                break
    except Exception:
        pass

    return {
        "league_id": league_id,
        "name": league.get("name", "Unknown League"),
        "season": int(league.get("season", 2026)),
        "settings": {
            "scoring": scoring,
            "roster_positions": roster_positions,
            "budget": budget,
            "num_teams": league.get("total_rosters", len(teams)),
        },
        "teams": teams,
    }
