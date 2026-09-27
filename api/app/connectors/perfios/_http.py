"""Shared Perfios HTTP plumbing (secure-id / secure-credential / org-id headers)."""
from __future__ import annotations

import logging
import uuid

import httpx

from app.connectors.base import SponsorError

log = logging.getLogger("dhanyukti.perfios")

SECURE_ID_HEADER = "x-secure-id"                # TODO(confirm with sandbox docs)
SECURE_CREDENTIAL_HEADER = "x-secure-cred"      # TODO(confirm with sandbox docs)
ORG_ID_HEADER = "x-organization-id"             # TODO(confirm with sandbox docs)


class PerfiosHTTP:
    def __init__(self, cfg: dict, timeout: float = 20.0):
        self.base = cfg["PERFIOS_BASE_URL"].rstrip("/")
        self._sid = cfg["PERFIOS_SECURE_ID"]
        self._cred = cfg["PERFIOS_SECURE_CREDENTIAL"]
        self._org = cfg["PERFIOS_ORG_ID"]
        self.timeout = timeout

    def _headers(self, req_id: str, json_body: bool = True) -> dict:
        h = {SECURE_ID_HEADER: self._sid, SECURE_CREDENTIAL_HEADER: self._cred, ORG_ID_HEADER: self._org,
             "x-request-id": req_id}
        if json_body:
            h["Content-Type"] = "application/json"
        return h

    def request(self, method: str, path: str, *, json: dict | None = None, files: dict | None = None,
                data: dict | None = None) -> dict:
        req_id = str(uuid.uuid4())
        try:
            with httpx.Client(base_url=self.base, timeout=self.timeout) as c:
                r = c.request(method, path, json=json, files=files, data=data,
                              headers=self._headers(req_id, json_body=files is None))
        except httpx.HTTPError as e:
            log.warning("perfios %s %s req=%s network_error=%s", method, path, req_id, type(e).__name__)
            raise SponsorError("perfios network error", None, req_id, "perfios") from None
        log.info("perfios %s %s req=%s status=%s", method, path, req_id, r.status_code)
        if r.status_code >= 400:
            raise SponsorError("perfios http error", r.status_code, req_id, "perfios")
        try:
            return r.json()
        except ValueError:
            raise SponsorError("perfios bad json", r.status_code, req_id, "perfios") from None
