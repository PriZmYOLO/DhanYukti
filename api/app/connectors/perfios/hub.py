"""Live Perfios Hub: electricity bill, RC Advanced, ration details, EPF passbook, DigiLocker pull.
Each call needs its own DPDP consent line (enforced by routers/enrich.py)."""
from __future__ import annotations

from app.connectors.base import HubConnector
from app.connectors.perfios._http import PerfiosHTTP

HUB_ELECTRICITY_PATH = "/hub/v1/electricity-bill"     # TODO(confirm with sandbox docs)
HUB_RC_ADVANCED_PATH = "/hub/v1/rc-advanced"          # TODO(confirm with sandbox docs)
HUB_RATION_PATH = "/hub/v1/ration-card-details"       # TODO(confirm with sandbox docs)
HUB_EPF_PATH = "/hub/v1/epf-passbook"                 # TODO(confirm with sandbox docs)
HUB_DIGILOCKER_PATH = "/hub/v1/digilocker/pull"       # TODO(confirm with sandbox docs)


class PerfiosHubClient(PerfiosHTTP, HubConnector):
    mode = "live"

    def electricity(self, consumer_no: str, board: str) -> dict:
        return self.request("POST", HUB_ELECTRICITY_PATH, json={"consumerNumber": consumer_no, "boardCode": board})

    def rc(self, reg_no: str) -> dict:
        return self.request("POST", HUB_RC_ADVANCED_PATH, json={"registrationNumber": reg_no})

    def ration(self, card_no: str, state: str) -> dict:
        return self.request("POST", HUB_RATION_PATH, json={"rationCardNumber": card_no, "state": state})

    def epf(self, uan: str) -> dict:
        return self.request("POST", HUB_EPF_PATH, json={"uan": uan})

    def digilocker(self, doc_type: str, consent_ref: str) -> dict:
        return self.request("POST", HUB_DIGILOCKER_PATH, json={"docType": doc_type, "consentRef": consent_ref})
