"""E17 — What-if helpers on top of E03: date certainty, purchase/loan terms, responses, goal impact.

Everything here is a scenario branch: nothing writes back to the household or the store.
Money is integer paise inside, contract rupees out (via R).
"""
from __future__ import annotations

import calendar
from datetime import date

from app.engines import e03_cashflow as e03
from app.engines import e04_debt as e04
from app.engines.common import EN_MONTHS, L, P, R, add_days, d, inr, iso

# ----------------------------------------------------------------------------------------------
# Date certainty: is this upcoming date backed by bank data, or our estimate?
# ----------------------------------------------------------------------------------------------
MONTHS_NEEDED = 3      # same day-of-month in at least 3 of the months we can see
DAY_SLACK = 1          # ±1 day (weekends, bank holidays)
AMOUNT_SLACK = 0.10    # ±10% of the amount


def _ord_en(n: int) -> str:
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def date_certainty(event: dict, transactions: list[dict]) -> tuple[str, dict]:
    """("pakka", basis) when bank data shows this payment on the same day, similar amount, in 3+ months.

    Anything else — payouts that move around, amounts that vary, dates the family told us — is
    "andaaza" (our estimate). A date the user corrected is "andaaza" too: declared, not seen.
    """
    if event.get("_corrected"):
        return "andaaza", L("Aapne bataya — bank data mein nahi dikha", "You told us — not seen in bank data")
    dom = d(event["date"]).day
    amt = event["amount"]
    months = set()
    for t in transactions:
        if (t["amount"] < 0) != (amt < 0) or t.get("source") == "declared":
            continue
        if abs(abs(t["amount"]) - abs(amt)) > abs(amt) * AMOUNT_SLACK:
            continue
        td = d(t["date"])
        last = calendar.monthrange(td.year, td.month)[1]
        if abs(td.day - min(dom, last)) <= DAY_SLACK:
            months.add((td.year, td.month))
    n = len(months)
    if n >= MONTHS_NEEDED:
        return "pakka", L(f"Bank data: pichhle {n} mahine har baar {dom} tareekh ke aas-paas",
                          f"Bank data: around the {_ord_en(dom)} in each of the last {n} months")
    if event["type"] == "gig":
        return "andaaza", L("Kamai ki tareekh aur rakam badalti rehti hai — pichhle mahino se andaaza",
                            "Income dates and amounts vary — estimated from past months")
    return "andaaza", L("Pichhle pattern se andaaza — bank data mein pakka nahi", "Estimated from the past pattern — not confirmed by bank data")


def annotate_certainty(upcoming: list[dict], transactions: list[dict]) -> None:
    for e in upcoming:
        e["certainty"], e["basis"] = date_certainty(e, transactions)


# ----------------------------------------------------------------------------------------------
# Purchase: from cash, or on a loan. A loan's total cost is shown ONLY with complete terms.
# ----------------------------------------------------------------------------------------------
LOAN_TERMS = ("annual_rate_pct", "months", "processing_fee")
LOAN_TERM_LABELS = {
    "annual_rate_pct": L("Byaaj dar (saal ka %)", "Interest rate (% a year)"),
    "months": L("Kitne mahine", "Number of months"),
    "processing_fee": L("Processing fee (₹, 0 bhi ho sakti hai)", "Processing fee (₹, can be 0)"),
}


def _add_months(x: date, n: int) -> date:
    y, m = divmod(x.month - 1 + n, 12)
    y, m = x.year + y, m + 1
    return date(y, m, min(x.day, calendar.monthrange(y, m)[1]))


def loan_terms(principal: int, terms: dict | None) -> dict:
    """Validate terms and, only when complete, work out EMI and total cost (rupees out)."""
    terms = terms or {}
    missing = [k for k in LOAN_TERMS if terms.get(k) is None]
    base = {"principal": principal, "missing": missing,
            "missing_labels": [LOAN_TERM_LABELS[k] for k in missing], "complete": not missing}
    if missing:
        return base
    rate, months, fee = float(terms["annual_rate_pct"]), int(terms["months"]), int(terms["processing_fee"])
    p = P(principal)
    r = rate / 12 / 100
    if r == 0:
        emi_p = -(-p // months)
    else:
        emi_p = int(p * r / (1 - (1 + r) ** -months) + 0.999999)
    emi_p = -(-emi_p // 100) * 100          # round EMI up to a whole rupee
    repay_p = emi_p * months
    extra_p = repay_p - p + P(fee)
    return {**base, "annual_rate_pct": rate, "months": months, "processing_fee": fee,
            "emi": R(emi_p), "total_repay": R(repay_p), "total_cost": R(repay_p + P(fee)),
            "extra_over_price": R(extra_p),
            "extra_per_100": round(extra_p * 100 / p) if p else 0}


def purchase_events(as_of: str, amount: int, pay: str, loan: dict | None) -> list[dict]:
    """Scenario events for a purchase. Cash: the price leaves tomorrow. Loan: fee tomorrow, EMIs monthly."""
    tomorrow = iso(add_days(d(as_of), 1))
    if pay == "cash":
        return [{"id": "purchase", "date": tomorrow, "type": "bill", "amount": -abs(amount),
                 "label": L("Khareedari (cash se)", "Purchase (from cash)")}]
    if not loan or not loan.get("complete"):
        return []  # no terms, no guessed cash flow
    evs = []
    if loan["processing_fee"]:
        evs.append({"id": "loan_fee", "date": tomorrow, "type": "bill", "amount": -loan["processing_fee"],
                    "label": L("Loan processing fee", "Loan processing fee")})
    start = d(as_of)
    for k in range(1, loan["months"] + 1):
        evs.append({"id": f"loan_emi_{k}", "date": iso(_add_months(start, k)), "type": "emi", "amount": -loan["emi"],
                    "label": L(f"Naya loan EMI {k}/{loan['months']}", f"New loan EMI {k}/{loan['months']}")})
    return evs


def first_emi_date(as_of: str) -> str:
    x = _add_months(d(as_of), 1)
    return f"{x.day} {EN_MONTHS[x.month]}"


# ----------------------------------------------------------------------------------------------
# Responses: which permitted moves keep cash at or above ₹0 until the next income?
# ----------------------------------------------------------------------------------------------
# A daily cut is worked out from the household's OWN everyday spend, never a fixed ₹200.
# DhanYukti's rule (not a regulation): never ask a family to cut more than a third of what they
# spend on everyday needs — below that, the cut itself starts to hurt (food, medicine, travel).
MAX_CUT_SHARE = 1 / 3
CUT_RULE = L("DhanYukti ka niyam: roz ke kharch ka ek-tihaai se zyada kaatne ko kabhi nahi kehte",
             "DhanYukti's rule: we never ask you to cut more than a third of your everyday spend")
_STEP_P = 1000  # ₹10


def cut_plan(hh: dict, *, target: str = "gap", **scen_kwargs) -> dict | None:
    """The smallest daily cut (in ₹10 steps) that closes the shortfall on this household's own river.

    target "gap": cash stays at or above ₹0; "floor": it stays at or above the safety floor.
    Returns None when there is nothing to close, or when everyday spend is unknown (unknown is
    not zero: we don't invent a number to cut from)."""
    ess_p = P(hh.get("essentials_per_day") or 0)
    if ess_p <= 0 or hh.get("essentials_known") is False:
        return None
    base_cut = scen_kwargs.pop("cut_per_day", 0) or 0
    base = e03.run(hh, cut_per_day=base_cut, **scen_kwargs)
    # the days that count: tomorrow up to the day the shortfall bites (for the floor: the lowest day before income)
    if target == "gap":
        if not base["first_deficit"]:
            return None
        until, ref_p = base["first_deficit"]["date"], 0
    else:
        until = (base.get("low_before_income") or {}).get("date") or base["next_income_date"]
        ref_p = base["floor_p"]

    def short_with(c_p: int) -> int:
        """How far below ₹0 (or the floor) the river still dips up to `until`, cutting c_p a day."""
        series = e03.run(hh, cut_per_day=base_cut + R(c_p), **scen_kwargs)["series"]
        low = min(x["balance_p"] for x in series if x["date"] <= until)
        return max(0, ref_p - low)

    need_p = short_with(0)
    if need_p <= 0:
        return None
    left_now = ess_p - P(base_cut)
    cap_p = int(left_now * MAX_CUT_SHARE) // _STEP_P * _STEP_P
    if cap_p <= 0:
        return None
    days = max(1, (d(until) - d(hh["as_of"])).days)

    if short_with(cap_p) > 0:
        cut_p, fixes = cap_p, False
    else:
        lo, hi = 1, cap_p // _STEP_P          # smallest k with short_with(k * ₹10) == 0
        while lo < hi:
            mid = (lo + hi) // 2
            if short_with(mid * _STEP_P) == 0:
                hi = mid
            else:
                lo = mid + 1
        cut_p, fixes = lo * _STEP_P, True
    return {
        "per_day_now": R(left_now), "cut_per_day": R(cut_p), "per_day_after": R(left_now - cut_p),
        "days": days, "until": until, "fixes": fixes, "gap": R(need_p),
        "left_after": R(short_with(cut_p)), "target": target, "rule": CUT_RULE,
        "basis": hh.get("essentials_basis"),
    }


def cut_text(plan: dict) -> dict:
    """"5 din roz ₹110 kam kharch — ₹330 ki jagah ₹220" from a cut_plan (rupees only, Rules.md #4)."""
    n, c, a, b = plan["days"], inr(plan["cut_per_day"]), inr(plan["per_day_after"]), inr(plan["per_day_now"])
    hi = f"{n} din roz {c} kam kharch — {b} ki jagah {a}."
    en = f"{n} {'day' if n == 1 else 'days'}, {c} less each day — {a} instead of {b}."
    if not plan["fixes"]:
        hi += f" Isse bhi {inr(plan['left_after'])} kam rahega — baaki Gullak ya parivaar se."
        en += f" That still leaves {inr(plan['left_after'])} short — the rest from the Gullak or family."
    return L(hi, en)


def _needs(e: dict) -> dict:
    return L(f"{e['contact']} ki haan", f"{e['contact']} to agree") if e.get("contact") \
        else L("Jisko paisa dena hai unki haan", "The payee to agree")


def responses(hh: dict, scen_kwargs: dict, scen: dict) -> dict:
    """Try each permitted response on the scenario; report which ones close the shortfall.

    Permitted: move a movable bill due before the next income to income day (conditional — the payee
    must agree), spend a little less each day (worked out from their own everyday spend, see
    `cut_plan`), use the Emergency Gullak, or all of these together.
    Never suggested: new credit. If nothing works, `feasible` is False and the UI says so.
    """
    nid = scen["next_income_date"]
    moves_base = list(scen_kwargs.get("moves") or [])
    moved_ids = {m["event_id"] for m in moves_base}
    movable = [e for e in scen["events"]
               if e.get("movable") and e["paise"] < 0 and e["date"] < nid and e["id"] not in moved_ids]
    emergency = [j for j in hh.get("jars_live", []) if j["kind"] == "emergency" and j["saved"] > 0]
    gullak = emergency[0]["saved"] if emergency else 0

    def trial(extra_moves=(), cut=0, opening_extra=0):
        kw = dict(scen_kwargs)
        kw["moves"] = moves_base + list(extra_moves)
        kw["cut_per_day"] = (kw.get("cut_per_day") or 0) + cut
        return e03.run(hh, **kw, opening_extra=opening_extra)

    out = []
    all_moves = []
    for e in movable:
        mv = {"event_id": e["id"], "new_date": nid}
        all_moves.append(mv)
        r = trial([mv])
        out.append({"id": f"move:{e['id']}", "kind": "move",
                    "label": L(f"{e['label']['hi']} {d(nid).day} tareekh ko", f"Pay {e['label']['en']} on {d(nid).day} {EN_MONTHS[d(nid).month]}"),
                    "gap_after": R(r["gap_p"]), "fixes": r["gap_p"] == 0, "conditional": True, "needs": _needs(e)})
    plan = cut_plan(hh, target="gap", **scen_kwargs)
    cut = plan["cut_per_day"] if plan else 0
    if plan:
        r = trial(cut=cut)
        out.append({"id": "cut", "kind": "cut", "label": L(f"Roz {inr(cut)} kam kharch", f"Spend {inr(cut)} less a day"),
                    "gap_after": R(r["gap_p"]), "fixes": r["gap_p"] == 0, "conditional": False, "plan": plan})
    if gullak:
        r = trial(opening_extra=gullak)
        out.append({"id": "gullak", "kind": "gullak",
                    "label": L(f"Emergency Gullak ke {inr(gullak)} use karein", f"Use the Emergency jar ({inr(gullak)})"),
                    "gap_after": R(r["gap_p"]), "fixes": r["gap_p"] == 0, "conditional": False, "jar_id": emergency[0]["id"]})
    if len(out) > 1:
        r = trial(all_moves, cut=cut, opening_extra=gullak)
        out.append({"id": "all", "kind": "all", "label": L("Sab ek saath", "All of these together"),
                    "gap_after": R(r["gap_p"]), "fixes": r["gap_p"] == 0, "conditional": bool(all_moves)})
    return {"responses": out, "feasible": any(x["fixes"] for x in out)}


# ----------------------------------------------------------------------------------------------
# Goal impact: what breaking the Emergency jar does to its goal gap.
# ----------------------------------------------------------------------------------------------
def daily_needed(goal: int, saved: int, target_date: str, as_of: str) -> int:
    days = max(1, (d(target_date) - d(as_of)).days)
    remaining = max(0, goal - saved)
    per_day = -(-remaining // days)
    return -(-per_day // 10) * 10 if per_day else 0


def goal_impact(hh: dict, jar_id: str, needed: int) -> dict | None:
    """Jar before vs after using `needed` rupees from it (capped at what's saved)."""
    j = next((x for x in hh.get("jars_live", []) if x["id"] == jar_id), None)
    if not j or needed <= 0:
        return None
    used = min(j["saved"], needed)
    after = j["saved"] - used
    return {"jar_id": j["id"], "name": j["name"], "goal": j["goal"], "target_date": j["target_date"], "used": used,
            "saved_before": j["saved"], "saved_after": after,
            "gap_before": max(0, j["goal"] - j["saved"]), "gap_after": max(0, j["goal"] - after),
            "daily_before": j["daily_suggest"], "daily_after": daily_needed(j["goal"], after, j["target_date"], hh["as_of"])}


def debt_load_after(emi_monthly_p: int, monthly_income_p: int, new_emi: int) -> tuple[int | None, int | None]:
    return e04.debt_load(emi_monthly_p, monthly_income_p), e04.debt_load(emi_monthly_p + P(new_emi), monthly_income_p)
