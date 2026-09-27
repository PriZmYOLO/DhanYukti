"""Replay Anumati connector: deterministic, offline. Used when creds are missing or live fails."""
from __future__ import annotations

import json
import secrets
from pathlib import Path

from app import store
from app.connectors.anumati.client import FI_TYPES
from app.connectors.base import AAConnector
from app.fixtures.households import HOUSEHOLDS

REPLAY_FILE = Path(__file__).resolve().parents[2] / "fixtures" / "replay_aa_fetch.json"
AUTO_APPROVE_AFTER_POLLS = 2


def _synth_fi(hid: str) -> list[dict]:
    """ReBIT-shaped FI for households without a stored sample (B, C)."""
    hh = HOUSEHOLDS[hid]
    out = []
    for a in hh["accounts"]:
        tx = [t for t in hh["transactions"] if t.get("account") == a["id"]]
        out.append({"account": {"type": "deposit", "maskedAccNumber": a["masked"],
                                "summary": {"currentBalance": str(a["balance"])},
                                "transactions": {"transaction": [{"amount": str(abs(t["amount"])),
                                                                  "type": "CREDIT" if t["amount"] > 0 else "DEBIT",
                                                                  "narration": t["narration"],
                                                                  "valueDate": t["date"]} for t in tx]}}})
    return out


class AnumatiReplay(AAConnector):
    mode = "replay"

    def create_consent(self, household_id: str, member_id: str, mobile: str) -> dict:
        handle = f"cn_{household_id.lower()}_{secrets.token_hex(4)}"
        return {"consent_handle": handle,
                "redirect_url": f"https://sandbox.anumati.replay/consent?handle={handle}",
                "status": "PENDING"}

    def consent_status(self, handle: str) -> dict:
        c = store.STATE["consents"].get(handle)
        if not c:
            return {"status": "REJECTED", "consent_id": None}
        c["polls"] = c.get("polls", 0) + 1
        if c["status"] == "PENDING" and c["polls"] >= AUTO_APPROVE_AFTER_POLLS:
            c["status"] = "ACTIVE"
        return {"status": c["status"], "consent_id": f"ca_{handle}" if c["status"] == "ACTIVE" else None}

    def approve(self, handle: str) -> dict:
        c = store.STATE["consents"].get(handle)
        if c and c["status"] == "PENDING":
            c["status"] = "ACTIVE"
        return {"status": c["status"] if c else "REJECTED"}

    def consent_artefact(self, consent_id: str) -> dict:
        handle = consent_id.removeprefix("ca_")
        c = store.STATE["consents"].get(handle, {})
        return {"consent_id": consent_id, "status": c.get("status", "ACTIVE"), "fi_types": FI_TYPES,
                "fetch_type": "PERIODIC", "data_life": {"unit": "DAY", "value": 1},
                "frequency": {"unit": "MONTH", "value": 1}, "fi_range": {"months": 6}, "signed": True}

    def fi_request(self, consent_id: str, household_id: str) -> dict:
        return {"session_id": f"sess_{household_id.lower()}_{secrets.token_hex(4)}"}

    def fi_fetch(self, session_id: str, household_id: str) -> dict:
        if household_id == "A" and REPLAY_FILE.exists():
            doc = json.loads(REPLAY_FILE.read_text())
            fi = [item["decryptedFI"] for fip in doc["FI"] for item in fip["data"]]
        else:
            fi = _synth_fi(household_id)
        txns = sum(len(a["account"]["transactions"]["transaction"]) for a in fi)
        return {"accounts": len(fi), "transactions": txns, "fi": fi}

    def fetch_fi(self, handle: str, household_id: str) -> dict:
        # replay: consent already verified by the router; don't count this as a status poll
        return self.fi_fetch(self.fi_request(f"ca_{handle}", household_id)["session_id"], household_id)

    def revoke(self, handle: str) -> dict:
        return {"status": "REVOKED"}

    def verify_callback(self, headers: dict, body: bytes) -> bool:
        return True
