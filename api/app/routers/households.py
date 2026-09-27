from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app import pipeline, store

router = APIRouter(prefix="/api/households", tags=["households"])


class Move(BaseModel):
    event_id: str
    new_date: str


class SimulateIn(BaseModel):
    moves: list[Move] | None = None
    shock_amount: int | None = Field(default=None, ge=0)
    salary_delay_days: int | None = Field(default=None, ge=0, le=60)
    cut_per_day: int | None = Field(default=None, ge=0)


class CorrectIn(BaseModel):
    field: str
    value: Any


def _hid(hid: str) -> str:
    h = hid.upper()
    if h not in ("A", "B", "C"):
        raise HTTPException(404, f"unknown household {hid}")
    return h


@router.get("")
def list_households():
    return pipeline.household_list()


@router.get("/{hid}/dashboard")
def get_dashboard(hid: str):
    return pipeline.dashboard(_hid(hid))


@router.post("/{hid}/simulate")
def simulate(hid: str, body: SimulateIn):
    return pipeline.simulate(_hid(hid), moves=[m.model_dump() for m in (body.moves or [])],
                             shock_amount=body.shock_amount or 0, salary_delay_days=body.salary_delay_days or 0,
                             cut_per_day=body.cut_per_day or 0)


@router.post("/{hid}/correct")
def correct(hid: str, body: CorrectIn):
    h = _hid(hid)
    try:
        pipeline.validate_correction(h, body.field, body.value)
    except (pipeline.CorrectionError, ValueError, TypeError):
        raise HTTPException(422, f"unsupported correction '{body.field}'. Supported: {pipeline.SUPPORTED_CORRECTIONS}")
    with store.lock():
        store.STATE["overlays"][h][body.field] = body.value
    return {"ok": True, "dashboard": pipeline.dashboard(h)}
