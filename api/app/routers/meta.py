from __future__ import annotations

import hmac
import os

from fastapi import APIRouter, Header, HTTPException

from app import store
from app.config import settings

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/health")
def health():
    return {"ok": True, "mode": {"anumati": settings.anumati_mode, "perfios": settings.perfios_mode}}


@router.get("/capabilities")
def capabilities():
    from app.routers.enrich import capability_rows

    return capability_rows()


@router.post("/admin/reset")
def reset(x_admin_token: str | None = Header(default=None)):
    """Team-only demo helper (not in contract): reset all in-memory state for everyone.

    Needs X-Admin-Token equal to ADMIN_RESET_TOKEN. With the env unset, or a wrong
    or missing header, it refuses (403). The browser never calls this; the team
    uses web/scripts/reset-demo.sh with the token from their own shell.
    """
    expected = (os.getenv("ADMIN_RESET_TOKEN") or "").strip()
    if not expected or not x_admin_token or not hmac.compare_digest(x_admin_token.encode(), expected.encode()):
        raise HTTPException(403, "admin reset is not allowed")
    store.reset()
    return {"ok": True}
