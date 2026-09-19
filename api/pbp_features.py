"""PBP opportunity features from nflverse play-by-play CSV.

Ported from father's src/ffanalytics/adapters/pbp.py — same aggregation
logic, but fetches CSV directly instead of nflreadpy/Polars.

Returns per-player-per-week: target_share, rush_share, air_yards,
air_yards_share, redzone_targets, redzone_carries, snap_share.
"""

from __future__ import annotations

import csv
import io
from collections import defaultdict

PBP_URL = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{season}.csv.gz"

# Only fetch columns we need — PBP CSV is ~300MB uncompressed per season.
# gzip transfer keeps it ~50MB.
PBP_COLS = {
    "week", "posteam", "season_type", "aborted_play",
    "pass_attempt", "pass", "rush_attempt", "rush", "play_type",
    "receiver_player_id", "receiver_id",
    "rusher_player_id", "rusher_id",
    "passer_player_id", "passer_id",
    "air_yards", "yardline_100",
}


def fetch_pbp_csv(season: int) -> list[dict]:
    import requests
    url = PBP_URL.format(season=season)
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()

    import gzip
    raw = gzip.decompress(resp.content).decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(raw))
    rows = []
    for r in reader:
        filtered = {k: r.get(k, "") for k in PBP_COLS if k in r}
        if filtered.get("season_type", "REG") != "REG":
            continue
        rows.append(filtered)
    return rows


def aggregate_pbp(rows: list[dict], season: int) -> dict[tuple[str, int], dict]:
    """Aggregate PBP rows into per-(player_id, week) feature dicts.

    Returns dict[(gsis_id, week) -> feature_dict].
    """
    team_targets: dict[tuple[str, int], int] = defaultdict(int)
    team_carries: dict[tuple[str, int], int] = defaultdict(int)
    team_air_yards: dict[tuple[str, int], float] = defaultdict(float)
    team_plays: dict[tuple[str, int], int] = defaultdict(int)

    player_targets: dict[tuple[str, int], int] = defaultdict(int)
    player_carries: dict[tuple[str, int], int] = defaultdict(int)
    player_air_yards: dict[tuple[str, int], float] = defaultdict(float)
    player_redzone_targets: dict[tuple[str, int], int] = defaultdict(int)
    player_redzone_carries: dict[tuple[str, int], int] = defaultdict(int)
    player_plays: dict[tuple[str, int], int] = defaultdict(int)
    player_team: dict[tuple[str, int], str] = {}

    for r in rows:
        wk = r.get("week")
        if not wk:
            continue
        try:
            wk = int(wk)
        except (ValueError, TypeError):
            continue

        posteam = (r.get("posteam") or "").strip()
        if not posteam:
            continue

        if str(r.get("aborted_play", "0")) == "1":
            continue

        is_pass = str(r.get("pass_attempt", "0")) == "1" or str(r.get("pass", "0")) == "1"
        is_rush = str(r.get("rush_attempt", "0")) == "1" or str(r.get("rush", "0")) == "1"
        if not is_pass and not is_rush:
            pt = r.get("play_type", "")
            if pt == "pass":
                is_pass = True
            elif pt == "run":
                is_rush = True

        if is_pass or is_rush:
            team_plays[(posteam, wk)] += 1

        involved: set[str] = set()

        rec_id = r.get("receiver_player_id") or r.get("receiver_id") or ""
        rec_id = rec_id.strip()
        if rec_id and rec_id not in ("NA", "None", "nan", ""):
            player_targets[(rec_id, wk)] += 1
            team_targets[(posteam, wk)] += 1
            player_team[(rec_id, wk)] = posteam
            involved.add(rec_id)

            ay = r.get("air_yards", "0")
            try:
                ay_f = float(ay) if ay not in (None, "", "NA", "nan") else 0.0
            except (ValueError, TypeError):
                ay_f = 0.0
            player_air_yards[(rec_id, wk)] += ay_f
            team_air_yards[(posteam, wk)] += ay_f

            y100 = r.get("yardline_100")
            if y100 and y100 not in ("NA", "nan", ""):
                try:
                    if float(y100) <= 20:
                        player_redzone_targets[(rec_id, wk)] += 1
                except (ValueError, TypeError):
                    pass

        rush_id = (r.get("rusher_player_id") or r.get("rusher_id") or "").strip()
        if rush_id and rush_id not in ("NA", "None", "nan", ""):
            player_carries[(rush_id, wk)] += 1
            team_carries[(posteam, wk)] += 1
            player_team[(rush_id, wk)] = posteam
            involved.add(rush_id)

            y100 = r.get("yardline_100")
            if y100 and y100 not in ("NA", "nan", ""):
                try:
                    if float(y100) <= 20:
                        player_redzone_carries[(rush_id, wk)] += 1
                except (ValueError, TypeError):
                    pass

        passer_id = (r.get("passer_player_id") or r.get("passer_id") or "").strip()
        if passer_id and passer_id not in ("NA", "None", "nan", "") and is_pass:
            if passer_id not in involved:
                if (passer_id, wk) not in player_team:
                    player_team[(passer_id, wk)] = posteam
                involved.add(passer_id)

        for pid in involved:
            player_plays[(pid, wk)] += 1

    all_keys: set[tuple[str, int]] = set()
    all_keys.update(player_targets.keys())
    all_keys.update(player_carries.keys())
    all_keys.update(player_plays.keys())

    out: dict[tuple[str, int], dict] = {}
    for pid, wk in all_keys:
        team = player_team.get((pid, wk), "")
        t_tgt = team_targets.get((team, wk), 0)
        t_car = team_carries.get((team, wk), 0)
        t_air = team_air_yards.get((team, wk), 0.0)
        t_plays = team_plays.get((team, wk), 0)

        out[(pid, wk)] = {
            "targets": player_targets.get((pid, wk), 0),
            "carries": player_carries.get((pid, wk), 0),
            "target_share": (player_targets.get((pid, wk), 0) / t_tgt) if t_tgt else 0.0,
            "rush_share": (player_carries.get((pid, wk), 0) / t_car) if t_car else 0.0,
            "air_yards": player_air_yards.get((pid, wk), 0.0),
            "air_yards_share": (player_air_yards.get((pid, wk), 0.0) / t_air) if t_air else 0.0,
            "redzone_targets": player_redzone_targets.get((pid, wk), 0),
            "redzone_carries": player_redzone_carries.get((pid, wk), 0),
            "snap_share": (player_plays.get((pid, wk), 0) / t_plays) if t_plays else 0.0,
            "team": team,
        }

    return out
