"""In-memory state for the three DEMO households (A/B/C). Never holds raw FI payloads.

Each visitor gets their own copy. The browser sends a random id in `X-DY-Demo`; everything a visitor
does to a demo household (corrections, Gullak deposits, points, a replay consent they stop) changes
only their copy, so one judge's taps can never change or reset the demo for anyone else. Requests
without the header (team scripts, tests) use the shared default copy. A linked member's own household
never lives here (see routers/twin.py: stateless).
"""
from __future__ import annotations

import copy
import re
import threading
from collections import OrderedDict
from contextvars import ContextVar, Token
from datetime import datetime, timezone

from app.fixtures.households import HOUSEHOLDS

_lock = threading.RLock()

DPDP_KEYS = ["profile", "device_signals", "ration", "electricity", "rc", "epf"]
MAX_VISITORS = 500                    # oldest visitor copies are dropped first (they reseed on return)
SHARED_KEYS = {"derived"}             # read-only caches (replay analytics), identical for everyone
VISITOR_ID = re.compile(r"^[A-Za-z0-9-]{8,64}$")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _seed_consent(hid: str) -> dict:
    hh = HOUSEHOLDS[hid]
    earner = next(m for m in hh["members"] if m.get("main_earner"))
    return {
        "handle": f"cn_{hid.lower()}_seed",
        "household_id": hid,
        "member_id": earner["id"],
        "member_name": earner["name"],
        "status": "ACTIVE",
        "mode": "replay",
        "created_at": "2026-09-20T10:15:00+05:30",
        "polls": 0,
        "fetched": True,
    }


def _seed() -> dict:
    return {
        "consents": {c["handle"]: c for c in (_seed_consent(h) for h in HOUSEHOLDS)},
        "dpdp": {h: {k: (k == "profile") for k in DPDP_KEYS} for h in HOUSEHOLDS},
        "overlays": {h: {} for h in HOUSEHOLDS},
        "open_actions": {h: [] for h in HOUSEHOLDS},
        "jars": {h: copy.deepcopy(HOUSEHOLDS[h]["jars"]) for h in HOUSEHOLDS},
        "game": {},
        "data_source": {
            h: {"mode": "replay", "aa": "Anumati (sandbox replay)", "analytics": "Perfios (replay)",
                "fetched_at": "2026-09-23T09:00:00+05:30"}
            for h in HOUSEHOLDS
        },
        "derived": {},
    }


_default: dict = {}
_visitors: "OrderedDict[str, dict]" = OrderedDict()
_current: ContextVar[dict | None] = ContextVar("dy_demo_state", default=None)


class _State:
    """`store.STATE[...]` as before, but pointing at the current visitor's copy."""

    def _d(self, key=None) -> dict:
        if key in SHARED_KEYS:
            return _default
        return _current.get() or _default

    def __getitem__(self, k):
        return self._d(k)[k]

    def __setitem__(self, k, v):
        self._d(k)[k] = v

    def __contains__(self, k):
        return k in self._d(k)

    def get(self, k, default=None):
        return self._d(k).get(k, default)

    def setdefault(self, k, default=None):
        return self._d(k).setdefault(k, default)


STATE = _State()


def use_visitor(visitor_id: str | None) -> Token | None:
    """Point STATE at this visitor's copy for the current request (seeded on first use)."""
    if not visitor_id or not VISITOR_ID.match(visitor_id):
        return None
    with _lock:
        d = _visitors.get(visitor_id)
        if d is None:
            d = _seed()
            d.pop("derived")
            _visitors[visitor_id] = d
            while len(_visitors) > MAX_VISITORS:
                _visitors.popitem(last=False)
        else:
            _visitors.move_to_end(visitor_id)
    return _current.set(d)


def done_visitor(token: Token | None) -> None:
    if token is not None:
        _current.reset(token)


def forget_current_visitor() -> bool:
    """Drop the current visitor's demo copy (their "Delete everything"). The shared copy is never dropped."""
    d = _current.get()
    if d is None:
        return False
    with _lock:
        for k, v in list(_visitors.items()):
            if v is d:
                del _visitors[k]
                return True
    return False


def reset() -> None:
    """Reset the current copy (the shared default when no visitor is set)."""
    with _lock:
        d = _current.get()
        if d is None:
            _default.clear()
            _default.update(_seed())
            return
        seed = _seed()
        seed.pop("derived")
        d.clear()
        d.update(seed)


def reset_all() -> None:
    """Team-only (admin): every visitor copy dropped, the shared copy reseeded."""
    with _lock:
        _visitors.clear()
        _default.clear()
        _default.update(_seed())


def lock():
    return _lock


reset_all()
