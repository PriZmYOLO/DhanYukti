"""Shared Perfios HTTP plumbing (secure-id / secure-credential / org-id headers)."""
from __future__ import annotations

import logging
import uuid

import httpx

from app.connectors.base import SponsorError

log = logging.getLogger("dhanyukti.perfios")

SECURE_ID_HEADER = "x-secure-id"                # Hub docs: portal username
SECURE_CREDENTIAL_HEADER = "x-secure-cred"      # Hub docs: portal password
ORG_ID_HEADER = "x-organization-id"             # Hub docs: client id (header names are case-insensitive)


class PerfiosHTTP:
    def __init__(self, cfg: dict, timeout: float = 20.0):
        self.base = cfg["PERFIOS_BASE_URL"].rstrip("/")
        self._sid = cfg["PERFIOS_SECURE_ID"]
        self._cred = cfg["PERFIOS_SECURE_CREDENTIAL"]
        self._org = cfg["PERFIOS_ORG_ID"]
        self.timeout = timeout

    def _headers(self, req_id: str, json_body: bool = True) -> dict:
        h = {SECURE_ID_HEADER: self._sid, SECURE_CREDENTIAL_HEADER: self._cred, ORG_ID_HEADER: self._org,
             "X-Customer-Reference-ID": req_id}
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
            err = SponsorError("perfios http error", r.status_code, req_id, "perfios")
            err.reason = _reason(r)
            log.warning("perfios %s %s req=%s status=%s reason=%s", method, path, req_id, r.status_code, err.reason)
            raise err
        try:
            return r.json()
        except ValueError:
            raise SponsorError("perfios bad json", r.status_code, req_id, "perfios") from None


def _reason(r: httpx.Response) -> str | None:
    """Perfios' own error text for a failed call (e.g. "Invalid credentials"), short, for setup checks."""
    try:
        body = r.json()
    except ValueError:
        return (r.text or "").strip()[:160] or None
    if isinstance(body, dict):
        errs = body.get("errors")
        if isinstance(errs, list) and errs and isinstance(errs[0], dict):
            return str(errs[0].get("errorMessage") or errs[0])[:160]
        for k in ("message", "error", "errorMessage", "detail", "status-message"):
            if body.get(k):
                return str(body[k])[:160]
    return str(body)[:160]
