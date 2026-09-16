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
    "pt_return_tds",
]


def _f(key, default=0.0):
    try:
        return float(key or 0)
    except (ValueError, TypeError):
        return default


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
