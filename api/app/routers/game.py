from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.game import service

router = APIRouter(prefix="/api/game", tags=["game"])


class EventIn(BaseModel):
    type: Literal["checkin", "task_done", "gullak_deposit", "protection_check", "correction", "lesson"]
    ref: str | None = None
    amount: int | None = None


@router.post("/{hid}/event")
def event(hid: str, body: EventIn):
    h = hid.upper()
    if h not in ("A", "B", "C"):
        raise HTTPException(404, f"unknown household {hid}")
    return service.apply_event(h, body.type, body.ref, body.amount)
