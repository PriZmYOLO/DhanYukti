from __future__ import annotations

import hmac
import os

from fastapi import APIRouter, Header, HTTPException

from app import store
from app.config import PERFIOS_HUB_VARS, settings

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/health")
def health():
    # Setup check without secrets: which Hub variables are missing (names only), and which
    # PERFIOS_*/TWIN_* names this process actually received (catches typos and stray spaces in names).
    missing = [k for k in PERFIOS_HUB_VARS if not settings.perfios.get(k)]
    seen = sorted(k for k in os.environ if "PERFIOS" in k.upper() or "TWIN" in k.upper())
    return {"ok": True, "mode": {"anumati": settings.anumati_mode, "perfios": settings.perfios_mode, "perfios_hub": settings.hub_mode},
            "setup": {"perfios_hub_missing": missing, "env_names": seen}}


@router.get("/capabilities")
def capabilities():
    from app.routers.enrich import capability_rows

    return capability_rows()


@router.post("/admin/reset")
def reset(x_admin_token: str | None = Header(default=None)):
    """Team-only demo helper (not in contract): drop every visitor's demo copy and reseed the shared one.

    Needs X-Admin-Token equal to ADMIN_RESET_TOKEN. With the env unset, or a wrong
    or missing header, it refuses (403). The browser never calls this; the team
    uses web/scripts/reset-demo.sh with the token from their own shell.
    """
    expected = (os.getenv("ADMIN_RESET_TOKEN") or "").strip()
    if not expected or not x_admin_token or not hmac.compare_digest(x_admin_token.encode(), expected.encode()):
        raise HTTPException(403, "admin reset is not allowed")
    store.reset_all()
    return {"ok": True}


@router.post("/demo/forget")
def forget_demo():
    """This visitor's own demo copy (their corrections, deposits, points) is dropped; the next visit reseeds it.
    Acts only on the caller's X-DY-Demo id; never on anyone else's copy or the shared one."""
    return {"ok": True, "forgotten": store.forget_current_visitor()}
