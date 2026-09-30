"""League-aware trade evaluation: verdict from the optimal-lineup change.

hub_trade/hub_rec_trade wrap this module. Every number derives from the
league's own settings, rosters, and fantasy calendar — never a
league-agnostic value chart. Sections grow task by task: profile +
calendar here, then week projections, lineup delta, verdict.
"""
import math

from scoring import describe_scoring


def fantasy_calendar(settings: dict, current_week: int) -> dict:
    """The league's fantasy calendar: weeks past its final contribute 0.

    Sleeper defaults (start 15, 6 teams) apply when unset and surface
    through the same fields so the UI can show the assumption.
    final_week = start + rounds - 1: a 6-team bracket starting wk 15
    ends in 17 — it never runs to NFL week 18.
    """
    pws = int(settings.get("playoff_week_start") or 15)
    pt = int(settings.get("playoff_teams") or 6) or 6
    rounds = max(1, math.ceil(math.log2(max(2, pt))))
    final = min(18, pws + rounds - 1)
    try:
        cur = max(0, int(current_week or 0))
    except (TypeError, ValueError):
        cur = 0
    return {
        "current_week": cur,
        "last_regular_week": pws - 1,
        "final_week": final,
        "weeks_left": list(range(max(1, cur), final + 1)) if cur <= final else [],
        "playoff_weeks": list(range(pws, final + 1)),
    }


def league_profile(league: dict, st: dict) -> dict:
    """settings_used: what the verdict assumed about this league."""
    s = league.get("settings") or {}
    rp = [str(p or "").upper() for p in (s.get("roster_positions") or [])]
    st = st or {}
    return {
        "league_name": league.get("name"),
        "season": league.get("season"),
        "week": st.get("week"),
        "type": s.get("type", 0),
        "trade_deadline": s.get("trade_deadline"),
        "playoff_round_type": s.get("playoff_round_type"),
        "playoff_teams": s.get("playoff_teams") or 6,
        "playoff_week_start": s.get("playoff_week_start") or 15,
        "num_teams": s.get("num_teams"),
        "scoring_format": describe_scoring(s.get("scoring") or {}),
        "roster_positions": s.get("roster_positions") or [],
        "super_flex": "SUPER_FLEX" in rp,
        "flex_count": sum(1 for p in rp if p in ("FLEX", "WRRB_FLEX", "REC_FLEX", "IDP_FLEX")),
        "qb_slots": sum(1 for p in rp if p == "QB"),
        "bench_count": sum(1 for p in rp if p == "BN"),
        "ir_count": sum(1 for p in rp if p == "IR"),
        "taxi_count": sum(1 for p in rp if p == "TAXI"),
        "calendar": fantasy_calendar(s, st.get("week")),
    }
