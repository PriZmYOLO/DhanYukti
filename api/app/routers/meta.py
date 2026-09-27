from __future__ import annotations

from fastapi import APIRouter

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
def reset():
    """Demo helper (not in contract): reset all in-memory state."""
    store.reset()
    return {"ok": True}
