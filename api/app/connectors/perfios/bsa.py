"""Live Perfios Bank Statement Analysis (PDF upload fallback for banks not yet on AA).

BLOCKER: Perfios BSA `initiate` asks for loan-application fields (loan amount, tenure, product)
because it is built for lenders. DhanYukti is not a lender; going live needs Perfios to approve a
non-lending configuration for our org. Until then this path stays `blocked` in /api/capabilities
and the router serves replay.
"""
from __future__ import annotations

import uuid

from app.connectors.base import BSAConnector
from app.connectors.perfios._http import PerfiosHTTP

BSA_INITIATE_PATH = "/bsa/v1/transactions/initiate"             # TODO(confirm with sandbox docs)
BSA_UPLOAD_PATH = "/bsa/v1/transactions/{txn_id}/upload"         # TODO(confirm with sandbox docs)
BSA_STATUS_PATH = "/bsa/v1/transactions/{txn_id}/status"         # TODO(confirm with sandbox docs)
BSA_REPORT_PATH = "/bsa/v1/transactions/{txn_id}/report"         # TODO(confirm with sandbox docs)


class PerfiosBSAClient(PerfiosHTTP, BSAConnector):
    mode = "live"

    def initiate(self, household_id: str) -> dict:
        body = {
            "txnId": str(uuid.uuid4()),
            "processingType": "STATEMENT",
            # TODO(confirm): lending-oriented mandatory fields — need an approved non-lending config.
            "loanAmount": 0, "loanDuration": 0, "loanType": "NA",
        }
        res = self.request("POST", BSA_INITIATE_PATH, json=body)
        return {"transaction_id": res.get("perfiosTransactionId") or res.get("transactionId")}

    def upload(self, transaction_id: str, filename: str, pdf: bytes, password: str | None = None) -> dict:
        data = {"password": password} if password else None
        self.request("POST", BSA_UPLOAD_PATH.format(txn_id=transaction_id),
                     files={"file": (filename, pdf, "application/pdf")}, data=data)
        return {"transaction_id": transaction_id, "status": "PROCESSING"}

    def status(self, transaction_id: str) -> dict:
        res = self.request("GET", BSA_STATUS_PATH.format(txn_id=transaction_id))
        return {"transaction_id": transaction_id, "status": (res.get("status") or "PROCESSING").upper()}

    def retrieve_report(self, transaction_id: str) -> dict:
        res = self.request("GET", BSA_REPORT_PATH.format(txn_id=transaction_id))
        return {"report_id": transaction_id, "summary": res.get("summary") or {}}
