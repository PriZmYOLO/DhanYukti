"""E04 — debt load per ₹100 earned + Lender Shield.

Lender Shield flags an app lender when it is NOT on our local snapshot of RBI-reported Digital
Lending Apps, or when its effective annual cost is above 36%/yr.
The list below is a small, hand-curated demo snapshot — always verify against the live RBI DLA
directory (https://www.rbi.org.in) before advising a family.
"""
from __future__ import annotations

from app.engines.common import L, R, inr

RBI_DLA_URL = "https://www.rbi.org.in/Scripts/DLA.aspx"  # TODO(confirm): RBI DLA directory URL
SACHET_URL = "https://sachet.rbi.org.in"

RBI_DLA_SNAPSHOT = {
    "kreditbee", "moneyview", "navi", "fibe", "mpokket", "cashe", "truebalance", "smartcoin", "kissht",
    "paysense", "home credit", "lazypay", "slice", "branch", "stashfin", "moneytap",
}
ANNUAL_COST_LIMIT_PCT = 36


def effective_annual_pct(charges_p: int, borrowed_p: int, days: int) -> float:
    if borrowed_p <= 0 or days <= 0:
        return 0.0
    return round(charges_p / borrowed_p * 365 / days * 100, 1)


def lender_shield(app_loans: list[dict]) -> list[dict]:
    out = []
    for ln in app_loans:
        on_list = ln["app"].lower() in RBI_DLA_SNAPSHOT
        pct = effective_annual_pct(ln["charges_p"], ln["borrowed_p"], ln["days"])
        risky = (not on_list) or pct > ANNUAL_COST_LIMIT_PCT
        # Rupees, never percentages (Rules.md #4): "₹100 par X din mein ₹Y" and a yearly rupee figure.
        per100 = round(ln["charges_p"] / ln["borrowed_p"] * 100)
        yearly = int(round(R(ln["charges_p"]) * 365 / ln["days"], -1))
        if not on_list:
            verdict = L(f"RBI ki list mein nahi. ₹100 par {ln['days']} din mein ₹{per100} byaaj — aise saal bhar lete rahe toh ~₹{yearly:,} jayenge. Isse bachein.",
                        f"Not on RBI's list. ₹{per100} interest on every ₹100 in {ln['days']} days — about ₹{yearly:,} a year if repeated. Avoid.")
        elif pct > ANNUAL_COST_LIMIT_PCT:
            verdict = L(f"RBI list mein hai, par ₹100 par {ln['days']} din mein ₹{per100} — bahut mehenga.",
                        f"On RBI's list, but ₹{per100} on every ₹100 in {ln['days']} days — very expensive.")
        else:
            verdict = L(f"RBI list mein hai, ₹100 par saal ka ~₹{round(pct)} — theek.",
                        f"On RBI's list, about ₹{round(pct)} a year per ₹100 — acceptable.")
        out.append({
            "app": ln["app"], "on_rbi_list": on_list, "borrowed": R(ln["borrowed_p"]), "charges": R(ln["charges_p"]),
            "days": ln["days"], "effective_annual_pct": round(pct), "verdict": verdict, "_risky": risky,
            "_loan": ln,
        })
    return out


def debt_load(emi_monthly_p: int, monthly_income_p: int) -> int | None:
    """EMIs per ₹100 earned (integer)."""
    if monthly_income_p <= 0:
        return None
    return round(emi_monthly_p * 100 / monthly_income_p)


def debt_status(per100: int | None, risky_lenders: int) -> str:
    if per100 is None:
        return "amber"
    if per100 > 40:
        return "red"
    if per100 > 20 or risky_lenders:
        return "amber"
    return "green"


def debt_sub(emi_monthly_p: int, n_app_loans: int) -> dict:
    hi = f"EMI {inr(R(emi_monthly_p))}/mahina"
    en = f"EMIs {inr(R(emi_monthly_p))}/month"
    if n_app_loans:
        hi += f" · {n_app_loans} app loan (3 mahine)"
        en += f" · {n_app_loans} app loans (3 months)"
    return L(hi, en)
