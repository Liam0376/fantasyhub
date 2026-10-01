"""FantasyCalc market: league-matched params, top-level parse, TTL cache.

The old snapshot read maybeTier/maybeAdp/maybeRosterPercent from
entry["player"] — they live at item top level, so 197/197 were null.
These tests pin the fix, plus graceful degradation (market never
breaks a verdict) and null-not-zero for missing players.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from market import fc_fetch, fc_load, fc_params, parse_fc, value_of


def _settings(**over):
    s = {"type": 0, "num_teams": 12,
         "scoring": {"rec": 1.0}, "roster_positions": ["QB", "RB", "BN"]}
    s.update(over)
    return s


def _item(sid="4046", **over):
    it = {"value": 8000, "trend30Day": 100, "maybeTier": 1,
          "maybeAdp": 12.5, "maybeRosterPercent": 0.99,
          "maybeMovingStandardDeviation": -2,
          "maybeTradeFrequency": 0.0114,
          "player": {"sleeperId": sid, "name": "Patrick Mahomes"}}
    it.update(over)
    return it


def test_params_from_league_settings():
    assert fc_params(_settings()) == {"isDynasty": False, "numQbs": 1,
                                      "numTeams": 12, "ppr": 1}
    sf = _settings(roster_positions=["QB", "SUPER_FLEX", "RB", "BN"])
    assert fc_params(sf)["numQbs"] == 2
    two_qb = _settings(roster_positions=["QB", "QB", "RB", "BN"])
    assert fc_params(two_qb)["numQbs"] == 2
    assert fc_params(_settings(type=2))["isDynasty"] is True
    assert fc_params(_settings(scoring={"rec": 0.5}))["ppr"] == 0.5
    assert fc_params(_settings(scoring={"rec": 0}))["ppr"] == 0
    assert fc_params(_settings(num_teams=10))["numTeams"] == 10


def test_parse_reads_top_level_fields():
    parsed = parse_fc([_item(), _item(sid="9999", value=100)])
    row = parsed["4046"]
    assert row == {"v": 8000, "t30": 100, "tier": 1, "adp": 12.5,
                   "roster_pct": 0.99, "msd": -2, "freq": 0.0114}
    assert parsed["9999"]["v"] == 100
    # Items without a sleeperId never key the map.
    assert parse_fc([{"value": 5, "player": {}}]) == {}


def test_missing_player_null_not_zero():
    fc = parse_fc([_item()])
    assert value_of(fc, "4046") == 8000
    assert value_of(fc, "0000") is None  # missing is null, never 0


def test_market_down_still_verdict(monkeypatch):
    # Dead API and no file: empty map plus a warning, never a raise.
    monkeypatch.setattr("market._read_default_file", lambda: (None, None))
    monkeypatch.setattr("market.fc_fetch", lambda *a, **k: (_ for _ in ()).throw(Exception("down")))
    players, warns = fc_load(_settings())
    assert players == {}
    assert any("market" in w.lower() for w in warns)


def test_default_combo_uses_file_no_network(monkeypatch, tmp_path):
    # Default combo served from the cron file: requests must not fire.
    import json
    f = tmp_path / "fantasycalc.json"
    f.write_text(json.dumps({"players": {"4046": {"v": 8000, "t30": 1}}}))
    monkeypatch.setattr("market._DEFAULT_PATH", str(f))

    def _boom(*a, **k):
        raise AssertionError("network must not fire for the default combo")
    monkeypatch.setattr("market.requests.get", _boom)
    players, warns = fc_load(_settings())
    assert players["4046"]["v"] == 8000
    assert warns == []


def test_stale_default_file_warns(monkeypatch, tmp_path):
    # Review catch: a days-old cron snapshot served silently. Older
    # than 72h warns; missing updated_at stays quiet (legacy files).
    import json
    from datetime import datetime, timedelta, timezone
    old = (datetime.now(timezone.utc) - timedelta(hours=100)).isoformat()
    f = tmp_path / "fantasycalc.json"
    f.write_text(json.dumps({"updated_at": old, "players": {"4046": {"v": 1}}}))
    monkeypatch.setattr("market._DEFAULT_PATH", str(f))
    players, warns = fc_load(_settings())
    assert players["4046"]["v"] == 1  # still served, but flagged
    assert any("stale" in w.lower() for w in warns)

    fresh = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    f.write_text(json.dumps({"updated_at": fresh, "players": {"4046": {"v": 1}}}))
    _, warns = fc_load(_settings())
    assert warns == []


def test_nondefault_combo_fetches_live_with_ttl(monkeypatch):
    # Superflex settings miss the default file: one live fetch, then
    # the TTL cache serves the second call with no second request.
    monkeypatch.setattr("market._read_default_file", lambda: (None, None))
    monkeypatch.setattr("market._fc_cache", {})
    calls = []

    def _fake(params, timeout=10):
        calls.append(params)
        return [_item()]
    monkeypatch.setattr("market.fc_fetch", _fake)
    sf = _settings(roster_positions=["QB", "SUPER_FLEX", "RB", "BN"])
    p1, _ = fc_load(sf)
    p2, _ = fc_load(sf)
    assert p1["4046"]["v"] == 8000 and p2["4046"]["v"] == 8000
    assert len(calls) == 1 and calls[0]["numQbs"] == 2
