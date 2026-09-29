"""Connector interfaces. Live and replay implementations return the same shapes.

Every live failure is raised as `SponsorError` (or NotImplementedError from the unfinished crypto /
signature hooks); `connectors.with_fallback` turns either into a replay call + mode="replay".
Messages must never contain payloads, OTPs, mobiles or keys — only request ids + status codes.
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class SponsorError(Exception):
    def __init__(self, message: str, status_code: int | None = None, request_id: str | None = None,
                 sponsor: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.request_id = request_id
        self.sponsor = sponsor
        self.reason: str | None = None   # the sponsor's own short error text (never a payload)


ConnectorError = SponsorError  # backwards-compatible alias


class AAConnector(ABC):
    """ReBIT FIU flow: consent -> status -> artefact -> FI/request -> FI/fetch -> (decrypt) ; revoke; notifications."""
    mode: str = "replay"

    @abstractmethod
    def create_consent(self, household_id: str, member_id: str, mobile: str) -> dict:
        """-> {consent_handle, redirect_url, status: 'PENDING'}"""

    @abstractmethod
    def consent_status(self, handle: str) -> dict:
        """-> {status, consent_id?}"""

    @abstractmethod
    def consent_artefact(self, consent_id: str) -> dict:
        """-> {consent_id, status, fi_types, fetch_type, data_life, frequency, fi_range, signed: bool}"""

    @abstractmethod
    def fi_request(self, consent_id: str, household_id: str) -> dict:
        """-> {session_id}"""

    @abstractmethod
    def fi_fetch(self, session_id: str, household_id: str) -> dict:
        """-> {accounts: int, transactions: int, fi: [decrypted `account` objects]}"""

    @abstractmethod
    def revoke(self, handle: str) -> dict:
        """-> {status: 'REVOKED'}"""

    @abstractmethod
    def verify_callback(self, headers: dict, body: bytes) -> bool:
        """Verify a Consent/FI notification signature. True = trusted."""

    def fetch_fi(self, handle: str, household_id: str) -> dict:
        """Composite used by the API: status -> FI/request -> FI/fetch."""
        consent_id = self.consent_status(handle).get("consent_id") or handle
        session = self.fi_request(consent_id, household_id)["session_id"]
        return self.fi_fetch(session, household_id)


class AnalyticsConnector(ABC):
    """Perfios analytics on AA data: categorisation, salary/EMI detection, bounce flags."""
    mode: str = "replay"

    @abstractmethod
    def analyse(self, household_id: str, transactions: list[dict] | None = None) -> dict:
        """-> {monthly_income, salary_detected, salary_day, emi_monthly, bounces_6m, cash_share_pct, app_loans_3m}"""

    @abstractmethod
    def categorise(self, household_id: str, transactions: list[dict]) -> list[dict]:
        """-> [{date, narration, amount, category, sub_category}]"""


class BSAConnector(ABC):
    """Perfios Bank Statement Analysis — PDF upload fallback when a bank is not on AA."""
    mode: str = "replay"

    @abstractmethod
    def initiate(self, household_id: str) -> dict:
        """-> {transaction_id}"""

    @abstractmethod
    def upload(self, transaction_id: str, filename: str, pdf: bytes, password: str | None = None) -> dict:
        """-> {transaction_id, status}"""

    @abstractmethod
    def status(self, transaction_id: str) -> dict:
        """-> {transaction_id, status: 'PROCESSING'|'COMPLETED'|'FAILED'}"""

    @abstractmethod
    def retrieve_report(self, transaction_id: str) -> dict:
        """-> {report_id, summary: {...}}"""


class HubConnector(ABC):
    """Perfios Hub lookups. Each call needs its own DPDP consent line."""
    mode: str = "replay"

    @abstractmethod
    def electricity(self, consumer_no: str, board: str) -> dict: ...

    @abstractmethod
    def rc(self, reg_no: str) -> dict: ...

    @abstractmethod
    def ration(self, card_no: str, state: str) -> dict: ...

    @abstractmethod
    def epf(self, uan: str) -> dict: ...

    @abstractmethod
    def digilocker(self, doc_type: str, consent_ref: str) -> dict: ...
