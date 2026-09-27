"""Environment config. A sponsor runs in "live" mode only when *all* of its creds are present."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except Exception:  # pragma: no cover - dotenv is optional at runtime
    pass

ANUMATI_VARS = [
    "ANUMATI_BASE_URL",
    "ANUMATI_CLIENT_ID",
    "ANUMATI_CLIENT_SECRET",
    "ANUMATI_FIU_ID",
    "ANUMATI_CALLBACK_URL",
    "ANUMATI_REDIRECT_URL",
]
PERFIOS_VARS = ["PERFIOS_BASE_URL", "PERFIOS_SECURE_ID", "PERFIOS_SECURE_CREDENTIAL", "PERFIOS_ORG_ID"]


def _env(name: str) -> str:
    return (os.getenv(name) or "").strip()


@dataclass(frozen=True)
class Settings:
    anumati: dict
    perfios: dict
    anthropic_api_key: str
    anthropic_model: str

    @property
    def anumati_mode(self) -> str:
        return "live" if all(self.anumati.values()) else "replay"

    @property
    def perfios_mode(self) -> str:
        return "live" if all(self.perfios.values()) else "replay"

    @property
    def llm_enabled(self) -> bool:
        return bool(self.anthropic_api_key)


def load_settings() -> Settings:
    return Settings(
        anumati={k: _env(k) for k in ANUMATI_VARS},
        perfios={k: _env(k) for k in PERFIOS_VARS},
        anthropic_api_key=_env("ANTHROPIC_API_KEY"),
        anthropic_model=_env("ANTHROPIC_MODEL") or "claude-sonnet-5",
    )


settings = load_settings()
