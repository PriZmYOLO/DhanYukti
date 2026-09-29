"""Household Twin for a LINKED member (their own bank data), stateless.

The Next.js server holds the member's twin and state (jars, game, corrections) in its own store,
per session, and sends them with every call. FastAPI computes and forgets: nothing here is saved,
so no member's data ever sits in this service.

    POST /api/twin/build        decrypted statement (≤24h old) → twin (derived facts) + fresh state
    POST /api/twin/dashboard    twin + state → Dashboard
    POST /api/twin/simulate     twin + state + scenario → SimResult
    POST /api/twin/correct      twin + state + {field, value} → new state + Dashboard
    POST /api/twin/game-event   twin + state + event → result + new state
    POST /api/twin/ask          twin + state + question → answer
    POST /api/twin/hub/{kind}   a Perfios Hub lookup the member asked for → derived facts only
"""
from __future__ import annotations

import copy
import hmac
import logging
import os
import re
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app import connectors, pipeline
from app.config import settings
from app.connectors.base import SponsorError
from app.connectors.perfios.hub import HubLookupError
from app.engines import e02_twin, hub_facts
from app.game import service as game
from app.routers.ask import answer_with, rephrase
from app.routers.households import SimulateIn

def _server_only(x_twin_secret: str | None = Header(default=None)) -> None:
    """If TWIN_SHARED_SECRET is set (Render), only the Next.js server (same secret) may call these."""
    want = os.environ.get("TWIN_SHARED_SECRET", "")
    if want and not hmac.compare_digest(want, x_twin_secret or ""):
        raise HTTPException(401, "twin endpoints are server-to-server only")


router = APIRouter(prefix="/api/twin", tags=["twin"], dependencies=[Depends(_server_only)])


class TxnIn(BaseModel):
    date: str
    narration: str | None = None
    amount: float | None = None   # signed rupees: credit +, debit −


class AccountIn(BaseModel):
    id: str
    masked: str | None = None
    fip: str | None = None
    type: str | None = None
    fi_type: str | None = "DEPOSIT"
    balance: float | None = None   # rupees; None = the bank didn't send it
    # who linked this account: "me" (the phone's owner) or a family member's id from profile.linked
    member: str | None = Field(default=None, max_length=40)
    transactions: list[TxnIn] = Field(default_factory=list, max_length=20000)


class BuildIn(BaseModel):
    as_of: str
    fetched_at: str | None = None
    sandbox: bool = False
    accounts: list[AccountIn] = Field(default_factory=list, max_length=50)
    profile: dict[str, Any] = Field(default_factory=dict)


class TwinIn(BaseModel):
    twin: dict[str, Any]
    state: dict[str, Any] = Field(default_factory=dict)
    # the member's onboarding answers (only sent with their DPDP profile consent); fills gaps, never overrides
    declared: dict[str, Any] | None = None
    # derived facts from Perfios Hub lookups (only kinds the member consented to); fills in, never invents
    hub: dict[str, Any] | None = None


class TwinSimIn(TwinIn):
    input: SimulateIn = Field(default_factory=SimulateIn)


class TwinCorrectIn(TwinIn):
    field: str
    value: Any = None


class TwinEventIn(TwinIn):
    type: Literal["checkin", "task_done", "gullak_deposit", "protection_check", "correction", "lesson", "setup"]
    ref: str | None = None
    amount: int | None = None


class TwinAskIn(TwinIn):
    question: str = Field(max_length=500)
    lang: str = "hi"


def _hh(body: TwinIn) -> dict:
    t = body.twin
    if t.get("id") != "me" or not isinstance(t.get("upcoming"), list) or "_norm" not in t:
        raise HTTPException(422, "not a twin")
    return pipeline.load_twin(t, body.state, body.declared, body.hub)


def _data_source(twin: dict) -> dict:
    return {"mode": "live", "aa": "Anumati (live sandbox)" if twin.get("sandbox") else "Anumati",
            "analytics": "DhanYukti engines (aapke bank data se)", "fetched_at": twin.get("fetched_at") or twin["as_of"]}


def _game(state: dict) -> dict:
    g = (state or {}).get("game")
    if not g:
        raise HTTPException(422, "state has no game")
    return g


def _dashboard(hh: dict, state: dict) -> dict:
    return pipeline.dashboard_for(hh, data_source=_data_source(hh), analytics=None, game_block=game.game_out_g(_game(state)))


@router.post("/build")
def build(body: BuildIn):
    payload = body.model_dump()
    for a in payload["accounts"]:
        a["transactions"] = [t for t in a["transactions"] if t["amount"] is not None]
    return e02_twin.build(payload)


@router.post("/dashboard")
def dashboard(body: TwinIn):
    return _dashboard(_hh(body), body.state)


@router.post("/simulate")
def simulate(body: TwinSimIn):
    i = body.input
    return pipeline.simulate_for(_hh(body), moves=[m.model_dump() for m in (i.moves or [])], shock_amount=i.shock_amount or 0,
                                 salary_delay_days=i.salary_delay_days or 0, cut_per_day=i.cut_per_day or 0,
                                 purchase=i.purchase.model_dump() if i.purchase else None)


@router.post("/correct")
def correct(body: TwinCorrectIn):
    try:
        pipeline.validate_twin_correction(body.twin, body.field, body.value)
    except (pipeline.CorrectionError, ValueError, TypeError):
        raise HTTPException(422, f"unsupported correction '{body.field}'. Supported: {pipeline.SUPPORTED_CORRECTIONS}")
    state = copy.deepcopy(body.state)
    state.setdefault("overlays", {})[body.field] = body.value
    hh = pipeline.load_twin(body.twin, state, body.declared, body.hub)
    return {"ok": True, "state": state, "dashboard": _dashboard(hh, state)}


@router.post("/game-event")
def game_event(body: TwinEventIn):
    hh = _hh(body)
    state = copy.deepcopy(body.state)
    g = _game(state)
    jars = state.setdefault("jars", [])
    try:
        out = game.apply_event_g(g, jars, state.setdefault("open_actions", []), "me", hh["essentials_per_day"],
                                 body.type if body.type != "setup" else "setup", body.ref, body.amount, hh["as_of"])
    except ValueError as e:
        raise HTTPException(422, str(e))
    return {"result": out, "state": state}


@router.post("/ask")
def ask(body: TwinAskIn):
    hh = _hh(body)
    db = _dashboard(hh, body.state)
    ans, tools = answer_with(db, lambda **kw: pipeline.simulate_for(pipeline.load_twin(body.twin, body.state, body.declared, body.hub), **kw), body.question)
    return {"answer": rephrase(ans), "tools_used": tools, "tag": "jaankari"}


# ----------------------------------------------------------------------------------------------
# Perfios Hub lookups (live only: a member's own records are never replayed or made up)
# ----------------------------------------------------------------------------------------------
log = logging.getLogger("dhanyukti.hub")

HUB_KINDS = ("electricity", "png", "ration", "epf_otp", "epf", "rc", "dl", "agent")
_ALNUM = re.compile(r"^[A-Za-z0-9]{2,20}$")
_TN = {"CHENNAI_NORTH", "CHENNAI_SOUTH", "COIMBATORE", "ERODE", "MADURAI", "TIRUNELVEL", "TRICHY", "VELLORE", "VILLUPURAM"}
_NEEDS_DISTRICT = {"UPPCL", "JBVNL", "MANIPUR"}


class HubIn(BaseModel):
    as_of: str
    input: dict[str, str] = Field(default_factory=dict)


def _clean(v: str | None, upper: bool = True) -> str:
    v = re.sub(r"[\s]+", "", str(v or ""))
    return v.upper() if upper else v


def _bad(field: str):
    raise HTTPException(422, f"invalid {field}")


def _hub_input(kind: str, raw: dict[str, str]) -> dict[str, str]:
    """Validate what the member typed. Nothing here is stored except masked ids in the derived facts."""
    i: dict[str, str] = {}
    if kind == "electricity":
        i["board"] = _clean(raw.get("board"))
        if not re.fullmatch(r"[A-Z_]{2,20}", i["board"]):
            _bad("board")
        c = _clean(raw.get("consumer_no"))
        if i["board"] in _TN and len(c) > 2 and c[:2].isdigit():
            c = c[2:]  # Hub docs: drop the 2-digit TN discom code
        if not _ALNUM.fullmatch(c):
            _bad("consumer_no")
        i["consumer_no"] = c
        i["district"] = re.sub(r"\s+", " ", str(raw.get("district") or "")).strip().upper()[:40]
        if i["board"] in _NEEDS_DISTRICT and not i["district"]:
            _bad("district")
        i["reg_mobile"] = _clean(raw.get("reg_mobile"))
        if i["board"] == "KERALA" and not re.fullmatch(r"[6-9]\d{9}", i["reg_mobile"]):
            _bad("reg_mobile")
    elif kind == "png":
        i["provider"] = _clean(raw.get("provider"))
        if i["provider"] not in hub_facts.PNG_PROVIDERS:
            _bad("provider")
        i["consumer_no"], i["bp_no"] = _clean(raw.get("consumer_no")), _clean(raw.get("bp_no"))
        if i["provider"] in ("AG", "GAIL", "GJ", "MG") and not _ALNUM.fullmatch(i["consumer_no"]):
            _bad("consumer_no")
        if i["provider"] in ("IG", "MG") and not _ALNUM.fullmatch(i["bp_no"]):
            _bad("bp_no")
    elif kind == "ration":
        i["card_no"] = _clean(raw.get("card_no"))
        if not re.fullmatch(r"[A-Z0-9]{4,20}", i["card_no"]):
            _bad("card_no")
    elif kind == "epf_otp":
        i["uan"], i["mobile"] = _clean(raw.get("uan")), _clean(raw.get("mobile"))
        if not (re.fullmatch(r"\d{12}", i["uan"]) or re.fullmatch(r"[6-9]\d{9}", i["mobile"])):
            _bad("uan")
        if i["uan"] and not re.fullmatch(r"\d{12}", i["uan"]):
            _bad("uan")
    elif kind == "epf":
        i["otp"], i["request_id"], i["uan"] = _clean(raw.get("otp")), _clean(raw.get("request_id"), upper=False), _clean(raw.get("uan"))
        if not re.fullmatch(r"\d{6}", i["otp"]):
            _bad("otp")
        if not re.fullmatch(r"[A-Za-z0-9-]{8,64}", i["request_id"]):
            _bad("request_id")
    elif kind == "rc":
        i["reg_no"] = re.sub(r"[^A-Z0-9]", "", _clean(raw.get("reg_no")))
        if not re.fullmatch(r"[A-Z0-9]{6,12}", i["reg_no"]):
            _bad("reg_no")
    elif kind == "dl":
        i["dl_no"] = re.sub(r"[^A-Z0-9]", "", _clean(raw.get("dl_no")))
        if not re.fullmatch(r"[A-Z0-9]{10,20}", i["dl_no"]):
            _bad("dl_no")
        dob = str(raw.get("dob") or "").strip()
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
            try:
                i["dob"] = datetime.strptime(dob, fmt).strftime("%d-%m-%Y")
                break
            except ValueError:
                pass
        else:
            _bad("dob")
    elif kind == "agent":
        i["pan"] = _clean(raw.get("pan"))
        if not re.fullmatch(r"[A-Z]{5}\d{4}[A-Z]", i["pan"]):
            _bad("pan")
    return i


@router.post("/hub/{kind}")
def hub_lookup(kind: str, body: HubIn):
    """One lookup the member asked for (the Next.js server checks their DPDP consent first).
    Returns derived facts only; the raw answer is dropped here. Never falls back to demo data."""
    if kind not in HUB_KINDS:
        raise HTTPException(404, "unknown lookup")
    try:
        as_of = e02_twin.d(body.as_of).isoformat()
    except (ValueError, TypeError):
        raise HTTPException(422, "invalid as_of")
    inp = _hub_input(kind, body.input)
    if settings.hub_mode != "live":
        return {"ok": False, "code": "hub_not_configured"}
    c = connectors.hub()
    try:
        if kind == "electricity":
            r = c.electricity(inp["consumer_no"], inp["board"], inp["district"], inp["reg_mobile"])
            return {"ok": True, "facts": {"electricity": hub_facts.derive("electricity", r["result"], as_of=as_of, entered=inp)}}
        if kind == "png":
            r = c.png(inp["provider"], inp["consumer_no"], inp["bp_no"])
            return {"ok": True, "facts": {"png": hub_facts.derive("png", r["result"], as_of=as_of, entered=inp)}}
        if kind == "ration":
            r = c.ration(inp["card_no"])
            return {"ok": True, "facts": {"ration": hub_facts.derive("ration", r["result"], as_of=as_of, entered=inp)}}
        if kind == "epf_otp":
            r = c.epf_otp(inp["uan"], inp["mobile"])
            if not r.get("request_id"):
                return {"ok": False, "code": "lookup_failed"}
            return {"ok": True, "otp_sent": True, "request_id": r["request_id"]}
        if kind == "epf":
            r = c.epf_passbook(inp["request_id"], inp["otp"])
            return {"ok": True, "facts": {"epf": hub_facts.derive("epf", r["result"], as_of=as_of, entered=inp)}}
        if kind == "rc":
            r = c.rc(inp["reg_no"])
            facts = {"rc": hub_facts.derive("rc", r["result"], as_of=as_of, entered=inp)}
            try:  # e-challans on the same vehicle: same consent ("vehicle"), best effort
                ch = c.challan(inp["reg_no"])
                facts["challan"] = hub_facts.derive("challan", ch["result"], as_of=as_of, entered=inp)
            except HubLookupError as e:
                if e.code == "not_found":
                    facts["challan"] = hub_facts.derive("challan", [], as_of=as_of, entered=inp)
            except SponsorError:
                pass
            return {"ok": True, "facts": facts}
        if kind == "dl":
            r = c.dl(inp["dl_no"], inp["dob"])
            return {"ok": True, "facts": {"dl": hub_facts.derive("dl", r["result"], as_of=as_of, entered=inp)}}
        r = c.agent(inp["pan"])
        return {"ok": True, "agent": hub_facts.agent_view(r["result"])}
    except HubLookupError as e:
        log.info("hub %s -> %s (status=%s req=%s)", kind, e.code, e.status, e.request_id)
        return {"ok": False, "code": e.code}
    except SponsorError as e:
        log.warning("hub %s unavailable status=%s req=%s", kind, e.status_code, e.request_id)
        code = {401: "hub_auth", 403: "hub_auth", 402: "hub_credits", 429: "hub_busy"}.get(e.status_code or 0, "hub_unavailable")
        # setup problems carry Perfios' own reason and the username in use (never the password)
        out = {"ok": False, "code": code, "upstream_status": e.status_code, "upstream_reason": e.reason}
        if code == "hub_auth":
            out["secure_id"] = settings.perfios.get("PERFIOS_SECURE_ID")
        return out
