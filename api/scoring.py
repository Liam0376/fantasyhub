"""League-agnostic scoring: nflverse avg stats + Sleeper scoring_settings.

Single source of truth for stat mapping. Both scripts/compute_week.py
(which stores per-game avg raw stats) and api/analytics.py (which scores
those avgs per league) import from here. No hardcoded league scoring.
"""

# nflverse weekly columns to average per player. These are the raw inputs
# for all league-specific scoring. Add a column here and it flows through.
AVG_STAT_KEYS = [
    "passing_yards", "passing_tds", "passing_interceptions",
    "passing_2pt_conversions", "passing_40", "completions", "attempts",
    "rushing_yards", "rushing_tds", "rushing_2pt_conversions",
    "rushing_40", "carries",
    "receptions", "targets", "receiving_yards", "receiving_tds",
    "receiving_2pt_conversions", "receiving_40",
    "fumbles_lost_total", "fumble_recovery_own", "fumble_recovery_opp",
    "fumble_recovery_tds",
    "pat_made", "pat_missed",
    "fg_made_0_19", "fg_made_20_29", "fg_made_30_39",
    "fg_made_40_49", "fg_made_50_59", "fg_made_60_",
    "fg_missed_0_19", "fg_missed_20_29", "fg_missed_30_39",
    "fg_missed_40_49", "fg_missed_50_59", "fg_missed_60_",
    "fg_missed",
    "passing_first_downs", "rushing_first_downs", "receiving_first_downs",
    "pt_return_tds", "special_teams_tds",
    # IDP (individual defensive players)
    "def_tackles_solo", "def_tackles_with_assist", "def_tackles_for_loss",
    "def_sacks", "def_qb_hits", "def_interceptions", "def_interception_yards",
    "def_pass_defended", "def_fumbles_forced", "def_tds", "def_safeties",
    "def_fg_blocks", "def_pat_blocks", "def_punt_blocks",
]

# Reference scoring for standalone reference-points computation (the
# scripts/compute_week.py "projected_points" field before per-league
# rescoring, and scripts/backtest.py's old-method comparison). Real
# per-league scoring always uses score_avg_stats() with the league's
# actual Sleeper scoring_settings — this is never that. Single source —
# found duplicated across compute_week.py and backtest.py.
REF_SCORING = {
    "pass_yd": 0.04, "pass_td": 4.0, "pass_int": -1.0, "pass_2pt": 2.0,
    "rush_yd": 0.1, "rush_td": 6.0, "rush_2pt": 2.0,
    "rec": 1.0, "rec_yd": 0.1, "rec_td": 6.0, "rec_2pt": 2.0,
    "fum_lost": -2.0, "xpm": 1.0, "xpmiss": -1.0,
    "fgm_0_19": 3.0, "fgm_20_29": 3.0, "fgm_30_39": 3.0,
    "fgm_40_49": 4.0, "fgm_50_59": 5.0, "fgm_60_": 6.0, "fgmiss": -1.0,
}

# Sleeper roster slots that can be filled by multiple positions.
# Used for replacement-level math and for filtering projections to the
# league's own eligible positions. No hardcoded FLEX-only assumption.
FLEX_ELIGIBILITY = {
    "FLEX": {"RB", "WR", "TE"},
    "SUPER_FLEX": {"QB", "RB", "WR", "TE"},
    "WRRB_FLEX": {"RB", "WR"},
    "REC_FLEX": {"WR", "TE"},
    "IDP_FLEX": {    "DL", "LB", "DB", "DE", "DT", "CB", "S", "SAF", "FS",
                 "SS", "MLB", "ILB", "OLB", "NT", "EDGE"},
}


# Granular defensive positions grouped for IDP_FLEX-style matching.
IDP_POSITIONS = {"DL", "LB", "DB", "DE", "DT", "CB", "S", "SAF", "FS",
                 "SS", "MLB", "ILB", "OLB", "NT", "EDGE"}


def _f(key, default=0.0):
    try:
        return float(key or 0)
    except (ValueError, TypeError):
        return default


def norm_name(n: str) -> str:
    """Normalize a player name for cross-source matching (suffix-proof)."""
    import re

    n = (n or "").lower()
    n = re.sub(r"\b(jr\.?|sr\.?|ii|iii|iv|v)\b", "", n)
    return re.sub(r"[^a-z0-9 ]", "", n).strip()


def roster_group(pos: str) -> str:
    """Map granular positions onto Sleeper roster groups (DE->DL...)."""
    p = (pos or "UNK").upper()
    if p in ("DE", "DT", "NT", "EDGE"):
        return "DL"
    if p in ("CB", "S", "SAF", "FS", "SS"):
        return "DB"
    if p in ("MLB", "ILB", "OLB"):
        return "LB"
    return p


def score_avg_stats(avg: dict, scoring: dict, position: str) -> float:
    """Score per-game avg raw stats with a league's Sleeper scoring_settings.

    scoring: Sleeper league scoring_settings dict (e.g. rec=1.0 PPR,
      rec=0.5 half, rec=0 standard, pass_td=4 or 6, bonuses, etc.)
    position: QB/RB/WR/TE/K/DEF — used for TE/RB/WR reception premiums.
    Unknown Sleeper keys are ignored (IDP/DEF-team etc.).
    """
    if not scoring:
        return 0.0
    pos = (position or "").upper()
    g = lambda k: _f(scoring.get(k, 0))

    pts = 0.0
    # Passing
    pts += _f(avg.get("passing_yards")) * g("pass_yd")
    pts += _f(avg.get("passing_tds")) * g("pass_td")
    pts += _f(avg.get("passing_interceptions")) * g("pass_int")
    pts += _f(avg.get("passing_2pt_conversions")) * g("pass_2pt")
    pts += _f(avg.get("passing_40")) * g("pass_cmp_40p")
    pts += _f(avg.get("passing_first_downs")) * g("pass_fd")
    # Rushing
    pts += _f(avg.get("rushing_yards")) * g("rush_yd")
    pts += _f(avg.get("rushing_tds")) * g("rush_td")
    pts += _f(avg.get("rushing_2pt_conversions")) * g("rush_2pt")
    pts += _f(avg.get("rushing_40")) * g("rush_40p")
    pts += _f(avg.get("rushing_first_downs")) * g("rush_fd")
    # Receiving
    rec = _f(avg.get("receptions"))
    pts += rec * g("rec")
    pts += _f(avg.get("receiving_yards")) * g("rec_yd")
    pts += _f(avg.get("receiving_tds")) * g("rec_td")
    pts += _f(avg.get("receiving_2pt_conversions")) * g("rec_2pt")
    pts += _f(avg.get("receiving_40")) * g("rec_40p")
    pts += _f(avg.get("receiving_first_downs")) * g("rec_fd")
    # Position reception premiums (TE premium etc.)
    if pos == "TE":
        pts += rec * g("bonus_rec_te")
    elif pos == "RB":
        pts += rec * g("bonus_rec_rb")
    elif pos == "WR":
        pts += rec * g("bonus_rec_wr")
    # Fumbles
    pts += _f(avg.get("fumbles_lost_total")) * g("fum_lost")
    pts += (_f(avg.get("fumble_recovery_own")) + _f(avg.get("fumble_recovery_opp"))) * g("fum_rec")
    pts += _f(avg.get("fumble_recovery_tds")) * g("fum_rec_td")
    # Kicking
    pts += _f(avg.get("pat_made")) * g("xpm")
    pts += _f(avg.get("pat_missed")) * g("xpmiss")
    for rng in ("0_19", "20_29", "30_39", "40_49", "50_59", "60_"):
        pts += _f(avg.get(f"fg_made_{rng}")) * g(f"fgm_{rng}")
        # Sleeper miss keys: fgmiss_0_19 etc, plus generic fgmiss
        pts += _f(avg.get(f"fg_missed_{rng}")) * g(f"fgmiss_{rng}")
    pts += _f(avg.get("fg_missed")) * g("fgmiss")
    # Special teams TD (return TDs)
    pts += _f(avg.get("pt_return_tds")) * g("st_td")
    pts += _f(avg.get("special_teams_tds")) * g("st_td")
    # IDP (individual defensive players) — nflverse def_* columns map
    # onto Sleeper IDP keys. Primary keys win; idp_* variants credit
    # only when the primary is absent/zero (same play, never stacked).
    pts += _f(avg.get("def_tackles_solo")) * g("tkl_solo")
    if not g("tkl_solo"):
        pts += _f(avg.get("def_tackles_solo")) * g("idp_tkl_solo")
    if not g("tkl_solo") and not g("idp_tkl_solo"):
        pts += _f(avg.get("def_tackles_solo")) * g("tkl")
    pts += _f(avg.get("def_tackles_with_assist")) * g("tkl_ast")
    pts += _f(avg.get("def_tackles_for_loss")) * g("tkl_loss")
    if not g("tkl_loss"):
        pts += _f(avg.get("def_tackles_for_loss")) * g("idp_tkl_loss")
    pts += _f(avg.get("def_sacks")) * g("sack")
    if not g("sack"):
        pts += _f(avg.get("def_sacks")) * g("idp_sack")
    pts += _f(avg.get("def_qb_hits")) * g("qb_hit")
    if not g("qb_hit"):
        pts += _f(avg.get("def_qb_hits")) * g("idp_qb_hit")
    pts += _f(avg.get("def_interceptions")) * g("int")
    if not g("int"):
        pts += _f(avg.get("def_interceptions")) * g("idp_int")
    pts += _f(avg.get("def_interception_yards")) * g("int_ret_yd")
    if not g("int_ret_yd"):
        pts += _f(avg.get("def_interception_yards")) * g("idp_int_ret_yd")
    pts += _f(avg.get("def_pass_defended")) * g("pass_def")
    if not g("pass_def"):
        pts += _f(avg.get("def_pass_defended")) * g("def_pass_def")
    if not g("pass_def") and not g("def_pass_def"):
        pts += _f(avg.get("def_pass_defended")) * g("idp_pass_def")
    pts += _f(avg.get("def_fumbles_forced")) * g("ff")
    if not g("ff"):
        pts += _f(avg.get("def_fumbles_forced")) * g("idp_ff")
    pts += _f(avg.get("fumble_recovery_opp")) * g("idp_fum_rec")
    pts += _f(avg.get("def_tds")) * g("def_td")
    pts += _f(avg.get("def_tds")) * g("idp_def_td")
    pts += _f(avg.get("def_safeties")) * g("safe")
    pts += _f(avg.get("def_safeties")) * g("idp_safe")
    blocks = (_f(avg.get("def_fg_blocks")) + _f(avg.get("def_pat_blocks"))
              + _f(avg.get("def_punt_blocks")))
    pts += blocks * g("blk_kick")
    pts += blocks * g("idp_blk_kick")
    # Yardage bonuses — awarded when per-game avg clears the threshold.
    # Approximation (true bonus depends on single-game distribution),
    # but correct directionally and league-specific.
    if _f(avg.get("rushing_yards")) >= 100:
        pts += g("bonus_rush_yd_100")
    if _f(avg.get("rushing_yards")) >= 200:
        pts += g("bonus_rush_yd_200")
    if _f(avg.get("receiving_yards")) >= 100:
        pts += g("bonus_rec_yd_100")
    if _f(avg.get("receiving_yards")) >= 200:
        pts += g("bonus_rec_yd_200")
    if _f(avg.get("passing_yards")) >= 300:
        pts += g("bonus_pass_yd_300")
    if _f(avg.get("passing_yards")) >= 400:
        pts += g("bonus_pass_yd_400")
    if _f(avg.get("carries")) >= 20:
        pts += g("bonus_rush_att_20")
    if _f(avg.get("completions")) >= 25:
        pts += g("bonus_pass_cmp_25")
    # Long-TD bonuses (pass_td_40p etc.) need TD-distance data nflverse
    # player-week lacks — documented limitation, scored as 0.
    return pts


def _bracket_points(scoring: dict, prefix: str, value: float) -> float:
    """Match Sleeper range-bracket keys (pts_allow_1_6, yds_allow_550p).

    Works with any league's custom ranges — parses the numbers out of
    the key instead of hardcoding the standard brackets. Fractional
    averages round half up to the nearest integer bracket first, so
    values between integer ranges (6.5, 13.5) score instead of zeroing.
    """
    import math
    import re

    v = math.floor(value + 0.5)
    best = 0.0
    for key, mult in scoring.items():
        if not key.startswith(prefix):
            continue
        rest = key[len(prefix):]
        m = re.fullmatch(r"(\d+)_(\d+)", rest)
        if m:
            lo, hi = int(m.group(1)), int(m.group(2))
        else:
            m = re.fullmatch(r"(\d+)p", rest)
            if m:
                lo, hi = int(m.group(1)), float("inf")
            else:
                m = re.fullmatch(r"(\d+)", rest)
                if not m:
                    continue
                lo = hi = int(m.group(1))
        if lo <= v <= hi:
            try:
                best = float(mult or 0)
            except (ValueError, TypeError):
                pass
    return best


def score_team_def(avg: dict, scoring: dict) -> float:
    """Score a team defense's per-game avgs with league DEF settings.

    avg needs: sacks, ints, fum_rec, def_tds, safeties, blk_kicks,
    pts_allowed, yds_allowed (all per-game). Yards-allowed brackets
    score 0 when the source lacks opponent yardage — flagged by the
    caller via yds_allowed=None.
    """
    if not scoring:
        return 0.0
    g = lambda k: _f(scoring.get(k, 0))
    pts = 0.0
    pts += _f(avg.get("sacks")) * g("sack")
    pts += _f(avg.get("ints")) * g("int")
    pts += _f(avg.get("fum_rec")) * g("fum_rec")
    pts += _f(avg.get("ff")) * g("ff")
    pts += _f(avg.get("def_tds")) * g("def_td")
    pts += _f(avg.get("safeties")) * g("safe")
    pts += _f(avg.get("blk_kicks")) * g("blk_kick")
    pts += _f(avg.get("st_tds")) * g("st_td")
    # def_st_* variants credit ONLY when the primary key is absent/zero.
    # They describe the same plays (a pick-6 is one event); stacking both
    # would double-count a single TD/FF.
    if not g("fum_rec"):
        pts += _f(avg.get("fum_rec")) * g("def_st_fum_rec")
    if not g("ff"):
        pts += _f(avg.get("ff")) * g("def_st_ff")
    if not g("def_td"):
        pts += _f(avg.get("def_tds")) * g("def_st_td")
    if avg.get("pts_allowed") is not None:
        pts += _bracket_points(scoring, "pts_allow_", _f(avg.get("pts_allowed")))
        pts += _f(avg.get("pts_allowed")) * g("pts_allow")
    if avg.get("yds_allowed") is not None:
        pts += _bracket_points(scoring, "yds_allow_", _f(avg.get("yds_allowed")))
        pts += _f(avg.get("yds_allowed")) * g("yds_allow")
    return pts


def describe_scoring(scoring: dict) -> str:
    """Human label: Standard / Half PPR / PPR + TE premium + pass TD."""
    rec = _f(scoring.get("rec", 0))
    base = "PPR" if rec >= 1 else ("Half PPR" if rec >= 0.5 else "Standard")
    parts = [base]
    if _f(scoring.get("bonus_rec_te")) > 0:
        parts.append(f"TE+{scoring['bonus_rec_te']}")
    pass_td = scoring.get("pass_td")
    if pass_td is not None:
        parts.append(f"{_f(pass_td):g}pt pass TD")
    return " · ".join(parts)


def normalize_row_stats(row: dict) -> dict:
    """Convert stat values in a row from strings to floats for stat_projector.

    CSV DictReader gives string values; project_player_stats expects floats.
    """
    normalized = dict(row)
    for key in AVG_STAT_KEYS:
        if key in normalized:
            normalized[key] = _f(normalized[key])
    return normalized
