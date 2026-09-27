"""Live Perfios Analytics on AA data: categorisation, salary/EMI detection, bounce flags."""
from __future__ import annotations

from app.connectors.base import AnalyticsConnector
from app.connectors.perfios._http import PerfiosHTTP

ANALYSE_PATH = "/analytics/v1/aa/analyse"          # TODO(confirm with sandbox docs)
CATEGORISE_PATH = "/analytics/v1/aa/categorise"    # TODO(confirm with sandbox docs)


def map_analytics(res: dict) -> dict:
    # TODO(confirm with sandbox docs): real Perfios field names.
    return {
        "monthly_income": int(res.get("averageMonthlyIncome") or res.get("monthly_income") or 0),
        "salary_detected": bool(res.get("salaryDetected", res.get("salary_detected", False))),
        "salary_day": res.get("salaryDay") or res.get("salary_day"),
        "emi_monthly": int(res.get("monthlyEmi") or res.get("emi_monthly") or 0),
        "bounces_6m": int(res.get("bounceCount") or res.get("bounces_6m") or 0),
        "cash_share_pct": int(res.get("cashWithdrawalPct") or res.get("cash_share_pct") or 0),
        "app_loans_3m": int(res.get("digitalLoanCount") or res.get("app_loans_3m") or 0),
    }


def _txn_body(household_id: str, transactions: list[dict] | None) -> dict:
    return {"referenceId": f"hh-{household_id}",
            "transactions": [{"date": t["date"], "narration": t["narration"], "amount": t["amount"]}
                             for t in (transactions or [])]}


class PerfiosAnalyticsClient(PerfiosHTTP, AnalyticsConnector):
    mode = "live"

    def analyse(self, household_id: str, transactions: list[dict] | None = None) -> dict:
        return map_analytics(self.request("POST", ANALYSE_PATH, json=_txn_body(household_id, transactions)))

    def categorise(self, household_id: str, transactions: list[dict]) -> list[dict]:
        res = self.request("POST", CATEGORISE_PATH, json=_txn_body(household_id, transactions))
        rows = res.get("transactions") or res.get("data") or []
        return [{"date": r.get("date"), "narration": r.get("narration"), "amount": r.get("amount"),
                 "category": r.get("category"), "sub_category": r.get("subCategory")} for r in rows]
