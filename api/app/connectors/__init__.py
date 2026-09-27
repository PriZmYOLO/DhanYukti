"""Connector factory: live when config has every credential for that sponsor, else replay.

`with_fallback` runs a live call and, on any failure (SponsorError, or NotImplementedError from
the unfinished crypto / signature hooks), transparently re-runs it on the replay connector and
reports mode="replay" so the demo can tell judges it is a replay.
"""
from __future__ import annotations

import logging

from app.config import settings
from app.connectors.anumati.client import AnumatiClient
from app.connectors.anumati.replay import AnumatiReplay
from app.connectors.base import SponsorError
from app.connectors.perfios.analytics import PerfiosAnalyticsClient
from app.connectors.perfios.bsa import PerfiosBSAClient
from app.connectors.perfios.hub import PerfiosHubClient
from app.connectors.perfios.replay import PerfiosAnalyticsReplay, PerfiosBSAReplay, PerfiosHubReplay

log = logging.getLogger("dhanyukti.connectors")

_replay_aa = AnumatiReplay()
_replay_analytics = PerfiosAnalyticsReplay()
_replay_bsa = PerfiosBSAReplay()
_replay_hub = PerfiosHubReplay()


def aa(mode: str | None = None):
    mode = mode or settings.anumati_mode
    return AnumatiClient(settings.anumati) if mode == "live" else _replay_aa


def replay_aa() -> AnumatiReplay:
    return _replay_aa


def analytics():
    return PerfiosAnalyticsClient(settings.perfios) if settings.perfios_mode == "live" else _replay_analytics


def replay_analytics() -> PerfiosAnalyticsReplay:
    return _replay_analytics


def bsa():
    return PerfiosBSAClient(settings.perfios) if settings.perfios_mode == "live" else _replay_bsa


def replay_bsa() -> PerfiosBSAReplay:
    return _replay_bsa


def hub():
    return PerfiosHubClient(settings.perfios) if settings.perfios_mode == "live" else _replay_hub


def replay_hub() -> PerfiosHubReplay:
    return _replay_hub


def with_fallback(live_conn, replay_conn, method: str, *args, **kwargs) -> tuple[dict, str]:
    """-> (result, mode). Never lets a live failure break the demo."""
    if getattr(live_conn, "mode", "replay") == "live":
        try:
            return getattr(live_conn, method)(*args, **kwargs), "live"
        except SponsorError as e:
            log.warning("live %s failed sponsor=%s status=%s req=%s -> replay", method, e.sponsor, e.status_code,
                        e.request_id)
        except NotImplementedError:
            log.warning("live %s hook not implemented -> replay", method)
        except Exception as e:  # noqa: BLE001 — demo must never crash on a sponsor outage
            log.warning("live %s unexpected %s -> replay", method, type(e).__name__)
    return getattr(replay_conn, method)(*args, **kwargs), "replay"


def run_with_fallback(live_fn, replay_fn) -> tuple[dict, str]:
    """Multi-step variant of with_fallback: live_fn/replay_fn are zero-arg callables."""
    if live_fn is not None:
        try:
            return live_fn(), "live"
        except SponsorError as e:
            log.warning("live flow failed sponsor=%s status=%s req=%s -> replay", e.sponsor, e.status_code, e.request_id)
        except NotImplementedError:
            log.warning("live flow hook not implemented -> replay")
        except Exception as e:  # noqa: BLE001
            log.warning("live flow unexpected %s -> replay", type(e).__name__)
    return replay_fn(), "replay"
