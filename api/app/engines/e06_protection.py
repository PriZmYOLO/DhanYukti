"""E06 — protection: life / health cover per member.

Evidence: premium debits seen in AA data (PMJJBY/PMSBY/LIC) upgrade a member to covered;
declared cover comes from the fixture / user corrections. `None` = unknown.
Scheme facts (re-check on official sites before showing to families):
  PMJJBY: ₹2 lakh life cover, premium ₹436/yr (age 18–50)  — verify on jansuraksha.gov.in
  PMSBY : ₹2 lakh accident cover, premium ₹20/yr (age 18–70) — verify on jansuraksha.gov.in
  Ayushman Bharat PM-JAY: eligibility check on beneficiary.nha.gov.in
"""
from __future__ import annotations

from app.engines.common import L

JANSURAKSHA_URL = "https://jansuraksha.gov.in"
AYUSHMAN_URL = "https://beneficiary.nha.gov.in"
PMJJBY_PREMIUM = 436  # TODO(re-check on jansuraksha.gov.in before demo — premium revised in 2022)
PMSBY_PREMIUM = 20


def assess(members: list[dict], premiums: list[dict]) -> dict:
    evidence_names = " ".join(p["narration"].upper() for p in premiums)
    detail = []
    unknowns = 0
    uncovered_earners = []
    unknown_life = []
    for m in members:
        cov = m.get("cover", {})
        life = cov.get("life")
        health = cov.get("health")
        if m["name"].upper() in evidence_names and "PMJJBY" in evidence_names:
            life = True
        # The account holder's own premiums are evidence for them (a linked member's twin).
        if m.get("account_holder") and any(k in evidence_names for k in ("PMJJBY", "LIFE", "LIC ", "TERM")):
            life = True
        if m.get("account_holder") and any(k in evidence_names for k in ("HEALTH", "MEDICLAIM", "PMJAY")):
            health = True
        if health is None:
            unknowns += 1
        if m.get("earner") and life is None and m.get("account_holder"):
            # not seen in bank data is not the same as "no cover": say it's unknown
            unknown_life.append(m)
        elif m.get("earner") and not life:
            uncovered_earners.append(m)
        detail.append({"member_id": m["id"], "name": m["name"], "life": bool(life), "health": bool(health),
                       "note": cov.get("note", L("", ""))})

    earners = [m for m in members if m.get("earner")]
    main_uncovered = any(m.get("main_earner") for m in uncovered_earners)
    if main_uncovered:
        status = "red" if len(earners) == 1 else "amber"
    elif uncovered_earners or unknowns or unknown_life:
        status = "amber"
    else:
        status = "green"

    parts_hi, parts_en = [], []
    for m in uncovered_earners:
        parts_hi.append(f"{m['name']}: jeevan bima nahi")
        parts_en.append(f"{m['name']}: no life cover")
    for m in unknown_life:
        parts_hi.append(f"{m['name']}: jeevan bima bank data mein nahi dikha")
        parts_en.append(f"{m['name']}: no life cover seen in bank data")
    if unknowns:
        parts_hi.append("Ayushman: pata nahi")
        parts_en.append("Ayushman: unknown")
    sub = L(" · ".join(parts_hi) or "Sabka bima hai", " · ".join(parts_en) or "Everyone is covered")

    return {
        "detail": detail,
        "status": status,
        "sub": sub,
        "unknowns": unknowns,
        "uncovered_earners": uncovered_earners,
        "sole_earner": len(earners) == 1,
        "unknown_life": unknown_life,
        "confidence": "pata_nahi" if unknowns and not uncovered_earners else ("andaaza" if unknowns or uncovered_earners else "pakka"),
    }
