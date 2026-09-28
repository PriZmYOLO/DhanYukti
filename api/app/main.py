"""DhanYukti API — FastAPI entrypoint."""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import store
from app.routers import ask, consent, enrich, game, households, meta, twin

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logging.getLogger("httpx").setLevel(logging.WARNING)  # our connectors log only request ids + status codes

class DemoVisitorMiddleware:
    """Gives each visitor (X-DY-Demo header, a random id the browser keeps) their own demo households."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        vid = next((v.decode("latin-1") for k, v in scope.get("headers", []) if k == b"x-dy-demo"), None)
        token = store.use_visitor(vid)
        try:
            await self.app(scope, receive, send)
        finally:
            store.done_visitor(token)


app = FastAPI(title="DhanYukti API", version="1.0.0")
app.add_middleware(DemoVisitorMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
for r in (meta.router, households.router, consent.router, game.router, ask.router, enrich.router, twin.router):
    app.include_router(r)
