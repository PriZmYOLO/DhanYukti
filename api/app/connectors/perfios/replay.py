"""Replay Perfios connectors — realistic, redacted, deterministic fixtures (no network)."""
from __future__ import annotations

import copy
import hashlib

from app.connectors.base import AnalyticsConnector, BSAConnector, HubConnector
from app.engines.e01_normalise import CATEGORY_OF, classify
from app.fixtures.households import HOUSEHOLDS


def _mask(s: str, keep: int = 4) -> str:
    s = str(s or "")
    return ("X" * max(0, len(s) - keep)) + s[-keep:] if s else ""


class PerfiosAnalyticsReplay(AnalyticsConnector):
    mode = "replay"

    def analyse(self, household_id: str, transactions: list[dict] | None = None) -> dict:
        return copy.deepcopy(HOUSEHOLDS[household_id]["perfios_analytics"])

    def categorise(self, household_id: str, transactions: list[dict]) -> list[dict]:
        out = []
        for t in transactions:
            k = classify(t["narration"], t["amount"])
            out.append({"date": t["date"], "narration": t["narration"], "amount": t["amount"],
                        "category": CATEGORY_OF.get(k, "income" if t["amount"] > 0 else "baaki"), "sub_category": k})
        return out


class PerfiosBSAReplay(BSAConnector):
    mode = "replay"
    _jobs: dict[str, dict] = {}

    def initiate(self, household_id: str) -> dict:
        tid = "bsa_" + hashlib.sha1(f"{household_id}{len(self._jobs)}".encode()).hexdigest()[:10]
        self._jobs[tid] = {"household_id": household_id, "status": "INITIATED"}
        return {"transaction_id": tid}

    def upload(self, transaction_id: str, filename: str, pdf: bytes, password: str | None = None) -> dict:
        job = self._jobs.setdefault(transaction_id, {"household_id": "A"})
        job.update({"status": "COMPLETED", "pages": max(1, pdf.count(b"/Type /Page")), "bytes": len(pdf)})
        return {"transaction_id": transaction_id, "status": "COMPLETED"}

    def status(self, transaction_id: str) -> dict:
        return {"transaction_id": transaction_id, "status": self._jobs.get(transaction_id, {}).get("status", "FAILED")}

    def retrieve_report(self, transaction_id: str) -> dict:
        job = self._jobs.get(transaction_id, {})
        pa = HOUSEHOLDS[job.get("household_id", "A")]["perfios_analytics"]
        return {"report_id": transaction_id,
                "summary": {"months": 6, "avg_monthly_credit": pa["monthly_income"], "emi_monthly": pa["emi_monthly"],
                            "bounces": pa["bounces_6m"], "pages": job.get("pages", 0)}}


_HUB_PROFILE = {
    "A": {"name": "R**** Y****", "employer": "SHREE KRISHNA TEXTILE MILLS", "fps": "FPS Model Town, Panipat",
          "bill": 1500, "due": "2026-09-27", "financier": "HDFC BANK LTD", "members": 4},
    "B": {"name": "F***** S*****", "employer": None, "fps": "FPS Khajrana, Indore",
          "bill": 800, "due": "2026-10-05", "financier": None, "members": 4},
    "C": {"name": "A**** N***", "employer": "LAKSHMI AUTO COMPONENTS PVT LTD", "fps": "FPS RS Puram, Coimbatore",
          "bill": 1100, "due": "2026-10-08", "financier": None, "members": 3},
}


class PerfiosHubReplay(HubConnector):
    mode = "replay"

    def __init__(self, household_id: str = "A"):
        self.p = _HUB_PROFILE.get(household_id, _HUB_PROFILE["A"])

    def for_household(self, household_id: str) -> "PerfiosHubReplay":
        return PerfiosHubReplay(household_id)

    def electricity(self, consumer_no: str, board: str) -> dict:
        return {"board": board or "UHBVN", "consumer_no": _mask(consumer_no or "3104569821"), "name": self.p["name"],
                "last_bill_amount": self.p["bill"], "last_bill_date": "2026-08-20", "due_date": self.p["due"],
                "units_consumed": 214, "paid_on_time_6m": 6, "connection": "Domestic"}

    def rc(self, reg_no: str) -> dict:
        return {"reg_no": _mask(reg_no or "HR06AB1234", 4), "vehicle_class": "M-Cycle/Scooter (2WN)",
                "maker_model": "HERO MOTOCORP / SPLENDOR+", "registration_date": "2023-02-14",
                "financier": self.p["financier"], "hypothecated": bool(self.p["financier"]),
                "insurance_valid_upto": "2027-02-13", "puc_valid_upto": "2026-12-01", "owner": self.p["name"]}

    def ration(self, card_no: str, state: str) -> dict:
        return {"state": state or "Haryana", "card_no": _mask(card_no or "HR0612345678"), "scheme": "NFSA",
                "card_type": "PHH (Priority Household)", "members": self.p["members"], "fps": self.p["fps"],
                "monthly_entitlement_kg": 20, "last_lifted": "2026-09-05"}

    def epf(self, uan: str) -> dict:
        if not self.p["employer"]:
            return {"uan": None, "found": False, "note": "No EPF account found (self-employed / gig income)"}
        return {"uan": _mask(uan or "100912345678"), "found": True, "member_name": self.p["name"],
                "establishment": self.p["employer"], "employee_share": 38400, "employer_share": 11750,
                "pension_share": 26650, "last_contribution_month": "2026-08", "months_contributed": 64}

    def digilocker(self, doc_type: str, consent_ref: str) -> dict:
        return {"doc_type": doc_type or "AADHAAR", "issuer": "UIDAI" if (doc_type or "AADHAAR") == "AADHAAR" else "Issuer",
                "status": "PULLED", "masked_id": "XXXX-XXXX-4410", "consent_ref": _mask(consent_ref or "dl-consent-0001")}
