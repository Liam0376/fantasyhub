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
        avatar = u.get("avatar")
        user_map[u["user_id"]] = {
            "display_name": u.get("display_name") or u.get("username") or "Unknown",
            "team_name": u.get("metadata", {}).get("team_name") or u.get("display_name") or "Unknown",
            "avatar": avatar,
            "avatar_url": f"https://sleepercdn.com/avatars/{avatar}" if avatar else None,
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
            "avatar_url": user_info.get("avatar_url"),
            "players": rost.get("players") or [],
            "starters": rost.get("starters") or [],
            "reserve": rost.get("reserve") or [],
            "taxi": rost.get("taxi") or [],
            "wins": rost.get("wins", 0),
            "losses": rost.get("losses", 0),
            "ties": rost.get("ties", 0),
            "fpts": rost.get("fpts", 0),
            "fpts_against": rost.get("fpts_against", 0),
            "fpts_decimal": rost.get("fpts_decimal", 0),
        })

    scoring = league.get("scoring_settings", {})
    roster_positions = league.get("roster_positions", [])
    league_settings = league.get("settings") or {}
    season_year = str(league.get("season", ""))

    # Drafts: budget, type, status, and actual picks all come from the
    # drafts endpoint. Prefer the draft matching the league season
    # (dynasty leagues accumulate old drafts).
    draft_type = "unknown"
    draft_status = None
    draft_id = league.get("draft_id")
    budget = None
    budget_source = "none"
    draft_teams = None
    draft_rounds = None
    draft_picks = []
    try:
        dr = requests.get(f"{BASE}/league/{league_id}/drafts", timeout=10)
        drafts = dr.json() if dr.ok else []
        season_match = [d for d in drafts if str(d.get("season", "")) == season_year]
        pool = season_match or drafts
        # Prefer auction when a season has both (startup + rookie).
        pool = sorted(pool, key=lambda d: 0 if (d.get("type") or "") == "auction" else 1)
        if pool:
            d = pool[0]
            dtype = (d.get("type") or "").lower()
            dset = d.get("settings") or {}
            draft_id = d.get("draft_id") or draft_id
            draft_status = d.get("status")
            draft_rounds = dset.get("rounds")
            draft_teams = int(dset.get("teams") or 0) or draft_teams
            if dtype == "auction":
                draft_type = "auction"
                if dset.get("budget"):
                    budget = int(dset["budget"])
                    budget_source = "draft"
            elif dtype in ("snake", "linear"):
                draft_type = dtype
    except Exception:
        pass
    if budget is None:
        # Auction without readable budget (shouldn't happen) falls back
        # to the Sleeper default and says so; snake has no budget.
        if draft_type == "auction":
            budget, budget_source = 200, "default"
        else:
            budget, budget_source = 0, "none"

    # Actual draft results (auction amounts / snake order) for model-vs-paid.
    if draft_id:
        try:
            pr = requests.get(f"{BASE}/draft/{draft_id}/picks", timeout=15)
            if pr.ok:
                for p in pr.json() or []:
                    md = p.get("metadata") or {}
                    draft_picks.append({
                        "player_id": p.get("player_id"),
                        "first_name": md.get("first_name", ""),
                        "last_name": md.get("last_name", ""),
                        "position": md.get("position", ""),
                        "team": md.get("team", ""),
                        "amount": p.get("metadata", {}).get("amount"),
                        "bid_amount": p.get("bid_amount"),
                        "pick_no": p.get("pick_no"),
                        "round": p.get("round"),
                        "draft_slot": p.get("draft_slot"),
                        "is_keeper": p.get("is_keeper"),
                    })
        except Exception:
            pass

    return {
        "league_id": league_id,
        "name": league.get("name", "Unknown League"),
        "season": int(league.get("season", 2026)),
        "status": league.get("status"),
        "sport": league.get("sport"),
        "settings": {
            "scoring": scoring,
            "roster_positions": roster_positions,
            "budget": budget,
            "budget_source": budget_source,
            "draft_type": draft_type,
            "draft_status": draft_status,
            "draft_rounds": draft_rounds,
            "num_teams": league.get("total_rosters") or draft_teams or len(teams),
            "waiver_budget": league_settings.get("waiver_budget"),
            "waiver_type": league_settings.get("waiver_type"),
            "playoff_teams": league_settings.get("playoff_teams"),
            "playoff_week_start": league_settings.get("playoff_week_start"),
        },
        "teams": teams,
        "draft_picks": draft_picks,
    }
