"""Live Perfios Hub (KYC Authentication APIs), as documented on hub.perfios.ai (sandbox, Sept 2026).

Base URL (test): https://hub-test.perfios.ai/ssp/kyc/api   (live: https://hub.perfios.ai/ssp/kyc/api)
Headers: x-secure-id (portal username), x-secure-cred (portal password), x-organization-ID (client id).
Every request carries consent "Y": the caller (routers) only gets here after the member's own DPDP
consent for that lookup. Responses carry an internal status code ("status-code" or "statusCode"):
101 = found; 102 invalid input; 103 no record; 104 max retries; 105 missing consent; 106 multiple.

This client returns the raw `result` only. It never logs payloads: app/engines/hub_facts.py turns a
result into the few derived facts DhanYukti keeps (no names, addresses, phone numbers or photos).
"""
from __future__ import annotations

from app.connectors.base import HubConnector, SponsorError
from app.connectors.perfios._http import PerfiosHTTP

DEFAULT_HUB_BASE_URL = "https://hub-test.perfios.ai/ssp/kyc/api"

PATHS = {
    "electricity": "/v2/elec",
    "png": "/v2/png",
    "lpg": "/v2/lpg",
    "ration": "/v3/ration-details",
    "epf_otp": "/v2/epf-get-otp",
    "epf_passbook": "/v2/epf-get-passbook",
    "rc": "/v3/rc-advanced",
    "challan": "/v3/rc-challan",
    "dl": "/v3/dl",
    "agent": "/v3/irda-verification",
}

FOUND = 101
# internal status code -> short code the app can explain
STATUS = {102: "invalid_input", 103: "not_found", 104: "max_retries", 105: "consent_missing",
          106: "multiple_records", 107: "not_supported", 108: "source_unavailable", 109: "too_many_records"}


class HubLookupError(Exception):
    """The source answered, but not with a record (wrong number, no record, OTP expired...)."""

    def __init__(self, code: str, status: int | None = None, request_id: str | None = None,
                 reason: str | None = None):
        super().__init__(code)
        self.code = code
        self.status = status
        self.request_id = request_id
        self.reason = reason   # Perfios' own short error text, when it sent one


def _status(body: dict) -> int | None:
    s = body.get("status-code", body.get("statusCode"))
    try:
        return int(s)
    except (TypeError, ValueError):
        return None


class PerfiosHubClient(PerfiosHTTP, HubConnector):
    mode = "live"

    def __init__(self, cfg: dict, timeout: float = 35.0):
        super().__init__({**cfg, "PERFIOS_BASE_URL": cfg.get("PERFIOS_HUB_BASE_URL") or DEFAULT_HUB_BASE_URL},
                         timeout=timeout)

    def _call(self, kind: str, body: dict) -> dict:
        try:
            out = self.request("POST", PATHS[kind], json={**body, "consent": "Y"})
        except SponsorError as e:
            if e.status_code in (400, 404):
                raise HubLookupError("invalid_input", e.status_code, e.request_id, e.reason) from None
            if e.status_code in (503, 504):
                raise HubLookupError("source_unavailable", e.status_code, e.request_id, e.reason) from None
            raise
        st = _status(out)
        rid = out.get("request_id") or out.get("requestId")
        if st != FOUND:
            msg = out.get("message") or out.get("error") or out.get("status-message")
            raise HubLookupError(STATUS.get(st or 0, "lookup_failed"), st, rid, str(msg)[:160] if msg else None)
        return {"request_id": rid, "result": out.get("result")}

    # --- utility bills -------------------------------------------------------------------------
    def electricity(self, consumer_no: str, board: str, district: str = "", reg_mobile: str = "") -> dict:
        body = {"consumer_id": consumer_no, "service_provider": board}
        if district:
            body["district"] = district
        if reg_mobile:
            body["regMobileNo"] = reg_mobile
        return self._call("electricity", body)

    def png(self, provider: str, consumer_no: str = "", bp_no: str = "") -> dict:
        return self._call("png", {"service_provider": provider, "consumer_id": consumer_no, "bp_no": bp_no})

    # --- schemes -------------------------------------------------------------------------------
    def ration(self, card_no: str, state: str = "") -> dict:
        return self._call("ration", {"rationCardNumber": card_no, "aadhaarNumber": ""})

    # --- EPF (two steps: an OTP to the member's EPFO-registered mobile, then the passbook) -------
    def epf_otp(self, uan: str = "", mobile: str = "") -> dict:
        body = {}
        if uan:
            body["uan"] = uan
        if mobile:
            body["mobile_no"] = mobile
        return self._call("epf_otp", body)

    def epf_passbook(self, request_id: str, otp: str) -> dict:
        return self._call("epf_passbook", {"request_id": request_id, "otp": otp, "is_pdf_required": "n",
                                            "partial_data": "n", "epf_balance": "y"})

    def epf(self, uan: str) -> dict:  # HubConnector: the passbook needs an OTP; start the flow
        return self.epf_otp(uan=uan)

    # --- vehicle & driving -----------------------------------------------------------------------
    def rc(self, reg_no: str) -> dict:
        return self._call("rc", {"registrationNumber": reg_no, "version": 3.1})

    def challan(self, reg_no: str) -> dict:
        return self._call("challan", {"vehicleNo": reg_no})

    def dl(self, dl_no: str, dob: str) -> dict:
        return self._call("dl", {"dlNo": dl_no, "dob": dob, "additionalDetails": False})

    # --- insurance agent (IRDAI register) --------------------------------------------------------
    def agent(self, pan: str) -> dict:
        return self._call("agent", {"pan": pan})

    def digilocker(self, doc_type: str, consent_ref: str) -> dict:
        # DigiLocker is not in this build (1 sandbox credit; needs the member's own DigiLocker login).
        raise NotImplementedError("digilocker")
