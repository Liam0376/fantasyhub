"""League-aware trade evaluation: verdict from the optimal-lineup change.

hub_trade/hub_rec_trade wrap this module. Every number derives from the
league's own settings, rosters, and fantasy calendar — never a
league-agnostic value chart. Sections grow task by task: profile +
calendar here, then week projections, lineup delta, verdict.
"""
import json
import math
import os

from analytics import _load_injuries, rescore_player
from conformal import interval_fields
from rosters import assign_slots
from scoring import describe_scoring, norm_name, roster_group, score_team_def

_PROJ_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "projections")

# Raw parsed week files cached per instance — the JSON parse is the cost;
# rescoring (arithmetic) stays per-request so league scoring is always live.
_RAW_CACHE: dict = {}


def _load_raw(season, week: int):
    """Parsed week file, or None when absent (missing is not an error —
    the caller falls back to the nearest earlier week and warns). Keyed
    with _PROJ_DIR so tests (or a relocated data dir) can't poison the
    cache with a different directory's rows."""
    key = (str(_PROJ_DIR), season, int(week))
    if key not in _RAW_CACHE:
        try:
            with open(os.path.join(_PROJ_DIR, f"{season}_week_{week:02d}.json")) as f:
                _RAW_CACHE[key] = json.load(f)
        except (OSError, ValueError):
            _RAW_CACHE[key] = None
    return _RAW_CACHE[key]


def _fallback_raw(season, week: int):
    """Nearest earlier week file when this week's is missing (pipeline
    gap mid-season). Returns (raw, fallback_week) or (None, None)."""
    if not os.path.isdir(_PROJ_DIR):
        return None, None
    prefix = f"{season}_week_"
    best = None
    try:
        names = os.listdir(_PROJ_DIR)
    except OSError:
        return None, None
    for n in names:
        if not (n.startswith(prefix) and n.endswith(".json")):
            continue
        try:
            w = int(n[len(prefix):].split(".")[0])
        except ValueError:
            continue
        if w < week and (best is None or w > best):
            best = w
    if best is None:
        return None, None
    return _load_raw(season, best), best


def _horizon_mult(status, week: int, first_week: int) -> float:
    """Injury discount for the near-term only, never the whole season.

    OUT costs 1 week; IR and season-style statuses (PUP/NFI/SUS) cost 4 —
    a flat 0.6 across all remaining games was the old flaw. Q/D touch
    only the current week. Horizons anchor at the first remaining week.
    """
    s = (status or "").upper()
    if s == "OUT":
        horizon = 1
    elif s in ("IR", "PUP", "NFI", "SUS", "EXE"):
        horizon = 4
    elif s in ("Q", "QUESTIONABLE", "D", "DOUBTFUL"):
        return 0.85 if week == first_week else 1.0
    else:
        return 1.0
    return 0.6 if (week - first_week) < horizon else 1.0


def load_week_points(league: dict, weeks: list, rostered_names: set,
                     fa_limit: int = 60):
    """Per-week, league-scored projections for every remaining week.

    Returns ({week: {"players": {(norm_name, POS): row}, "fallback_week":
    w|None}}, [warnings]). Rows carry pts/lo/hi (rescored with THIS
    league's scoring + ML adjustment, intervals recomputed), so
    uncertainty flows into the verdict. Byes score 0; injuries discount
    only their horizon. Keeps rostered players plus the top `fa_limit`
    free agents per position group — enough to fill any open slot.
    """
    season = league.get("season") or 2026
    scoring = (league.get("settings") or {}).get("scoring") or {}
    injuries = _load_injuries()
    rostered_names = rostered_names or set()
    first_week = weeks[0] if weeks else 0
    out: dict = {}
    warnings: list = []
    for w in weeks:
        raw = _load_raw(season, w)
        fallback_week = None
        if raw is None:
            raw, fallback_week = _fallback_raw(season, w)
            if raw is None:
                out[w] = {"players": {}, "fallback_week": None}
                warnings.append(f"No projections for week {w}; lineup delta treats it as 0.")
                continue
            warnings.append(f"Using week {fallback_week} projections for week {w}.")
        byes = raw.get("byes") or {}
        scored, fa_by_group = [], {}
        for p in raw.get("players", []):
            pos = (p.get("position") or "").upper()
            name = p.get("player_name") or ""
            key = (norm_name(name), pos)
            pts = rescore_player(p.get("avg_stats") or {}, scoring, pos,
                                 p.get("ml_adjustment", 0.0))
            bye_week = p.get("bye_week") or byes.get(p.get("team") or "")
            if bye_week and int(bye_week) == int(w):
                pts = 0.0
                lo_hi = {"projection_lower": 0.0, "projection_upper": 0.0}
            else:
                inj = injuries.get(f"{key[0]}|{pos}")
                pts *= _horizon_mult(inj, w, first_week)
                lo_hi = interval_fields(pos, pts)
            row = {"pts": round(pts, 2), "lo": lo_hi["projection_lower"],
                   "hi": lo_hi["projection_upper"], "pos": pos,
                   "team": p.get("team") or "", "name": name,
                   "inj": injuries.get(f"{key[0]}|{pos}")}
            scored.append((key, row, norm_name(name) in rostered_names))
        for td in raw.get("team_def", []) or []:
            team = td.get("team") or ""
            if not team:
                continue
            pts = score_team_def(td.get("def_avg") or {}, scoring)
            if byes.get(team) and int(byes[team]) == int(w):
                pts = 0.0
            lo_hi = interval_fields("DEF", pts)
            key = (norm_name(team), "DEF")
            scored.append((key, {"pts": round(pts, 2), "lo": lo_hi["projection_lower"],
                                 "hi": lo_hi["projection_upper"], "pos": "DEF",
                                 "team": team, "name": team, "inj": None},
                           norm_name(team) in rostered_names))
        players = {key: row for key, row, rostered in scored if rostered}
        for key, row, rostered in scored:
            if rostered:
                continue
            grp = roster_group(row["pos"])
            fa_by_group.setdefault(grp, []).append((key, row))
        for grp, cands in fa_by_group.items():
            cands.sort(key=lambda kr: (-kr[1]["pts"], kr[0]))
            for key, row in cands[:max(0, fa_limit)]:
                players[key] = row
        out[w] = {"players": players, "fallback_week": fallback_week}
    return out, warnings


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
        "playoff_teams": pt,
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


# ------------------------------------------------- lineup delta engine

def _lineup_by_group(players: list, week_rows: dict, rp: list) -> dict:
    """Optimal-starter points summed by position group, one week.

    Shared by team_week_points (total = sum of groups) and the analysis
    deltas — one assignment pass serves both.
    """
    pool = []
    for p in players or []:
        pos = (p.get("position") or "").upper()
        row = (week_rows or {}).get((norm_name(p.get("player_name") or ""), pos))
        pool.append({**p, "weekly": row["pts"] if row else 0.0})
    starters, _ = assign_slots(pool, rp)
    out: dict = {}
    for s in starters:
        g = roster_group(s.get("position") or "")
        out[g] = out.get(g, 0.0) + (s.get("weekly") or 0)
    return out


def team_week_points(players: list, week_rows: dict, rp: list) -> float:
    """Optimal starting-lineup total for a player list in one week.

    Points come from the league-scored week rows; a player with no row
    (unknown ID, position-key miss) contributes an honest 0.
    """
    return round(sum(_lineup_by_group(players, week_rows, rp).values()), 2)


def marginal_value(player: dict, roster: list, weeks_pts: dict,
                   rp: list, weights=None) -> float:
    """Weighted lineup points the roster gains from carrying `player`.

    Σ weeks weight × (lineup with − lineup without). Bye and injury
    cover show up here with no extra code: a backup who starts during
    a starter's discounted weeks has real marginal value.
    """
    name = norm_name(player.get("player_name") or "")
    total = 0.0
    for w in sorted(weeks_pts):
        rows = weeks_pts[w].get("players") or {}
        wt = (weights or {}).get(w, 1.0)
        with_p = team_week_points(roster + [player], rows, rp)
        without = team_week_points(
            [p for p in roster if norm_name(p.get("player_name") or "") != name],
            rows, rp)
        total += wt * (with_p - without)
    return round(total, 2)


def _row_pts(weeks_pts: dict, player: dict) -> float:
    """Total rescored points for a player across weeks (tie-break input)."""
    key = (norm_name(player.get("player_name") or ""),
           (player.get("position") or "").upper())
    total = 0.0
    for w in weeks_pts:
        row = (weeks_pts[w].get("players") or {}).get(key) or {}
        total += row.get("pts") or 0
    return round(total, 2)


def apply_trade(team: dict, incoming: list, outgoing: list, weeks_pts: dict,
                rp: list, roster_limit: int, rostered_names=None, weights=None):
    """Lineup change from a trade: per-week before/after totals, the
    roster moves that make it legal, and the raw weekly deltas.

    Over the limit, drop the lowest (marginal, total pts, name) player
    and charge the drop. Under the limit, each open spot fills per week
    with the best positive-marginal free agent (adds[] carries the
    summed value per player). weekly_delta stays raw — playoff
    weighting is Task 5's job. Fills are per-week because the best
    streamer differs by week; one FA never fills two spots in a week.
    """
    weights = weights or {}
    out_names = {norm_name((p or {}).get("player_name") or "") for p in outgoing or []}
    before_active = list(team.get("starters") or []) + list(team.get("bench") or [])
    active = [p for p in before_active
              if norm_name(p.get("player_name") or "") not in out_names]
    reserve = [p for p in (team.get("reserve") or [])
               if norm_name(p.get("player_name") or "") not in out_names]
    active += list(incoming or [])

    drops = []
    while len(active) + len(reserve) > roster_limit and active:
        scored = sorted(
            ((marginal_value(c, [x for x in active if x is not c],
                             weeks_pts, rp, weights),
              _row_pts(weeks_pts, c), norm_name(c.get("player_name") or ""), c)
             for c in active),
            key=lambda t: (t[0], t[1], t[2]))
        mv, _, _, c = scored[0]
        drops.append({"player_name": c.get("player_name"),
                      "position": c.get("position"),
                      "value": round(mv, 1)})
        active = [x for x in active if x is not c]

    fa_names = set(rostered_names or set()) | {
        norm_name(p.get("player_name") or "") for p in active + reserve}
    adds: dict = {}
    credit: dict = {}
    credit_group: dict = {}  # week -> group -> raw points from FA fills
    opens = max(0, roster_limit - len(active) - len(reserve))
    if opens:
        for w in sorted(weeks_pts):
            rows = weeks_pts[w].get("players") or {}
            wt = weights.get(w, 1.0)
            current = list(active)
            base = team_week_points(current, rows, rp)
            # Best-first: a fill's gain can't exceed his own points, so
            # scanning points-desc lets us stop at the first row that
            # can't beat best_gain. Exact prune, not a heuristic.
            ordered = sorted(rows.items(), key=lambda kr: -kr[1]["pts"])
            taken = set()
            for _ in range(opens):
                best, best_gain, best_key = None, 0.0, None
                for key, row in ordered:
                    if key[0] in fa_names or key in taken:
                        continue
                    if row["pts"] <= best_gain + 1e-9:
                        break
                    gain = team_week_points(
                        current + [{"player_name": row["name"],
                                    "position": row["pos"]}], rows, rp) - base
                    if gain > best_gain + 1e-9:
                        best, best_gain, best_key = row, gain, key
                if best is None:
                    break
                taken.add(best_key)
                current.append({"player_name": best["name"], "position": best["pos"]})
                base = team_week_points(current, rows, rp)
                val = round(wt * best_gain, 2)
                slot = adds.setdefault(best["name"],
                                       {"player_name": best["name"],
                                        "position": best["pos"], "value": 0.0})
                slot["value"] = round(slot["value"] + val, 2)
                credit[w] = round(credit.get(w, 0.0) + best_gain, 2)
                cg = credit_group.setdefault(w, {})
                gname = roster_group(best["pos"])
                cg[gname] = cg.get(gname, 0.0) + best_gain

    before, after, delta = [], [], []
    gb_acc, ga_acc = {}, {}
    for w in sorted(weeks_pts):
        rows = weeks_pts[w].get("players") or {}
        b_groups = _lineup_by_group(before_active, rows, rp)
        a_groups = _lineup_by_group(active, rows, rp)
        # FA fills fold into the after-side totals and their own groups,
        # so sum(a_groups) equals the old team_week_points + credit.
        for gname, val in credit_group.get(w, {}).items():
            a_groups[gname] = a_groups.get(gname, 0.0) + val
        b = round(sum(b_groups.values()), 2)
        a = round(sum(a_groups.values()), 2)
        for gname, val in b_groups.items():
            gb_acc[gname] = gb_acc.get(gname, 0.0) + val
        for gname, val in a_groups.items():
            ga_acc[gname] = ga_acc.get(gname, 0.0) + val
        before.append(round(b, 1))
        after.append(round(a, 1))
        delta.append(round(a - b, 1))
    n = len(before)
    groups_before = ({g: round(v / n, 1) for g, v in sorted(gb_acc.items())}
                     if n else {})
    groups_after = ({g: round(v / n, 1) for g, v in sorted(ga_acc.items())}
                    if n else {})
    return {"before": before, "after": after,
            "groups_before": groups_before, "groups_after": groups_after,
            "drops": drops,
            "adds": sorted(
                ({"player_name": v["player_name"], "position": v["position"],
                  "value": round(v["value"], 1)} for v in adds.values()),
                key=lambda d: (-d["value"], d["player_name"])),
            "weekly_delta": delta}


# ------------------------------------------------- verdict and weighting

_PLAYOFF_MULT = 1.25  # playoff weeks count extra, but only for playoff teams


def _seed_map(teams: list) -> dict:
    """roster_id -> playoff seed, by wins then fpts (name breaks ties)."""
    ordered = sorted(teams or [],
                     key=lambda t: (-(t.get("wins") or 0), -(t.get("fpts") or 0),
                                    str(t.get("roster_id"))))
    return {str(t.get("roster_id")): i + 1 for i, t in enumerate(ordered)}


def playoff_weight(week: int, cal: dict, team: dict, direction) -> float:
    """1.25 for playoff weeks iff the team holds a playoff seed.

    Missing seed never assumes contention (1.0). A rebuild override
    forces 1.0 even in the field; contend forces 1.25 on the outside.
    """
    if (direction or "middle") == "rebuild":
        return 1.0
    if week not in (cal.get("playoff_weeks") or []):
        return 1.0
    if (direction or "middle") == "contend":
        return _PLAYOFF_MULT
    try:
        seed = int((team or {}).get("seed") or 0)
    except (TypeError, ValueError):
        seed = 0
    pt = cal.get("playoff_teams") or 6
    return _PLAYOFF_MULT if 0 < seed <= pt else 1.0


def direction_of(team: dict, teams: list, playoff_teams: int, override=None) -> str:
    """Contender / middle / rebuilder from standings, or the override.

    Contender = playoff seed plus top-half points. Rebuilder = bottom
    third by wins. Everything else is middle — and middle is where most
    teams live most of the season.
    """
    if override in ("contend", "middle", "rebuild"):
        return override
    n = len(teams or [])
    if n == 0:
        return "middle"
    seeds = _seed_map(teams)
    by_fpts = sorted(teams or [],
                     key=lambda t: (-(t.get("fpts") or 0), str(t.get("roster_id"))))
    fpts_rank = next((i + 1 for i, t in enumerate(by_fpts)
                      if str(t.get("roster_id")) == str(team.get("roster_id"))), n)
    by_wins = sorted(teams or [],
                     key=lambda t: ((t.get("wins") or 0), str(t.get("roster_id"))))
    wins_asc = next((i + 1 for i, t in enumerate(by_wins)
                     if str(t.get("roster_id")) == str(team.get("roster_id"))), n)
    if seeds.get(str(team.get("roster_id")), n + 1) <= (playoff_teams or 6) \
            and fpts_rank <= n / 2:
        return "contend"
    if wins_asc <= max(1, n // 3):
        return "rebuild"
    return "middle"


def _group_starter_pts(team: dict, week_rows: dict, rp: list) -> dict:
    """Optimal-starter points by position group for one team, one week."""
    return _lineup_by_group(
        list(team.get("starters") or []) + list(team.get("bench") or []),
        week_rows, rp)


def needs_of(team: dict, teams: list, weeks_pts: dict, rp: list) -> list:
    """Per-group starter strength vs the league median, plus bye clusters.

    gap < 0 means the team's starters trail the median starter group —
    that is the need. bye_cluster lists NFL teams with 2+ rostered
    players in the group (one shared off-week guts the position).
    """
    weeks = sorted(weeks_pts)
    groups = ["QB", "RB", "WR", "TE"]
    mine = {g: [] for g in groups}
    league = {g: [] for g in groups}
    for t in teams or []:
        avgs: dict = {}
        for w in weeks:
            rows = weeks_pts[w].get("players") or {}
            for g, v in _group_starter_pts(t, rows, rp).items():
                if g in avgs:
                    avgs[g].append(v)
                else:
                    avgs[g] = [v]
        for g in groups:
            if avgs.get(g):
                league[g].append(sum(avgs[g]) / len(avgs[g]))
                if str(t.get("roster_id")) == str(team.get("roster_id")):
                    mine[g] = avgs[g]
    first_rows = (weeks_pts[weeks[0]].get("players") or {}) if weeks else {}
    out = []
    active = list(team.get("starters") or []) + list(team.get("bench") or [])
    for g in groups:
        if not mine[g] and not any(roster_group((p.get("position") or "")) == g
                                   for p in active):
            continue
        meds = sorted(league[g])
        if not meds:
            med = 0.0
        elif len(meds) % 2:
            med = meds[len(meds) // 2]
        else:
            med = (meds[len(meds) // 2 - 1] + meds[len(meds) // 2]) / 2
        avg = (sum(mine[g]) / len(mine[g])) if mine[g] else 0.0
        by_nfl: dict = {}
        for p in active:
            if roster_group(p.get("position") or "") != g:
                continue
            key = (norm_name(p.get("player_name") or ""),
                   (p.get("position") or "").upper())
            tm = p.get("team") or (first_rows.get(key) or {}).get("team") or ""
            by_nfl.setdefault(tm, 0)
            by_nfl[tm] += 1
        out.append({"position": g, "gap": round(avg - med, 1),
                    "bye_cluster": sorted(t for t, c in by_nfl.items() if t and c >= 2)})
    return out


def gains_from_delta(weekly_delta: list, weeks: list, weights: dict,
                     playoff_weeks: list) -> dict:
    """Weighted gains from raw per-week deltas: total, per week, playoffs."""
    total, po = 0.0, 0.0
    for d, w in zip(weekly_delta or [], weeks or []):
        wt = (weights or {}).get(w, 1.0)
        total += wt * d
        if w in (playoff_weeks or []):
            po += wt * d
    n = len(weekly_delta or [])
    raw = round(sum(weekly_delta or []), 1)
    raw_po = round(sum(d for d, w in zip(weekly_delta or [], weeks or [])
                       if w in (playoff_weeks or [])), 1)
    return {"gain_total": round(total, 1),
            "gain_per_week": round(total / n, 2) if n else 0.0,
            "gain_playoffs": round(po, 1),
            # Raw (unweighted) twins: plain-English sentences must quote
            # real lineup points, not playoff-inflated ones.
            "raw_total": raw,
            "raw_per_week": round(raw / n, 2) if n else 0.0,
            "raw_playoffs": raw_po}


def uncertainty_k(pkg_a: dict, pkg_b: dict) -> float:
    """Combined projection uncertainty across both packages and weeks.

    Per side per week u = sqrt(Σ ((hi-lo)/2)²); k = sqrt(Σ (u_a+u_b)²).
    Wider intervals widen the Even band — fixed cutoffs would call a
    coin-flip "clear win" in a high-variance week.
    """
    total = 0.0
    for w in set(pkg_a) | set(pkg_b):
        ua = sum(((hi - lo) / 2) ** 2 for lo, hi in pkg_a.get(w) or []) ** 0.5
        ub = sum(((hi - lo) / 2) ** 2 for lo, hi in pkg_b.get(w) or []) ** 0.5
        total += (ua + ub) ** 2
    return round(total ** 0.5, 2)


def verdict(gains_a: float, gains_b: float, k: float, base_total: float) -> dict:
    """Winner from weighted gains; Even lives inside uncertainty.

    |diff| ≤ k is noise (Even); ≤ 2k leans; beyond is clear. edge_pct
    scales the edge against weekly starting totals so bands read the
    same in a 10-team shootout and a 14-team grinder.
    """
    diff = (gains_a or 0.0) - (gains_b or 0.0)
    mag = abs(diff)
    k = k or 0.0
    if mag <= k:
        band = "even"
    elif mag <= 2 * k:
        band = "leans"
    else:
        band = "clear"
    winner = "Even" if band == "even" else ("A" if diff > 0 else "B")
    base = base_total or 0.0
    return {"winner": winner, "band": band,
            "edge_pct": round(100 * mag / base, 1) if base > 0 else 0.0}


def acceptance(partner_gain: float, k: float, market_gap_pct) -> str:
    """Would the partner say yes: likely / possible / unlikely.

    Starts from the partner's own lineup gain; the market gap tempers
    it (a lopsided market price kills even a fair-points deal). No
    market means the delta decides alone.
    """
    g = partner_gain or 0.0
    k = k or 0.0
    if market_gap_pct is None:
        if g >= 0:
            return "likely"
        return "possible" if g >= -0.5 * k else "unlikely"
    if g >= 0 and market_gap_pct <= 15:
        return "likely"
    if g >= -0.5 * k or market_gap_pct <= 30:
        return "possible"
    return "unlikely"


def analysis_for(block: dict, group_delta: dict, band: str, acceptance: str,
                 partner_name: str, cal: dict, perspective="partner") -> list:
    """Plain-English "what do I win" sentences for one side of a trade.

    Deterministic templates over numbers the engine already computed —
    no LLM, no jargon, nothing a first-time fantasy player can't read.
    Quotes RAW lineup points (playoff weighting is explained in its own
    line instead of inflating the headline). perspective="partner"
    phrases acceptance about the other team; "me" makes it second
    person, because acceptance asks whether *this* side says yes.
    """
    if not cal.get("weeks_left"):
        return ["The fantasy season is already over — there is nothing left "
                "to gain from a trade."]
    g = block.get("gains") or {}
    per = g.get("raw_per_week") or 0.0
    total = g.get("raw_total") or 0.0
    po = g.get("raw_playoffs") or 0.0

    if per >= 0.05:
        s = [f"Your lineup scores about +{per:.1f} more points each week "
             f"— about +{total:.1f} the rest of the season."]
    elif per <= -0.05:
        s = [f"Your lineup scores about {abs(per):.1f} fewer points each "
             f"week — about {abs(total):.1f} fewer the rest of the season."]
    else:
        s = ["Your weekly lineup score stays about the same."]

    gd = {k: round(v, 1) for k, v in (group_delta or {}).items()}
    ups = sorted((k for k, v in gd.items() if v >= 0.5), key=lambda k: -gd[k])
    downs = sorted((k for k, v in gd.items() if v <= -0.5), key=lambda k: gd[k])
    if ups and downs:
        s.append(f"You come out stronger at {ups[0]} ({gd[ups[0]]:+.1f}/wk) "
                 f"and thinner at {downs[0]} ({gd[downs[0]]:+.1f}/wk).")
    elif ups:
        s.append(f"You come out stronger at {ups[0]} ({gd[ups[0]]:+.1f}/wk).")
    elif downs:
        s.append(f"You come out a bit thinner at {downs[0]} "
                 f"({gd[downs[0]]:+.1f}/wk).")
    else:
        s.append("Your position mix stays about the same.")

    weak = min((nm for nm in (block.get("needs") or [])
                if (nm.get("gap") or 0) < -0.5),
               key=lambda nm: nm.get("gap") or 0, default=None)
    if weak:
        pos = weak["position"]
        d = gd.get(pos, 0.0)
        if d >= 0.5:
            line = (f"Fills your need at {pos} — you were starting below "
                    "the league's average there.")
        elif d <= -0.5:
            line = (f"You get thinner at {pos}, where you were already "
                    "below the league's average.")
        else:
            line = (f"Still thin at {pos} — you were already below the "
                    "league's average there, and this trade does not "
                    "change it.")
        cluster = weak.get("bye_cluster") or []
        if cluster:
            line += (f" Heads up: your {' and '.join(cluster)} {pos}s "
                     "share a bye week.")
        s.append(line)

    pw = cal.get("playoff_weeks") or []
    if pw and abs(po) >= 0.5:
        line = (f"Playoffs: {abs(po):.1f} points of that go "
                f"{'your way' if po >= 0 else 'against you'} "
                f"in weeks {pw[0]}-{pw[-1]}")
        if (block.get("direction") or "") == "contend":
            line += ", and those weeks count extra for you"
        s.append(line + ".")

    if band == "even":
        s.append("Too close to call — treat it as a coin flip.")
    elif per >= 0:
        s.append("This leans your way." if band == "leans"
                 else "Fairly confident in this edge.")
    else:
        s.append("This leans against you." if band == "leans"
                 else "Fairly confident this costs you points.")

    if perspective == "me":
        s.append({"likely": "You'd likely take this deal.",
                  "possible": "You might go for it — it could go either way.",
                  "unlikely": "You'd likely turn this down."}
                 .get(acceptance, "You might go for it."))
    else:
        s.append(f"{partner_name} "
                 f"{'would likely take this deal' if acceptance == 'likely' else 'might go for it — worth asking' if acceptance == 'possible' else 'would likely say no'}.")
    return s


def _pkg_intervals(traded: list, weeks_pts: dict, weeks: list) -> dict:
    """{week: [(lo, hi)]} for the traded players, from week rows."""
    out = {}
    for w in weeks:
        rows = (weeks_pts.get(w) or {}).get("players") or {}
        pairs = []
        for p in traded or []:
            row = rows.get((norm_name(p.get("player_name") or ""),
                            (p.get("position") or "").upper()))
            if row:
                pairs.append((row.get("lo") or 0, row.get("hi") or 0))
        out[w] = pairs
    return out


def evaluate_trade(team_a: dict, team_b: dict, teams: list, league: dict,
                   st: dict, weeks_pts: dict, rp: list, roster_limit: int,
                   rostered_names, traded_a: list, traded_b: list,
                   market=None, direction_a=None, direction_b=None,
                   warnings=None):
    """Full verdict from loaded structures (Task 7 wires the loading).

    traded_a/b are resolved player dicts (Task 7 resolves IDs and
    collects unknown_ids). Only calendar weeks count — rows past the
    fantasy final never enter a gain. market is None or
    {"value_a","value_b"}; acceptance reads it, the verdict never does.
    """
    prof = league_profile(league, st)
    cal = prof["calendar"]
    weeks = cal["weeks_left"]
    have = {w: weeks_pts[w] for w in weeks if w in (weeks_pts or {})}
    warns = list(warnings or [])
    if not weeks:
        warns.append(f"Fantasy season is over (week {cal['current_week']} past "
                     f"final week {cal['final_week']}); nothing left to value.")
    for w in weeks:
        if w not in (weeks_pts or {}):
            warns.append(f"No projections for week {w}; treated as 0.")
    fb_weeks = sorted({weeks_pts[w].get("fallback_week") for w in have
                       if weeks_pts[w].get("fallback_week")})

    seeds = _seed_map(teams)
    pt = prof["playoff_teams"]
    dir_a = direction_of(team_a, teams, pt, direction_a)
    dir_b = direction_of(team_b, teams, pt, direction_b)
    wa = {w: playoff_weight(w, cal, {"seed": seeds.get(str(team_a.get("roster_id")))}, dir_a)
          for w in weeks}
    wb = {w: playoff_weight(w, cal, {"seed": seeds.get(str(team_b.get("roster_id")))}, dir_b)
          for w in weeks}

    out_a = apply_trade(team_a, incoming=traded_b, outgoing=traded_a,
                        weeks_pts=have, rp=rp, roster_limit=roster_limit,
                        rostered_names=rostered_names, weights=wa)
    out_b = apply_trade(team_b, incoming=traded_a, outgoing=traded_b,
                        weeks_pts=have, rp=rp, roster_limit=roster_limit,
                        rostered_names=rostered_names, weights=wb)
    ga = gains_from_delta(out_a["weekly_delta"], weeks, wa, cal["playoff_weeks"])
    gb = gains_from_delta(out_b["weekly_delta"], weeks, wb, cal["playoff_weeks"])

    k = uncertainty_k(_pkg_intervals(traded_a, have, weeks),
                      _pkg_intervals(traded_b, have, weeks))
    base = 0.0
    if out_a["before"] or out_b["before"]:
        base = ((sum(out_a["before"]) / max(1, len(out_a["before"])))
                + (sum(out_b["before"]) / max(1, len(out_b["before"])))) / 2
    v = verdict(ga["gain_total"], gb["gain_total"], k, base)

    va = (market or {}).get("value_a") if market else None
    vb = (market or {}).get("value_b") if market else None
    gap = None
    if va is not None and vb is not None and max(va, vb) > 0:
        gap = round(100 * abs(va - vb) / max(va, vb), 1)
    acc = acceptance(gb["gain_total"], k, gap)

    gdelta = lambda out: {
        g: round(out["groups_after"].get(g, 0.0)
                 - out["groups_before"].get(g, 0.0), 1)
        for g in set(out["groups_before"]) | set(out["groups_after"])}
    gd_a, gd_b = gdelta(out_a), gdelta(out_b)
    blk = lambda out, tm, d, g, gd: {"gains": g, "lineup_before": out["before"],
                                     "lineup_after": out["after"],
                                     "drops": out["drops"],
                                     "adds": out["adds"],
                                     "needs": needs_of(tm, teams, have, rp),
                                     "direction": d, "group_delta": gd}
    blk_a = blk(out_a, team_a, dir_a, ga, gd_a)
    blk_b = blk(out_b, team_b, dir_b, gb, gd_b)
    tname = lambda t: (t.get("team_name") or t.get("display_name")
                       or "The other team")
    return {"team_a": blk_a, "team_b": blk_b,
            "analysis": {"a": analysis_for(blk_a, gd_a, v["band"], acc,
                                           tname(team_b), cal,
                                           perspective="partner"),
                         "b": analysis_for(blk_b, gd_b, v["band"], acc,
                                           tname(team_a), cal,
                                           perspective="me")},
            "winner": v["winner"], "band": v["band"],
            "value_difference": round(ga["gain_total"] - gb["gain_total"], 1),
            "calendar": cal, "settings_used": prof,
            "confidence": {"k": k, "edge_pct": v["edge_pct"], "band": v["band"]},
            "acceptance": acc,
            "win_win": ga["gain_total"] > 0 and gb["gain_total"] > 0
            and min(ga["gain_total"], gb["gain_total"]) >= 0.25 * k,
            "lose_lose": ga["gain_total"] < 0 and gb["gain_total"] < 0,
            "market": None if market is None else {"value_a": va, "value_b": vb,
                                                   "gap_pct": gap},
            "warnings": warns,
            "data_freshness": {"projections": "fallback" if fb_weeks else "ok",
                               "fallback_weeks": fb_weeks,
                               "market": "missing" if market is None else "ok"}}
