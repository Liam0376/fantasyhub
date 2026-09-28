"""pytest root config: `network` marker + offline skip.

Tests marked `network` call live endpoints (Sleeper, open-meteo,
nflverse/GitHub releases). They skip when the network probe fails so
`python3 -m pytest api/ scripts/ -q` is deterministic offline and in
CI. Force with FH_OFFLINE=1 (skip) or FH_OFFLINE=0 (run anyway).
"""
import os
import socket

import pytest


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "network: test calls a live external endpoint (skipped when offline)",
    )


_probe = {"done": False, "online": False}


def _is_online() -> bool:
    forced = os.environ.get("FH_OFFLINE")
    if forced is not None:
        return forced == "0"
    if not _probe["done"]:
        try:
            with socket.create_connection(("api.sleeper.app", 443), timeout=3):
                _probe["online"] = True
        except OSError:
            _probe["online"] = False
        _probe["done"] = True
    return _probe["online"]


@pytest.fixture(autouse=True)
def _skip_network_when_offline(request):
    if request.node.get_closest_marker("network") and not _is_online():
        pytest.skip("network test skipped (offline)")
