"""assign_slots must produce the max-total lineup, not the greedy one.

Greedy (slot-order first-fit) provably loses on SUPER_FLEX + QB shapes:
it parks RB1 in the superflex and starts QB2 nowhere. The fuzz test
compares against branch-and-bound brute force on real Sleeper roster
shapes; the deterministic test pins the known counterexample.
"""
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))

from rosters import _slot_eligible, assign_slots

SHAPES = [
    ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN", "BN"],
    ["QB", "SUPER_FLEX", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "FLEX", "BN", "BN"],
    ["QB", "RB", "RB", "WR", "WR", "TE", "WRRB_FLEX", "REC_FLEX", "FLEX", "BN"],
    ["QB", "RB", "WR", "WR", "TE", "K", "DEF", "FLEX", "BN"],
]
POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"]


def _pool(seed):
    rng = random.Random(seed)
    rp = SHAPES[seed % len(SHAPES)]
    n_start = sum(1 for s in rp if s.upper() not in ("BN", "IR", "TAXI"))
    n = n_start + rng.randint(0, 5)
    return ([{"player_id": f"p{i}", "sleeper_id": f"p{i}",
              "player_name": f"P {i}", "position": rng.choice(POSITIONS),
              "weekly": round(rng.uniform(1.0, 25.0), 1)}
             for i in range(n)], rp)


def _total(starters):
    return round(sum(s.get("weekly") or 0 for s in starters), 1)


def _brute_force_total(pool, rp):
    """Exact max lineup total: DFS over slots, pruned by an admissible
    bound (per-slot max over all players). Pools are small; ties are
    rare under random floats, so pruning cuts the tree hard."""
    slots = [s.upper() for s in rp if s.upper() not in ("BN", "IR", "TAXI")]
    cands = sorted(pool, key=lambda p: -p["weekly"])
    gmax = [max((p["weekly"] for p in cands
                 if _slot_eligible(p["position"], s)), default=0.0)
            for s in slots]
    suf = [0.0] * (len(slots) + 1)
    for i in range(len(slots) - 1, -1, -1):
        suf[i] = suf[i + 1] + gmax[i]
    best = 0.0

    def dfs(i, used, cur):
        nonlocal best
        if cur + suf[i] <= best + 1e-9:
            return
        if i == len(slots):
            best = max(best, cur)
            return
        for j, p in enumerate(cands):
            if used >> j & 1:
                continue
            if _slot_eligible(p["position"], slots[i]):
                dfs(i + 1, used | (1 << j), cur + p["weekly"])
        dfs(i + 1, used, cur)  # slot left empty

    dfs(0, 0, 0.0)
    return round(best, 1)


def test_superflex_q2_over_rb1():
    pool = [
        {"player_id": "q1", "sleeper_id": "q1", "player_name": "QB One", "position": "QB", "weekly": 22.0},
        {"player_id": "q2", "sleeper_id": "q2", "player_name": "QB Two", "position": "QB", "weekly": 18.0},
        {"player_id": "r1", "sleeper_id": "r1", "player_name": "RB One", "position": "RB", "weekly": 20.0},
        {"player_id": "r2", "sleeper_id": "r2", "player_name": "RB Two", "position": "RB", "weekly": 8.0},
    ]
    # Greedy parks RB1 (20) in SUPER_FLEX and starts RB2 (8): 50.
    # Optimal: QB1 + SF:QB2 + RB1 = 60.
    starters, _ = assign_slots(pool, ["QB", "SUPER_FLEX", "RB", "BN"])
    assert _total(starters) == 60.0


def test_assign_slots_matches_brute_force_randomized():
    for seed in range(100):
        pool, rp = _pool(seed)
        starters, _ = assign_slots(pool, rp)
        assert _total(starters) == _brute_force_total(pool, rp), seed


def test_assign_slots_bench_and_labels_unchanged():
    pool, rp = _pool(7)
    starters, bench = assign_slots(pool, rp)
    assert len(starters) + len(bench) == len(pool)
    assert all(s.get("slot") for s in starters + bench)
    # Starters sorted by canonical slot order, bench by value.
    assert [s["slot"] for s in bench] == [f"BN{i + 1}" for i in range(len(bench))]
