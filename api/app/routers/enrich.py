"""Sponsor enrichment: Perfios Hub lookups (each behind its own DPDP consent line) and the
Perfios BSA PDF-upload fallback. Results are redacted; raw uploads are never stored."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app import connectors, store
from app.config import settings
from app.engines.common import L
from app.fixtures.households import HOUSEHOLDS

router = APIRouter(prefix="/api", tags=["enrich"])

KINDS = {
    "electricity": {"call": lambda c, i: c.electricity(i.get("consumer_no", ""), i.get("board", "")),
                    "used_for": L("Bijli bill ki tareekh aur rakam se paise ki nadi (river) sahi banti hai",
                                  "Bill date and amount keep the cash-flow river accurate")},
    "rc": {"call": lambda c, i: c.rc(i.get("reg_no", "")),
           "used_for": L("Gaadi loan (EMI) aur gaadi bima ki jaanch", "Checks the vehicle loan (EMI) and vehicle insurance")},
    "ration": {"call": lambda c, i: c.ration(i.get("card_no", ""), i.get("state", "")),
               "used_for": L("Sarkari yojana (NFSA / Ayushman) ki patrata ka andaaza",
                             "Estimates eligibility for schemes (NFSA / Ayushman)")},
    "epf": {"call": lambda c, i: c.epf(i.get("uan", "")),
            "used_for": L("PF bachat ko suraksha (bina aamdani kitne din) mein ginna",
                          "Counts PF savings in your safety net (days covered)")},
    "digilocker": {"call": lambda c, i: c.digilocker(i.get("doc_type", "AADHAAR"), i.get("consent_ref", "")),
                   "used_for": L("Pehchaan dastavez se yojana form jaldi bharna", "Pre-fills scheme forms from ID documents")},
}
# demo defaults so the UI can call with an empty input (redacted in replay output anyway)
DEFAULT_INPUT = {
    "A": {"board": "UHBVN", "consumer_no": "3104569821", "reg_no": "HR06AB1234", "card_no": "HR0612345678",
          "state": "Haryana", "uan": "100912345678"},
    "B": {"board": "MPPKVVCL", "consumer_no": "N3452119087", "reg_no": "", "card_no": "MP2334567812",
          "state": "Madhya Pradesh", "uan": ""},
    "C": {"board": "TANGEDCO", "consumer_no": "04211234567", "reg_no": "TN38CD5678", "card_no": "TN3312345678",
          "state": "Tamil Nadu", "uan": "101234567890"},
}


class EnrichIn(BaseModel):
    consent: bool = False
    input: dict[str, Any] | None = None


@router.post("/enrich/{hid}/{kind}")
def enrich(hid: str, kind: str, body: EnrichIn):
    h = hid.upper()
    if h not in HOUSEHOLDS:
        raise HTTPException(404, f"unknown household {hid}")
    if kind not in KINDS:
        raise HTTPException(404, f"unknown kind {kind}; expected one of {sorted(KINDS)}")
    if body.consent is not True:
        raise HTTPException(403, "consent required: each Hub lookup needs its own DPDP consent (send consent: true)")
    with store.lock():
        if kind in store.STATE["dpdp"][h]:
            store.STATE["dpdp"][h][kind] = True
    inp = {**DEFAULT_INPUT[h], **{k: str(v) for k, v in (body.input or {}).items()}}
    spec = KINDS[kind]
    live = connectors.hub()
    result, mode = connectors.run_with_fallback(
        (lambda: spec["call"](live, inp)) if getattr(live, "mode", "replay") == "live" else None,
        lambda: spec["call"](connectors.replay_hub().for_household(h), inp))
    return {"kind": kind, "mode": mode, "result": result, "used_for": spec["used_for"]}


@router.post("/bsa/upload")
async def bsa_upload(file: UploadFile = File(...), household_id: str = Form("A"), password: str | None = Form(None)):
    h = household_id.upper()
    if h not in HOUSEHOLDS:
        raise HTTPException(404, "unknown household")
    pdf = await file.read()
    if not pdf.startswith(b"%PDF"):
        raise HTTPException(415, "expected a PDF bank statement")
    name = file.filename or "statement.pdf"

    def flow(conn):
        tid = conn.initiate(h)["transaction_id"]
        conn.upload(tid, name, pdf, password)
        st = conn.status(tid)
        report = conn.retrieve_report(tid) if st["status"] == "COMPLETED" else {"report_id": tid}
        return {"status": st["status"], "report_id": report["report_id"]}

    live = connectors.bsa()
    res, mode = connectors.run_with_fallback(
        (lambda: flow(live)) if getattr(live, "mode", "replay") == "live" else None,
        lambda: flow(connectors.replay_bsa()))
    del pdf  # compute-then-delete: never keep the statement
    return {"mode": mode, "status": res["status"], "report_id": res["report_id"]}


def capability_rows() -> list[dict]:
    a, p = settings.anumati_mode, settings.perfios_mode
    creds_a = "Sandbox creds present — not yet verified end-to-end" if a == "live" else "No Anumati creds; serving replay"
    creds_p = "Sandbox creds present — not yet verified end-to-end" if p == "live" else "No Perfios creds; serving replay"

    def s(mode, blocked=False):
        if mode != "live":
            return "replay"
        return "blocked" if blocked else "untested"

    rows = [
        ("Anumati", "Consent create (POST /Consent)", s(a), creds_a),
        ("Anumati", "Consent status (GET /Consent/handle)", s(a), creds_a),
        ("Anumati", "Consent artefact (GET /Consent/{id})", s(a), creds_a),
        ("Anumati", "FI request (POST /FI/request)", s(a, blocked=True),
         "Needs KeyMaterial from provider crypto library (build_key_material hook)" if a == "live" else creds_a),
        ("Anumati", "FI fetch (GET /FI/fetch/{session})", s(a, blocked=True),
         "Needs provider decryption library (decrypt_fi_payload hook)" if a == "live" else creds_a),
        ("Anumati", "Consent revoke", s(a), creds_a),
        ("Anumati", "Consent/FI notification + signature verify", s(a, blocked=True),
         "JWS verification hook (verify_jws) pending provider library; status confirmed by poll" if a == "live" else creds_a),
        ("Perfios", "Analytics: categorisation", s(p), creds_p),
        ("Perfios", "Analytics: salary / EMI detection + bounce flags", s(p), creds_p),
        ("Perfios", "BSA: initiate", s(p, blocked=True),
         "Initiation asks for loan fields; needs an approved non-lending config" + ("" if p == "live" else " (replay now)")),
        ("Perfios", "BSA: upload PDF", s(p, blocked=True), "Blocked behind BSA initiate" if p == "live" else creds_p),
        ("Perfios", "BSA: status", s(p, blocked=True), "Blocked behind BSA initiate" if p == "live" else creds_p),
        ("Perfios", "BSA: retrieve report", s(p, blocked=True), "Blocked behind BSA initiate" if p == "live" else creds_p),
        ("Perfios", "Hub: electricity bill", s(p), creds_p),
        ("Perfios", "Hub: RC Advanced", s(p), creds_p),
        ("Perfios", "Hub: ration details", s(p), creds_p),
        ("Perfios", "Hub: EPF passbook", s(p), creds_p),
        ("Perfios", "Hub: DigiLocker pull", s(p), creds_p),
        ("Anthropic", "Ask: rephrase templated answer (optional)",
         "untested" if settings.llm_enabled else "blocked",
         "Numbers always computed by rules; LLM only rephrases" if settings.llm_enabled else "ANTHROPIC_API_KEY not set; deterministic answers only"),
    ]
    return [{"sponsor": sp, "api": api, "status": st, "note": note} for sp, api, st, note in rows]
