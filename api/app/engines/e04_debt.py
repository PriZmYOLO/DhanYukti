"""E04 — debt load per ₹100 earned + Lender Shield.

Lender Shield looks at two separate things, and never mixes up whose rule is whose:

1. RBI's list. RBI publishes a directory of Digital Lending Apps (DLAs) deployed by the lenders it
   regulates (1,600+ apps). We only carry a small hand-typed copy (RBI_DLA_SNAPSHOT, 16 names).
   - Name is in our copy          -> "in our copy of RBI's list" (still worth a check: our copy can be stale).
   - Name is NOT in our copy, and the household is LIVE (a real member's AA data) -> we do NOT know.
     We say "Not in our copy of RBI's list — check it on RBI's site", confidence pata_nahi, and we
     never tell the member to avoid the lender on that basis alone. Saying "not on RBI's list" about a
     lender we simply didn't type in would be a false claim about a possibly legitimate business.
   - Name is NOT in our copy, and the household is a DEMO fixture (synthetic, fictional app names) ->
     the demo story keeps its "not on RBI's list" verdict; the fixture defines which apps are listed.

2. Cost. ANNUAL_COST_LIMIT_PCT (36% a year) is DhanYukti's own line, NOT an RBI rule — RBI's digital
   lending directions require the all-in annual cost (APR) to be disclosed, not capped at 36%. Every
   verdict that uses the line says it is our rule.
"""
from __future__ import annotations

from app.engines.common import L, R, inr

# RBI hosts the directory as a session-token report, so there is no stable deep link. Point at the RBI
# homepage and give the menu path (Citizen's Corner -> "DLAs deployed by Regulated Entities").
RBI_DLA_URL = "https://www.rbi.org.in/"
RBI_DLA_PATH = L("rbi.org.in → Citizen's Corner → 'DLAs deployed by Regulated Entities'",
                 "rbi.org.in → Citizen's Corner → 'DLAs deployed by Regulated Entities'")
SACHET_URL = "https://sachet.rbi.org.in"

# Our partial, hand-typed copy of RBI's DLA directory. Absence from this set proves nothing.
RBI_DLA_SNAPSHOT = {
    "kreditbee", "moneyview", "navi", "fibe", "mpokket", "cashe", "truebalance", "smartcoin", "kissht",
    "paysense", "home credit", "lazypay", "slice", "branch", "stashfin", "moneytap",
}
# DhanYukti's own "too expensive" line — our rule, not RBI's.
ANNUAL_COST_LIMIT_PCT = 36
COST_RULE = L("DhanYukti ka niyam (RBI ka nahi): ₹100 par saal ka ₹36 se zyada = mehenga",
              "DhanYukti's rule (not RBI's): more than ₹36 a year per ₹100 = expensive")

# rbi_list_status values
ON_OUR_COPY = "in_our_copy"          # name found in our copy of RBI's list
NOT_ON_LIST = "not_on_list"          # demo fixture only: the synthetic story says it isn't listed
NOT_IN_OUR_COPY = "not_in_our_copy"  # live data: not in our copy -> unknown, check RBI


def effective_annual_pct(charges_p: int, borrowed_p: int, days: int) -> float:
    if borrowed_p <= 0 or days <= 0:
        return 0.0
    return round(charges_p / borrowed_p * 365 / days * 100, 1)


def lender_shield(app_loans: list[dict], *, live: bool = False) -> list[dict]:
    """live=True for a linked member's own household (real AA data); False for demo fixtures."""
    out = []
    for ln in app_loans:
        in_copy = ln["app"].lower() in RBI_DLA_SNAPSHOT
        if in_copy:
            status, on_list, confidence = ON_OUR_COPY, True, "pakka"
        elif live:
            status, on_list, confidence = NOT_IN_OUR_COPY, None, "pata_nahi"
        else:
            status, on_list, confidence = NOT_ON_LIST, False, "pakka"
        pct = effective_annual_pct(ln["charges_p"], ln["borrowed_p"], ln["days"])
        expensive = pct > ANNUAL_COST_LIMIT_PCT
        # An unknown list status alone is never "risky": only a known cost or a known (demo) listing is.
        risky = status == NOT_ON_LIST or expensive
        # Rupees, never percentages (Rules.md #4): "₹100 par X din mein ₹Y" and a yearly rupee figure.
        per100 = round(ln["charges_p"] / ln["borrowed_p"] * 100)
        yearly = int(round(R(ln["charges_p"]) * 365 / ln["days"], -1))
        per100_year = round(pct)
        cost_hi = f"₹100 par {ln['days']} din mein ₹{per100} byaaj"
        cost_en = f"₹{per100} interest on every ₹100 in {ln['days']} days"
        ours_hi = "DhanYukti ke niyam (₹100 par saal ka ₹36; RBI ka niyam nahi)"
        ours_en = "DhanYukti's line of ₹36 a year per ₹100 (our rule, not RBI's)"

        if status == NOT_IN_OUR_COPY:
            head = L(f"Hamari RBI list ki copy mein nahi — RBI ki site par check karein. {cost_hi}",
                     f"Not in our copy of RBI's list — check it on RBI's site. {cost_en}")
            tail = (L(f" — saal ka ~₹{per100_year} per ₹100, {ours_hi} se zyada.",
                      f" — about ₹{per100_year} a year per ₹100, above {ours_en}.") if expensive else
                    L(f" — saal ka ~₹{per100_year} per ₹100, {ours_hi} ke andar.",
                      f" — about ₹{per100_year} a year per ₹100, within {ours_en}."))
            verdict = L(head["hi"] + tail["hi"], head["en"] + tail["en"])
        elif status == NOT_ON_LIST:
            verdict = L(f"RBI ki list mein nahi (demo). {cost_hi} — aise saal bhar lete rahe toh ~₹{yearly:,} jayenge. Isse bachein.",
                        f"Not on RBI's list (demo). {cost_en} — about ₹{yearly:,} a year if repeated. Avoid.")
        elif expensive:
            verdict = L(f"Hamari RBI list ki copy mein hai, par {cost_hi} — {ours_hi} se kaafi zyada, bahut mehenga.",
                        f"In our copy of RBI's list, but {cost_en} — well above {ours_en}. Very expensive.")
        else:
            verdict = L(f"Hamari RBI list ki copy mein hai, saal ka ~₹{per100_year} per ₹100 — {ours_hi} ke andar.",
                        f"In our copy of RBI's list, about ₹{per100_year} a year per ₹100 — within {ours_en}.")
        out.append({
            "app": ln["app"], "on_rbi_list": on_list, "rbi_list_status": status, "confidence": confidence,
            "borrowed": R(ln["borrowed_p"]), "charges": R(ln["charges_p"]), "days": ln["days"],
            "effective_annual_pct": per100_year, "above_our_cost_line": expensive,
            "verdict": verdict, "_risky": risky, "_loan": ln,
        })
    return out


def lender_confidence(lenders: list[dict]) -> str:
    """pata_nahi as soon as one lender's RBI listing is unknown to us."""
    return "pata_nahi" if any(x["rbi_list_status"] == NOT_IN_OUR_COPY for x in lenders) else "pakka"


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
