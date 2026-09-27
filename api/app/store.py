"""In-memory state (demo only). Resettable. Never holds raw FI payloads after compute-then-delete."""
from __future__ import annotations

import copy
import threading
from datetime import datetime, timezone

from app.fixtures.households import HOUSEHOLDS

_lock = threading.RLock()
STATE: dict = {}

DPDP_KEYS = ["profile", "device_signals", "ration", "electricity", "rc", "epf"]


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


def reset() -> None:
    with _lock:
        STATE.clear()
        STATE["consents"] = {c["handle"]: c for c in (_seed_consent(h) for h in HOUSEHOLDS)}
        STATE["dpdp"] = {h: {k: (k == "profile") for k in DPDP_KEYS} for h in HOUSEHOLDS}
        STATE["overlays"] = {h: {} for h in HOUSEHOLDS}
        STATE["open_actions"] = {h: [] for h in HOUSEHOLDS}
        STATE["jars"] = {h: copy.deepcopy(HOUSEHOLDS[h]["jars"]) for h in HOUSEHOLDS}
        STATE["game"] = {}
        STATE["data_source"] = {
            h: {"mode": "replay", "aa": "Anumati (sandbox replay)", "analytics": "Perfios (replay)",
                "fetched_at": "2026-09-23T09:00:00+05:30"}
            for h in HOUSEHOLDS
        }
        STATE["derived"] = {}


def lock():
    return _lock


reset()
