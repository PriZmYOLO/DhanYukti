"""Live Anumati AA client (ReBIT AA spec, via the Perfios FIU gateway).

Finish-me checklist once sandbox credentials arrive:
  1. Confirm every path / header constant below against the sandbox docs.
  2. Implement `build_key_material()` + `decrypt_fi_payload()` + `verify_jws()` using the provider's
     documented library (ReBIT: Curve25519 ECDH + AES-GCM; detached JWS for notifications).
     We deliberately do NOT hand-roll crypto.
  3. Map the provider's consent-status names onto PENDING/ACTIVE/REJECTED/REVOKED/EXPIRED.
Logging rule: log only request ids + status codes. Never payloads, OTPs, mobiles or keys.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

import os

import httpx

from app.connectors.base import AAConnector, SponsorError

log = logging.getLogger("dhanyukti.anumati")

# --- Routes (ReBIT FIU-side) --------------------------------------------------------------
# ReBIT v2.0.0 turned the v1.1 GET-by-path lookups into POSTs with a JSON body, and revoke is
# an FIU -> AA POST /Consent/Notification. Pick the style Anumati's sandbox runs via
# ANUMATI_SPEC_VERSION ("2.0.0" default, or "1.1.3"). See docs/SponsorAPIs.md.
REBIT_VERSION = os.environ.get("ANUMATI_SPEC_VERSION", "2.0.0")  # TODO(confirm with sandbox docs)
V2 = REBIT_VERSION.startswith("2")
TOKEN_PATH = "/oauth/token"                              # TODO(confirm with sandbox docs)
CONSENT_CREATE_PATH = "/Consent"
if V2:
    CONSENT_STATUS_PATH = "/Consent/handle"               # POST {ConsentHandle}
    CONSENT_ARTEFACT_PATH = "/Consent/fetch"              # POST {ConsentId}
    FI_FETCH_PATH = "/FI/fetch"                           # POST {sessionId}
    CONSENT_REVOKE_PATH = "/Consent/Notification"         # POST ConsentStatusNotification REVOKED
else:
    CONSENT_STATUS_PATH = "/Consent/handle/{handle}"      # GET
    CONSENT_ARTEFACT_PATH = "/Consent/{consent_id}"       # GET
    FI_FETCH_PATH = "/FI/fetch/{session_id}"              # GET
    CONSENT_REVOKE_PATH = "/Consent/Notification"         # TODO(confirm FIU-side revoke on v1.1)
FI_REQUEST_PATH = "/FI/request"
CLIENT_ID_HEADER = "client_id"                           # TODO(confirm with sandbox docs)
CLIENT_SECRET_HEADER = "client_secret"                   # TODO(confirm with sandbox docs)
SIGNATURE_HEADER = "x-jws-signature"                     # TODO(confirm with sandbox docs)

FI_TYPES = ["DEPOSIT", "RECURRING_DEPOSIT", "INSURANCE_POLICIES"]
PURPOSE = {"code": "102", "refUri": "https://api.rebit.org.in/aa/purpose/102.xml",
           "text": "Personal finance management", "Category": {"type": "string"}}

STATUS_MAP = {"PENDING": "PENDING", "REQUESTED": "PENDING", "READY": "ACTIVE", "ACTIVE": "ACTIVE",
              "APPROVED": "ACTIVE", "REJECTED": "REJECTED", "REVOKED": "REVOKED", "EXPIRED": "EXPIRED",
              "PAUSED": "PENDING", "FAILED": "REJECTED"}


def _ts(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def build_consent_detail(fiu_id: str, mobile: str, now: datetime | None = None) -> dict:
    """Purpose 'Personal finance management'; DEPOSIT/RD/INSURANCE; last 6 months; PERIODIC monthly;
    expiry 90 days; consentMode STORE; fetchType PERIODIC; dataLife 1 DAY."""
    now = now or datetime.now(timezone.utc)
    return {
        "consentStart": _ts(now),
        "consentExpiry": _ts(now + timedelta(days=90)),
        "consentMode": "STORE",
        "fetchType": "PERIODIC",
        "consentTypes": ["PROFILE", "SUMMARY", "TRANSACTIONS"],
        "fiTypes": FI_TYPES,
        "DataConsumer": {"id": fiu_id, "type": "FIU"},
        "Customer": {"id": f"{mobile}@anumati",  # TODO(confirm AA handle suffix with sandbox docs)
                     "Identifiers": [{"type": "MOBILE", "value": mobile}]},
        "Purpose": PURPOSE,
        "FIDataRange": {"from": _ts(now - timedelta(days=183)), "to": _ts(now)},
        "DataLife": {"unit": "DAY", "value": 1},
        "Frequency": {"unit": "MONTH", "value": 1},
    }


def build_key_material() -> dict:
    """ReBIT KeyMaterial (ECDH public key + nonce) for the FI request."""
    raise NotImplementedError(
        "Generate KeyMaterial with the provider's documented crypto library (ReBIT: Curve25519 ECDH). "
        "Do not hand-roll crypto.")


def decrypt_fi_payload(encrypted_fi: dict, key_material: dict) -> dict:
    """Decrypt a ReBIT FI payload into the plain `account` JSON."""
    raise NotImplementedError(
        "Live FI decryption is not implemented on purpose. Use the provider's documented decryption "
        "library (ReBIT: ECDH shared secret + AES-256-GCM) and return the decrypted `account` object.")


def verify_jws(signature: str, body: bytes) -> bool:
    """Verify the detached JWS on an AA notification against the AA's published public key."""
    raise NotImplementedError(
        "Verify the notification's detached JWS with the provider's documented library and the AA's "
        "public key (JWKS). Do not hand-roll signature verification.")


class AnumatiClient(AAConnector):
    mode = "live"

    def __init__(self, cfg: dict, timeout: float = 15.0):
        self.base = cfg["ANUMATI_BASE_URL"].rstrip("/")
        self.client_id = cfg["ANUMATI_CLIENT_ID"]
        self._secret = cfg["ANUMATI_CLIENT_SECRET"]
        self.fiu_id = cfg["ANUMATI_FIU_ID"]
        self.callback_url = cfg["ANUMATI_CALLBACK_URL"]
        self.redirect_url = cfg["ANUMATI_REDIRECT_URL"]
        self.timeout = timeout
        self._token: str | None = None
        self._consent_ids: dict[str, str] = {}
        self._key_material: dict[str, dict] = {}

    # -- plumbing -------------------------------------------------------------------------
    def _headers(self) -> dict:
        h = {"Content-Type": "application/json", CLIENT_ID_HEADER: self.client_id, CLIENT_SECRET_HEADER: self._secret}
        if self._token:
            h["Authorization"] = f"Bearer {self._token}"
        return h

    def _call(self, method: str, path: str, json: dict | None = None) -> dict:
        req_id = str(uuid.uuid4())
        route = path.split("?")[0]
        try:
            with httpx.Client(base_url=self.base, timeout=self.timeout) as c:
                r = c.request(method, path, json=json, headers={**self._headers(), "x-request-id": req_id})
        except httpx.HTTPError as e:
            log.warning("anumati %s %s req=%s network_error=%s", method, route, req_id, type(e).__name__)
            raise SponsorError("anumati network error", None, req_id, "anumati") from None
        log.info("anumati %s %s req=%s status=%s", method, route, req_id, r.status_code)
        if r.status_code >= 400:
            raise SponsorError("anumati http error", r.status_code, req_id, "anumati")
        try:
            return r.json()
        except ValueError:
            raise SponsorError("anumati bad json", r.status_code, req_id, "anumati") from None

    def _envelope(self, body: dict) -> dict:
        return {"ver": REBIT_VERSION, "timestamp": _ts(datetime.now(timezone.utc)), "txnid": str(uuid.uuid4()), **body}

    # -- AAConnector ----------------------------------------------------------------------
    def create_consent(self, household_id: str, member_id: str, mobile: str) -> dict:
        body = self._envelope({"ConsentDetail": build_consent_detail(self.fiu_id, mobile),
                               "redirectUrl": self.redirect_url, "callbackUrl": self.callback_url})
        res = self._call("POST", CONSENT_CREATE_PATH, body)
        handle = res.get("ConsentHandle") or res.get("consentHandle")
        if not handle:
            raise SponsorError("anumati: no consent handle in response", sponsor="anumati")
        # TODO(confirm with sandbox docs): field carrying the AA web-journey URL
        redirect = res.get("redirectUrl") or res.get("url") or self.redirect_url
        return {"consent_handle": handle, "redirect_url": redirect, "status": "PENDING"}

    def consent_status(self, handle: str) -> dict:
        res = (self._call("POST", CONSENT_STATUS_PATH, self._envelope({"ConsentHandle": handle})) if V2
               else self._call("GET", CONSENT_STATUS_PATH.format(handle=handle)))
        st = res.get("ConsentStatus") or res
        raw = (st.get("status") or "PENDING").upper()
        if st.get("id"):
            self._consent_ids[handle] = st["id"]
        return {"status": STATUS_MAP.get(raw, "PENDING"), "consent_id": st.get("id")}

    def consent_artefact(self, consent_id: str) -> dict:
        res = (self._call("POST", CONSENT_ARTEFACT_PATH, self._envelope({"ConsentId": consent_id})) if V2
               else self._call("GET", CONSENT_ARTEFACT_PATH.format(consent_id=consent_id)))
        cd = res.get("ConsentDetail") or {}
        return {"consent_id": res.get("consentId", consent_id), "status": STATUS_MAP.get((res.get("status") or "").upper(), "PENDING"),
                "fi_types": cd.get("fiTypes", []), "fetch_type": cd.get("fetchType"), "data_life": cd.get("DataLife"),
                "frequency": cd.get("Frequency"), "fi_range": cd.get("FIDataRange"),
                "signed": bool(res.get("signedConsent"))}

    def fi_request(self, consent_id: str, household_id: str) -> dict:
        key_material = build_key_material()  # raises NotImplementedError until finished
        now = datetime.now(timezone.utc)
        req = self._envelope({"FIDataRange": {"from": _ts(now - timedelta(days=183)), "to": _ts(now)},
                              "Consent": {"id": consent_id, "digitalSignature": ""},  # TODO(confirm)
                              "KeyMaterial": key_material})
        session = self._call("POST", FI_REQUEST_PATH, req).get("sessionId")
        if not session:
            raise SponsorError("anumati: no sessionId", sponsor="anumati")
        self._key_material[session] = key_material
        return {"session_id": session}

    def fi_fetch(self, session_id: str, household_id: str) -> dict:
        enc = (self._call("POST", FI_FETCH_PATH, self._envelope({"sessionId": session_id})) if V2
               else self._call("GET", FI_FETCH_PATH.format(session_id=session_id)))
        km = self._key_material.pop(session_id, {})
        fi = [decrypt_fi_payload(item, km) for fip in enc.get("FI", []) for item in fip.get("data", [])]
        txns = sum(len(a.get("account", a).get("transactions", {}).get("transaction", [])) for a in fi)
        return {"accounts": len(fi), "transactions": txns, "fi": fi}

    def revoke(self, handle: str) -> dict:
        consent_id = self._consent_ids.get(handle) or handle
        # ReBIT: FIU notifies the AA that the consent is revoked (confirm Anumati allows FIU-side revoke).
        self._call("POST", CONSENT_REVOKE_PATH, self._envelope({
            "Notifier": {"type": "FIU", "id": self.fiu_id},
            "ConsentStatusNotification": {"consentId": consent_id, "consentHandle": handle, "consentStatus": "REVOKED"}}))
        return {"status": "REVOKED"}

    def verify_callback(self, headers: dict, body: bytes) -> bool:
        sig = {k.lower(): v for k, v in headers.items()}.get(SIGNATURE_HEADER)
        if not sig:
            return False
        return verify_jws(sig, body)
