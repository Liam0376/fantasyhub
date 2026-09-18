#!/usr/bin/env python3
"""Weekly projection computation for Fantasy Hub.

Fetches current season stats from nflverse, computes projections for
remaining weeks, and writes JSON to data/projections/.

Usage:
    python scripts/compute_week.py --week 3 --season 2026
    python scripts/compute_week.py  # auto-detect current week
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
from conformal import qhat, POS_RESIDUALS, interval_width
from scoring import AVG_STAT_KEYS, normalize_row_stats, score_avg_stats, score_team_def, REF_SCORING, safe_float, NFLVERSE_STATS_URL
from stat_projector import project_player_stats, build_game_context, COVERED_STATS
from weather import STADIUM_COORDS, get_forecast

try:
    from nfl_state import get_nfl_state
except ImportError:
    get_nfl_state = None

# nflverse weekly stats URL
STATS_URL = NFLVERSE_STATS_URL
TEAM_STATS_URL = "https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_{season}.csv"
SCHEDULE_URL = "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv"

# Reference DEF scoring (standard brackets) for standalone readability.
REF_DEF_SCORING = {
    "sack": 1.0, "int": 2.0, "fum_rec": 2.0, "ff": 1.0,
    "def_td": 6.0, "safe": 2.0, "blk_kick": 2.0, "st_td": 6.0,
    "pts_allow_0": 10.0, "pts_allow_1_6": 7.0, "pts_allow_7_13": 4.0,
    "pts_allow_14_20": 1.0, "pts_allow_21_27": 0.0,
    "pts_allow_28_34": -1.0, "pts_allow_35p": -4.0,
}


def fetch_weekly_stats(season: int) -> list[dict]:
    """Fetch weekly player stats from nflverse."""
    import csv
    import io
    import requests

    url = STATS_URL.format(season=season)
    print(f"Fetching stats from {url}...")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()

    reader = csv.DictReader(io.StringIO(resp.text))
    rows = []
    for row in reader:
        rows.append(row)
    print(f"  Got {len(rows)} stat rows")
    return rows


def fetch_csv(url: str, label: str) -> list[dict]:
    import csv
    import io
    import requests

    print(f"Fetching {label} from {url}...")
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    rows = list(csv.DictReader(io.StringIO(resp.text)))
    print(f"  Got {len(rows)} {label} rows")
    return rows


def fetch_prior_season_stats(season: int) -> list[dict]:
    """Prior season's full weekly stats, for the thin-sample blend.
    Soft-fail: returns [] if unavailable (a new/expansion scenario, or
    the URL 404s for a season with no prior-year data on nflverse)."""
    try:
        return fetch_csv(STATS_URL.format(season=season - 1), "prior season stats")
    except Exception as e:
        print(f"  Prior season fetch failed ({e}) — thin-sample blend disabled")
        return []


def fetch_current_and_prior_season_history(stats_rows: list[dict], prior_rows: list[dict],
                                            current_week: int, season: int) -> tuple[dict, dict]:
    """Group both seasons' rows by player_id -> list of game dicts.

    Returns (current_history, prior_history) — current_history only
    includes weeks strictly before current_week (true out-of-sample,
    same discipline as the father project's build_weekly_projections)."""
    current: dict[str, list] = {}
    for row in stats_rows:
        pid = row.get("player_id") or row.get("player_name", "")
        if not pid:
            continue
        if row.get("season") and int(row.get("season", 0)) != season:
            continue
        if row.get("season_type", "REG") != "REG":
            continue
        try:
            wk = int(row.get("week", 0))
        except (ValueError, TypeError):
            continue
        if wk <= 0 or wk >= current_week:
            continue
        current.setdefault(pid, []).append(row)

    prior: dict[str, list] = {}
    for row in prior_rows:
        pid = row.get("player_id") or row.get("player_name", "")
        if pid:
            prior.setdefault(pid, []).append(row)

    for pid in current:
        current[pid].sort(key=lambda r: int(r.get("week", 0)))
    return current, prior


def fetch_week_weather(sched_rows: list[dict], target_week: int, season: int) -> dict:
    """(team -> {temp_f, wind_mph}) for the target week's games only.
    Open-Meteo's 16-day window can't cover far-future weeks anyway, so
    only the immediate target week gets a real forecast; every other
    remaining week is weather-neutral (matches Open-Meteo's actual
    limitation, not an arbitrary cutoff).

    Dome and closed-roof stadiums are skipped — they fall back to
    correct dome-neutral values (wind=0, temp=72) from build_game_context.
    """
    out: dict[str, dict] = {}
    for g in sched_rows:
        if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
            continue
        try:
            if int(g.get("week") or 0) != target_week:
                continue
        except (ValueError, TypeError):
            continue
        # Skip Open-Meteo fetch for dome/closed stadiums
        if g.get("roof", "") in ("dome", "closed"):
            continue
        gametime = g.get("gametime") or "13:00"
        gameday = g.get("gameday") or ""
        if not gameday:
            continue
        for team_key in ("home_team", "away_team"):
            team = g.get(team_key)
            coords = STADIUM_COORDS.get(team)
            if not team or not coords:
                continue
            try:
                iso = f"{gameday}T{gametime}:00"
                forecast = get_forecast(coords[0], coords[1], iso)
            except Exception:
                forecast = None
            if forecast:
                out[team] = forecast
    return out


def compute_byes(sched_rows: list[dict], season: int) -> dict:
    """Map team -> bye week from the REG schedule (teams with no game)."""
    weeks: dict[int, set] = {}
    for g in sched_rows:
        if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
            continue
        try:
            wk = int(g.get("week") or 0)
        except (ValueError, TypeError):
            continue
        if not 1 <= wk <= 18:
            continue
        weeks.setdefault(wk, set()).update([g.get("home_team"), g.get("away_team")])
    byes: dict[str, int] = {}
    for wk, playing in weeks.items():
        for team in _ALL_TEAMS:
            if team not in playing:
                byes.setdefault(team, wk)
    return byes


_ALL_TEAMS = ["ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
              "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
              "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
              "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS"]


def compute_team_def(team_rows: list[dict], sched_rows: list[dict],
                     current_week: int, season: int) -> list[dict]:
    """Per-team defensive averages: sacks/turnovers from team-week rows,
    points allowed from schedule scores, yards allowed by joining the
    opponent's offensive yards. Same recency weighting as players.
    """
    # Schedule lookup: (week) -> games; scores only exist for played games.
    games: dict[int, list] = {}
    for g in sched_rows:
        if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
            continue
        try:
            wk = int(g.get("week") or 0)
        except (ValueError, TypeError):
            continue
        if wk >= 1:
            games.setdefault(wk, []).append(g)

    # Opponent offensive yards: (team, week) -> pass+rush yards.
    off_yds: dict[tuple, float] = {}
    for r in team_rows:
        try:
            wk = int(r.get("week") or 0)
        except (ValueError, TypeError):
            continue
        if r.get("season_type", "REG") != "REG" or wk <= 0 or wk > current_week:
            continue
        off_yds[(r.get("team"), wk)] = _num(r.get("passing_yards")) + _num(r.get("rushing_yards"))

    # Group defensive rows by team.
    by_team: dict[str, list] = {}
    for r in team_rows:
        try:
            wk = int(r.get("week") or 0)
        except (ValueError, TypeError):
            continue
        if r.get("season_type", "REG") != "REG" or wk <= 0 or wk > current_week:
            continue
        by_team.setdefault(r.get("team"), []).append((wk, r))

    out = []
    for team, wrs in by_team.items():
        wrs.sort(key=lambda x: x[0])
        n = len(wrs)
        weights = [2 if i >= n - 3 else 1 for i in range(n)]
        total_w = sum(weights) or 1

        def wavg(key):
            return sum(_num(r.get(key)) * w for (_, r), w in zip(wrs, weights)) / total_w

        # Points/yards allowed per played week with data.
        pa_vals, ya_vals = [], []
        for (wk, _), w in zip(wrs, weights):
            for g in games.get(wk, []):
                opp = None
                if g.get("home_team") == team:
                    opp, pts = g.get("away_team"), g.get("away_score")
                elif g.get("away_team") == team:
                    opp, pts = g.get("home_team"), g.get("home_score")
                else:
                    continue
                try:
                    pa_vals.append((float(pts), w))
                except (ValueError, TypeError):
                    pass
                if (opp, wk) in off_yds:
                    ya_vals.append((off_yds[(opp, wk)], w))

        def wmean(vals):
            s = sum(v * w for v, w in vals)
            t = sum(w for _, w in vals)
            return (s / t) if t else None

        pa = wmean(pa_vals)
        ya = wmean(ya_vals)
        def_avg = {
            "sacks": round(wavg("def_sacks"), 3),
            "ints": round(wavg("def_interceptions"), 3),
            "fum_rec": round(wavg("fumble_recovery_opp"), 3),
            "ff": round(wavg("def_fumbles_forced"), 3),
            "def_tds": round(wavg("def_tds"), 3),
            "st_tds": round(wavg("special_teams_tds"), 3),
            "safeties": round(wavg("def_safeties"), 3),
            "blk_kicks": round(wavg("def_fg_blocks") + wavg("def_pat_blocks") + wavg("def_punt_blocks"), 3),
            "pts_allowed": round(pa, 2) if pa is not None else None,
            "yds_allowed": round(ya, 1) if ya is not None else None,
        }
        out.append({"team": team, "games_played": n, "def_avg": def_avg,
                    "bye_week": None,
                    "projected_points": round(score_team_def(def_avg, REF_DEF_SCORING), 2)})
    return out


_num = safe_float


def _num_or_none(v):
    try:
        return float(v) if v not in (None, "") else None
    except (ValueError, TypeError):
        return None




def compute_projections(stats_rows: list[dict], current_week: int, season: int,
                        byes: dict | None = None, prior_season_rows: list[dict] | None = None,
                        game_ctx: dict | None = None, weather_by_team: dict | None = None) -> list[dict]:
    """Project per-game avg raw stats for the CURRENT target week only.

    For stat keys the father project's backtested pipeline covers
    (COVERED_STATS: QB/skill/kicker core stats), uses the full
    shrinkage/regression/Vegas/weather pipeline (api/stat_projector.py).
    For every other AVG_STAT_KEYS entry (IDP, first downs, fumble-recovery
    detail, long-TD, FG-miss brackets, PAT missed, special-teams TD — no
    backtest evidence for these categories), keeps the original bare
    weighted_recent_avg — same behavior as before this port.

    ROS is still avg_pts * remaining_games (unchanged from before this
    port) — this port fixes the THIN-SAMPLE OVERWEIGHTING in the average
    itself, not the ROS summation strategy (deferred at plan time; the
    spec requires per-week independent summation but it was scoped out
    to keep this port bounded).
    """
    current_hist, prior_hist = fetch_current_and_prior_season_history(
        stats_rows, prior_season_rows or [], current_week, season)

    players = {}
    for pid, games in current_hist.items():
        first = games[-1]
        players[pid] = {
            "player_id": pid,
            "player_name": first.get("player_display_name") or first.get("player_name", ""),
            "position": first.get("position") or first.get("position_group", ""),
            "team": first.get("team", ""),
            "opponent_team": first.get("opponent_team", ""),
            "games": games,
        }
    # Players who only exist in the CURRENT week's row list (fetched by the
    # caller for team/opponent context) but have no prior game this season
    # yet still need an entry so rookies/first-week-back players appear.
    for row in stats_rows:
        pid = row.get("player_id") or row.get("player_name", "")
        if not pid or pid in players or row.get("season_type", "REG") != "REG":
            continue
        try:
            row_season = int(row.get("season", 0) or 0)
        except (ValueError, TypeError):
            continue
        if row_season == season:
            players[pid] = {
                "player_id": pid,
                "player_name": row.get("player_display_name") or row.get("player_name", ""),
                "position": row.get("position") or row.get("position_group", ""),
                "team": row.get("team", ""),
                "opponent_team": row.get("opponent_team", ""),
                "games": [],
            }

    game_ctx = game_ctx or {}
    weather_by_team = weather_by_team or {}
    total_weeks = 18
    projections = []

    for pid, p in players.items():
        pos = (p["position"] or "UNK").upper()
        history = p["games"]
        prior_games = prior_hist.get(pid, [])
        ctx = game_ctx.get((p["team"], current_week), {})
        implied_total = ctx.get("implied_total", 0)
        weather = weather_by_team.get(p["team"], {})
        wind_mph = weather.get("wind_mph", ctx.get("wind", 0) or 0)
        temp_f = weather.get("temp_f", ctx.get("temp"))

        avg_stats: dict = {}
        covered = COVERED_STATS.get(pos, [])
        if covered:
            # Normalize stat values to floats for stat_projector
            norm_history = [normalize_row_stats(g) for g in history]
            norm_prior = [normalize_row_stats(g) for g in prior_games]
            projected = project_player_stats(
                player_history=norm_history, position=pos,
                prior_season_stats=norm_prior, implied_total=implied_total,
                wind_mph=wind_mph, temp_f=temp_f,
            )
            for key in covered:
                v = projected.get(key, 0.0)
                if v:
                    avg_stats[key] = round(v, 3)
        # Uncovered stat keys: original bare weighted-recent-avg (unchanged).
        weights = [2 if i >= len(history) - 3 else 1 for i in range(len(history))]
        total_w = sum(weights) or 1
        for key in AVG_STAT_KEYS:
            if key in covered:
                continue
            s = sum(_num(g.get(key)) * w for g, w in zip(history, weights))
            v = s / total_w if total_w else 0.0
            if v:
                avg_stats[key] = round(v, 3)

        avg_pts = score_avg_stats(avg_stats, REF_SCORING, pos)

        played = len(history)
        bye_week = (byes or {}).get(p.get("team", ""))
        remaining = max(0, total_weeks - current_week
                        - (1 if bye_week and bye_week > current_week else 0))
        ros_pts = avg_pts * remaining

        width = interval_width(pos, avg_pts)

        projections.append({
            "player_id": pid,
            "player_name": p["player_name"],
            "position": p["position"],
            "team": p["team"],
            "projected_points": round(avg_pts, 2),
            "projection_lower": round(max(0, avg_pts - width), 2),
            "projection_upper": round(avg_pts + width, 2),
            "width": round(width, 2),
            "ros_points": round(ros_pts, 2),
            "remaining_games": remaining,
            "games_played": played,
            "bye_week": bye_week,
            "avg_stats": avg_stats,
        })

    projections.sort(key=lambda x: x["projected_points"], reverse=True)
    return projections


def main():
    parser = argparse.ArgumentParser(description="Compute weekly projections")
    parser.add_argument("--week", type=int, help="Current NFL week (Sleeper state if omitted)")
    parser.add_argument("--season", type=int, default=None, help="NFL season year (Sleeper state if omitted)")
    args = parser.parse_args()

    # Auto-detect week/season from Sleeper state, never date math.
    week = args.week
    season = args.season
    if not week or not season:
        try:
            st = (get_nfl_state or (lambda: None))()
        except Exception:
            st = None
        if st:
            week = week or st["week"]
            season = season or st["season"]
    if not week or not season:
        now = datetime.now()
        season = season or (now.year if now.month >= 9 else now.year - 1)
        week = week or 1
    print(f"Computing projections for {season} week {week}...")

    # Fetch stats
    stats_rows = fetch_weekly_stats(season)
    prior_season_rows = fetch_prior_season_stats(season)

    # Schedule (byes) + team defense. Failures degrade gracefully:
    # no byes/team_def rather than no run at all.
    try:
        sched_rows = fetch_csv(SCHEDULE_URL, "schedule")
        byes = compute_byes(sched_rows, season)
        print(f"  Bye weeks for {len(byes)} teams")
    except Exception as e:
        print(f"  Schedule fetch failed ({e}) — skipping byes/team defense")
        sched_rows, byes = [], {}
    team_def = []
    if sched_rows:
        try:
            team_rows = fetch_csv(TEAM_STATS_URL.format(season=season), "team stats")
            team_def = compute_team_def(team_rows, sched_rows, week, season)
            print(f"  Team defense for {len(team_def)} teams")
        except Exception as e:
            print(f"  Team stats fetch failed ({e}) — skipping team defense")

    # Vegas/weather context for the target week (built from the same
    # schedule rows already fetched above for byes/team_def).
    game_ctx = build_game_context(sched_rows) if sched_rows else {}
    weather_by_team = fetch_week_weather(sched_rows, week, season) if sched_rows else {}
    print(f"  Weather forecast for {len(weather_by_team)} teams this week")

    # Compute projections
    projections = compute_projections(stats_rows, week, season, byes,
                                      prior_season_rows, game_ctx, weather_by_team)
    for td in team_def:
        td["bye_week"] = byes.get(td["team"])
    # Current-week opponents from the schedule (player-week rows carry
    # last game's opponent, which is stale for a forward projection).
    opponents: dict[str, str] = {}
    for g in sched_rows:
        if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
            continue
        try:
            if int(g.get("week") or 0) != week:
                continue
        except (ValueError, TypeError):
            continue
        home, away = g.get("home_team"), g.get("away_team")
        if home and away:
            opponents[home] = away
            opponents[away] = home
    for p in projections:
        p["opponent_team"] = opponents.get(p.get("team", ""), "BYE")
    for td in team_def:
        td["opponent_team"] = opponents.get(td.get("team", ""), "BYE")

    # Slate snapshots for every week (matchups view + game predictions).
    # Compact: teams, stadium, time, Vegas lines. Wind/temp ride along for
    # the target week only — Open-Meteo's 16-day window can't cover future
    # weeks, and those honestly stay null (wind chips show —). Dome games
    # get neutral indoor values (no wind exists inside).
    slate_dir = Path(__file__).parent.parent / "data" / "slate"
    slate_dir.mkdir(parents=True, exist_ok=True)
    by_week: dict[int, list] = {}
    for g in sched_rows:
        if str(g.get("season")) != str(season) or g.get("game_type") != "REG":
            continue
        try:
            wk = int(g.get("week") or 0)
        except (ValueError, TypeError):
            continue
        if not 1 <= wk <= 18:
            continue
        wind_mph, temp_f, precip_prob = None, None, None
        if wk == week:
            if g.get("roof", "") in ("dome", "closed"):
                wind_mph, temp_f, precip_prob = 0, 72, 0
            else:
                w = weather_by_team.get(g.get("home_team") or "") or {}
                try:
                    wind_mph = round(float(w["wind_mph"]), 1) if w.get("wind_mph") is not None else None
                    temp_f = round(float(w["temp_f"]), 1) if w.get("temp_f") is not None else None
                    precip_prob = round(float(w["precip_prob"]), 0) if w.get("precip_prob") is not None else None
                except (ValueError, TypeError):
                    wind_mph, temp_f, precip_prob = None, None, None
        by_week.setdefault(wk, []).append({
            "home_team": g.get("home_team"), "away_team": g.get("away_team"),
            "stadium": g.get("stadium"), "gameday": g.get("gameday"),
            "gametime": g.get("gametime"),
            "spread_line": _num_or_none(g.get("spread_line")),
            "total_line": _num_or_none(g.get("total_line")),
            "wind_mph": wind_mph, "temp_f": temp_f,
            "precip_prob": precip_prob,
        })
    for wk, games in by_week.items():
        with open(slate_dir / f"{season}_week_{wk:02d}.json", "w") as f:
            json.dump({"week": wk, "season": season, "games": games}, f)

    # Write output
    out_dir = Path(__file__).parent.parent / "data" / "projections"
    out_dir.mkdir(parents=True, exist_ok=True)

    outfile = out_dir / f"{season}_week_{week:02d}.json"
    data = {
        "week": week,
        "season": season,
        # Real UTC instant — naive local .now() mislabeled with Z skewed
        # freshness by the machine offset (e.g. 6h on CST dev machines;
        # GitHub runners happen to be UTC so never noticed).
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "players": projections,
        "team_def": team_def,
        "byes": byes,
    }

    with open(outfile, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Wrote {len(projections)} projections to {outfile}")

    latest = out_dir / "latest.json"
    with open(latest, "w") as f:
        json.dump(data, f, indent=2)


if __name__ == "__main__":
    main()
