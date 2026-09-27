from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app import connectors, store
from app.connectors.anumati.client import FI_TYPES
from app.engines.common import L
from app.fixtures.households import HOUSEHOLDS

log = logging.getLogger("dhanyukti.consent")
router = APIRouter(prefix="/api/consent", tags=["consent"])

DPDP_META = {
    "profile": (L("Ghar ka profile", "Household profile"), L("Aapke parivaar ke hisaab se salah dene ke liye", "To tailor advice to your family")),
    "device_signals": (L("Phone ke signal (SMS)", "Device signals (SMS)"), L("Bill aur EMI ki tareekh pakadne ke liye", "To catch bill and EMI dates")),
    "ration": (L("Ration card", "Ration card"), L("Sarkari yojana ki patrata dekhne ke liye", "To check scheme eligibility")),
    "electricity": (L("Bijli bill", "Electricity bill"), L("Bill ki tareekh aur rakam jaanne ke liye", "To know bill dates and amounts")),
    "rc": (L("Gaadi ka RC", "Vehicle RC"), L("Gaadi loan aur bima check karne ke liye", "To check vehicle loan and insurance")),
    "epf": (L("EPF passbook", "EPF passbook"), L("PF bachat ko suraksha mein ginne ke liye", "To count PF savings in your safety net")),
}
STEPS = [
    ("consent_verified", L("Sahmati jaanchi gayi", "Consent verified")),
    ("accounts_linked", L("Khate jude", "Accounts linked")),
    ("data_fetched", L("Data aaya (encrypted)", "Data fetched (encrypted)")),
    ("decrypted", L("Data khola gaya", "Decrypted")),
    ("perfios_analytics", L("Perfios analytics", "Perfios analytics")),
    ("twin_built", L("Household Twin bana", "Household Twin built")),
    ("raw_deleted", L("Kachcha data delete (hisaab ke baad)", "Raw data deleted (compute-then-delete)")),
]


class DpdpIn(BaseModel):
    household_id: str
    grants: dict[str, bool]


class StartIn(BaseModel):
    household_id: str
    member_id: str
    mobile: str


def _consent(handle: str) -> dict:
    c = store.STATE["consents"].get(handle)
    if not c:
        raise HTTPException(404, "unknown consent handle")
    return c


def _hh(hid: str) -> str:
    h = hid.upper()
    if h not in HOUSEHOLDS:
        raise HTTPException(404, f"unknown household {hid}")
    return h


def _artefact(c: dict) -> dict:
    created = datetime.fromisoformat(c["created_at"])
    return {"handle": c["handle"], "member_id": c["member_id"], "member_name": c["member_name"], "aa": "Anumati",
            "status": c["status"],
            "purpose": L("Ghar ke paise ka hisaab (Personal finance management)", "Personal finance management"),
            "fi_types": FI_TYPES, "range_months": 6, "fetch": "PERIODIC_MONTHLY",
            "expiry": (created + timedelta(days=90)).date().isoformat(),
            "data_life": L("1 din — hisaab ke baad kachcha data delete", "1 day — raw data deleted after compute"),
            "created_at": c["created_at"]}


def _dpdp_list(h: str) -> list[dict]:
    g = store.STATE["dpdp"][h]
    return [{"key": k, "label": DPDP_META[k][0], "why": DPDP_META[k][1], "granted": g[k],
             "until": L("Jab tak aap band na karein", "Until you turn it off") if g[k] else L("Band", "Off")}
            for k in store.DPDP_KEYS]


@router.get("/passport/{hid}")
def passport(hid: str):
    h = _hh(hid)
    aa = [_artefact(c) for c in store.STATE["consents"].values() if c["household_id"] == h]
    return {"aa": sorted(aa, key=lambda x: x["created_at"], reverse=True), "dpdp": _dpdp_list(h)}


@router.post("/dpdp")
def dpdp(body: DpdpIn):
    h = _hh(body.household_id)
    with store.lock():
        for k, v in body.grants.items():
            if k in store.DPDP_KEYS:
                store.STATE["dpdp"][h][k] = bool(v)
        return {"ok": True, "grants": dict(store.STATE["dpdp"][h])}


@router.post("/aa/start")
def aa_start(body: StartIn):
    h = _hh(body.household_id)
    member = next((m for m in HOUSEHOLDS[h]["members"] if m["id"] == body.member_id), None)
    if not member:
        raise HTTPException(404, "unknown member")
    res, mode = connectors.with_fallback(connectors.aa(), connectors.replay_aa(), "create_consent",
                                         h, body.member_id, body.mobile)
    with store.lock():
        store.STATE["consents"][res["consent_handle"]] = {
            "handle": res["consent_handle"], "household_id": h, "member_id": member["id"], "member_name": member["name"],
            "status": "PENDING", "mode": mode, "created_at": store.now_iso(), "polls": 0, "fetched": False}
    return {"consent_handle": res["consent_handle"], "redirect_url": res["redirect_url"], "status": "PENDING", "mode": mode}


@router.get("/aa/{handle}/status")
def aa_status(handle: str):
    c = _consent(handle)
    if c["status"] in ("REVOKED", "EXPIRED", "REJECTED"):
        return {"status": c["status"], "mode": c["mode"]}
    if c["mode"] == "live":
        res, mode = connectors.with_fallback(connectors.aa("live"), connectors.replay_aa(), "consent_status", handle)
        if mode == "replay":
            c["mode"] = "replay"
        else:
            c["status"] = res["status"]
        return {"status": c["status"], "mode": c["mode"]}
    res = connectors.replay_aa().consent_status(handle)
    return {"status": res["status"], "mode": "replay"}


@router.post("/aa/{handle}/approve-sandbox")
def approve_sandbox(handle: str):
    c = _consent(handle)
    if c["mode"] == "live":
        raise HTTPException(409, "approve-sandbox is only available in replay mode")
    return {"status": connectors.replay_aa().approve(handle)["status"]}


@router.post("/aa/{handle}/fetch")
def aa_fetch(handle: str):
    c = _consent(handle)
    if c["status"] != "ACTIVE":
        raise HTTPException(409, f"consent is {c['status']}, must be ACTIVE to fetch")
    h = c["household_id"]
    live = connectors.aa("live") if c["mode"] == "live" else connectors.replay_aa()
    res, mode = connectors.with_fallback(live, connectors.replay_aa(), "fetch_fi", handle, h)
    accounts, txns = res["accounts"], res["transactions"]
    # compute-then-delete: the Household Twin keeps only derived facts; raw FI is dropped now.
    res.pop("fi", None)
    del res
    with store.lock():
        c["fetched"] = True
        store.STATE["derived"].pop(h, None)  # force analytics recompute
        store.STATE["data_source"][h] = {
            "mode": mode, "aa": "Anumati (live)" if mode == "live" else "Anumati (sandbox replay)",
            "analytics": "Perfios (replay)", "fetched_at": store.now_iso()}
    return {"ok": True, "accounts": accounts, "transactions": txns,
            "steps": [{"key": k, "label": lbl, "done": True} for k, lbl in STEPS], "mode": mode}


@router.post("/aa/{handle}/revoke")
def aa_revoke(handle: str):
    c = _consent(handle)
    h = c["household_id"]
    mode = "replay"
    if c["mode"] == "live":
        _, mode = connectors.with_fallback(connectors.aa("live"), connectors.replay_aa(), "revoke", handle)
    with store.lock():
        c["status"] = "REVOKED"
        store.STATE["derived"].pop(h, None)
        store.STATE["open_actions"][h] = []
        store.STATE["overlays"][h] = {}
        still_active = any(x["status"] == "ACTIVE" and x["household_id"] == h for x in store.STATE["consents"].values())
        if not still_active:
            store.STATE["data_source"][h] = {"mode": "fixture", "aa": "Anumati (consent revoked)",
                                             "analytics": "Perfios (not used)", "fetched_at": store.now_iso()}
    return {"status": "REVOKED", "deleted": ["derived_profile", "open_actions"], "mode": mode}


@router.post("/aa/callback")
async def aa_callback(request: Request):
    """Consent / FI notifications from Anumati. Signature is verified via the connector hook;
    either way the status is only trusted after our own status poll."""
    raw = await request.body()
    verified, _ = connectors.run_with_fallback(
        (lambda: connectors.aa("live").verify_callback(dict(request.headers), raw))
        if connectors.aa().mode == "live" else None,
        lambda: False if connectors.aa().mode == "live" else connectors.replay_aa().verify_callback({}, raw))
    try:
        body = json.loads(raw or b"{}")
    except ValueError:
        body = {}
    handle = None
    if isinstance(body, dict):
        handle = ((body.get("ConsentStatusNotification") or {}).get("consentHandle") or body.get("consentHandle")
                  or body.get("ConsentHandle"))
    known = bool(handle and handle in store.STATE["consents"])
    log.info("anumati callback verified=%s handle_known=%s", bool(verified), known)
    if known:
        store.STATE["consents"][handle]["notified"] = True  # confirmed by the next status poll
    return {"ok": True}
