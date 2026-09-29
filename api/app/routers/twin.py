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
"""
from __future__ import annotations

import copy
import hmac
import os
from typing import Any, Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app import pipeline
from app.engines import e02_twin
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
    return pipeline.load_twin(t, body.state, body.declared)


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
    hh = pipeline.load_twin(body.twin, state, body.declared)
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
    ans, tools = answer_with(db, lambda **kw: pipeline.simulate_for(pipeline.load_twin(body.twin, body.state, body.declared), **kw), body.question)
    return {"answer": rephrase(ans), "tools_used": tools, "tag": "jaankari"}
