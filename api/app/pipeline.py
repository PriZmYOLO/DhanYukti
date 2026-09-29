"""Household Twin pipeline: fixture (+ user overlays) -> engines -> Dashboard JSON."""
from __future__ import annotations

import calendar
import copy
import re
from datetime import date

from app import connectors, store
from app.engines import e03_cashflow as e03
from app.engines import e04_debt as e04
from app.engines import e05_resilience as e05
from app.engines import e06_protection as e06
from app.engines import e13_priority as e13
from app.engines import e14_nba as e14
from app.engines import e16_confidence as e16
from app.engines import e17_whatif as e17
from app.engines.common import EN_MONTHS, L, P, R, add_days, d, inr, iso
from app.engines.e01_normalise import normalise, spend_last_month, txn_out
from app.fixtures.households import get_household
from app.game import service as game

SUPPORTED_CORRECTIONS = (
    "monthly_income, essentials_per_day, safety_floor, closing_balance, salary_date (YYYY-MM-DD), "
    "event:<event_id>.date, event:<event_id>.amount, member:<member_id>.life, member:<member_id>.health, "
    "series:<series_id>.status (confirmed|ignored), series:<series_id>.amount, series:<series_id>.day (1-31), "
    "series:everyday.status (confirmed)"
)
SERIES_ATTRS = ("status", "amount", "day")
MAX_AMOUNT = 10_000_000
_DATED_ID = re.compile(r"_\d{4}-\d{2}-\d{2}$")


class CorrectionError(ValueError):
    pass


def series_of(e: dict) -> str:
    """The repeating payment an upcoming event belongs to (older twins: its id without the date)."""
    return e.get("series") or _DATED_ID.sub("", e["id"])


def _series_value(attr: str, value):
    """Validated overlay value for series:<id>.<attr>; None means no decision (undo)."""
    if value is None:
        return None
    if attr == "status":
        if value not in ("confirmed", "ignored"):
            raise CorrectionError(attr)
        return value
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value != int(value):
        raise CorrectionError(attr)
    v = int(value)
    if attr == "amount" and not 0 < v <= MAX_AMOUNT:
        raise CorrectionError(attr)
    if attr == "day" and not 1 <= v <= 31:
        raise CorrectionError(attr)
    return v


def _apply_series(hh: dict, overlays: list[tuple[str, str, object]]) -> None:
    """The member's own decisions on repeating payments. Fixes first, then confirm/ignore.

    confirmed: every date of it is marked "checked by you" (bank certainty is kept as it is).
    ignored:   the member says it won't happen: it leaves the river, what-if and every engine.
    amount/day: the member's figure replaces ours on every date (then it is "you told us").
    A series that no longer exists (the twin was rebuilt from newer data) is skipped here.
    """
    as_of = d(hh["as_of"])
    fixes = [o for o in overlays if o[1] != "status"]
    statuses = [o for o in overlays if o[1] == "status"]
    for sid, attr, value in fixes + statuses:
        v = _series_value(attr, value)
        if v is None:
            continue
        if sid == "everyday":
            if attr != "status" or v != "confirmed":
                raise CorrectionError(f"series:everyday.{attr}")
            hh["essentials_checked"] = True
            continue
        evs = [e for e in hh["upcoming"] if series_of(e) == sid]
        if attr == "status" and v == "ignored":
            hh["upcoming"] = [e for e in hh["upcoming"] if series_of(e) != sid]
            hh.setdefault("ignored_series", []).append(sid)
            continue
        for e in evs:
            if attr == "status":
                e.setdefault("checked", "confirmed")
            elif attr == "amount":
                e["amount"] = v if e["amount"] > 0 else -v
                e["_corrected"], e["checked"] = True, "corrected"
            else:  # day of the month, clamped; a date that falls on/before today moves on by its rhythm
                x = d(e["date"])
                step = int((e.get("every") or {}).get("months") or 1)
                nx = date(x.year, x.month, min(v, calendar.monthrange(x.year, x.month)[1]))
                while nx <= as_of:
                    y, m = divmod(nx.month - 1 + step, 12)
                    y, m = nx.year + y, m + 1
                    nx = date(y, m, min(v, calendar.monthrange(y, m)[1]))
                e["date"] = iso(nx)
                e["_corrected"], e["checked"] = True, "corrected"
    hh["upcoming"].sort(key=lambda e: (e["date"], e["amount"] < 0))


def apply_overlay(hh: dict, overlay: dict) -> dict:
    """Overlay corrections onto a COPY of the fixture. The source is never rewritten."""
    series: list[tuple[str, str, object]] = []
    for field, value in overlay.items():
        if field.startswith("series:"):
            sid, _, attr = field[7:].partition(".")
            if not sid or attr not in SERIES_ATTRS:
                raise CorrectionError(field)
            series.append((sid, attr, value))
        elif field in ("essentials_per_day", "safety_floor", "closing_balance"):
            hh[field] = int(value)
        elif field == "monthly_income":
            hh["_monthly_income_override"] = int(value)
        elif field == "salary_date":
            for e in hh["upcoming"]:
                if e["type"] == "salary":
                    e["date"] = str(value)
                    break
        elif field.startswith("event:"):
            eid, _, attr = field[6:].partition(".")
            ev = next((e for e in hh["upcoming"] if e["id"] == eid), None)
            if not ev or attr not in ("date", "amount"):
                raise CorrectionError(field)
            ev[attr] = int(value) if attr == "amount" else str(value)
            ev["_corrected"] = True
        elif field.startswith("member:"):
            mid, _, attr = field[7:].partition(".")
            m = next((m for m in hh["members"] if m["id"] == mid), None)
            if not m or attr not in ("life", "health"):
                raise CorrectionError(field)
            m.setdefault("cover", {})[attr] = bool(value) if value is not None else None
        else:
            raise CorrectionError(field)
    if series:
        _apply_series(hh, series)
    return hh


def validate_correction(hid: str, field: str, value) -> None:
    hh = get_household(hid)
    apply_overlay(hh, {field: value})  # raises CorrectionError / ValueError


def load_twin(twin: dict, state: dict | None, declared: dict | None = None, hub: dict | None = None) -> dict:
    """A linked member's household: their twin (from their own bank data) + what they told us + their own state
    + records they chose to add through Perfios Hub (each with its own DPDP consent)."""
    from app.engines import e02_twin, hub_facts  # late import: e02 imports this module lazily too
    state = state or {}
    overlays = state.get("overlays") or {}
    # 1) the member's decisions on bank-found payments, 2) what they told us fills the gaps left,
    # 3) their other corrections (they may target anything, including a "you told us" date).
    bank = {k: v for k, v in overlays.items() if k.startswith("series:") or k == "essentials_per_day"}
    rest = {k: v for k, v in overlays.items() if k not in bank}
    hh = apply_overlay(copy.deepcopy(twin), bank)
    hh = e02_twin.apply_declared(hh, declared)
    # 2b) records from their bill providers / EPFO / ration / RTO: the source's own dates win over our projection
    hh = hub_facts.apply_hub(hh, hub)
    hh = apply_overlay(hh, rest)
    for e in hh["upcoming"]:
        if e.get("_corrected"):
            e["certainty"], e["basis"] = e17.date_certainty(e, [])
    hh["jars_live"] = game.jars_suggest(state.get("jars") or [], hh["as_of"])
    return hh


def validate_twin_correction(twin: dict, field: str, value) -> None:
    if field.startswith("series:"):
        sid = field[7:].partition(".")[0]
        if sid != "everyday" and not any(series_of(e) == sid for e in twin.get("upcoming", [])):
            raise CorrectionError(field)  # only a payment we actually suggested
    apply_overlay(copy.deepcopy(twin), {field: value})  # raises CorrectionError / ValueError


def load(hid: str) -> dict | None:
    hh = get_household(hid)
    if not hh:
        return None
    hh = apply_overlay(hh, store.STATE["overlays"].get(hh["id"], {}))
    e17.annotate_certainty(hh["upcoming"], hh["transactions"])
    hh["jars_live"] = game.jars_with_suggest(hh["id"], hh["as_of"])
    return hh


def _deficit_fix(hh: dict, cash: dict) -> dict | None:
    fd = cash["first_deficit"]
    if not fd:
        return None
    movable = [e for e in fd["events"] if e.get("movable") and e["paise"] < 0]
    if not movable:
        return None
    culprit = min(movable, key=lambda e: e["paise"])
    new_date = cash["next_income_date"]
    fixed = e03.run(hh, moves=[{"event_id": culprit["id"], "new_date": new_date}])
    return {"culprit": culprit, "new_date": new_date, "floor_gap_p": fixed["floor_gap_p"],
            "gap_after_p": fixed["gap_p"], "run": fixed}


def compute(hh: dict) -> dict:
    as_of = hh["as_of"]
    # A linked user's twin carries E01's output (compute-then-delete: the full ledger is gone).
    norm = copy.deepcopy(hh["_norm"]) if hh.get("_norm") else normalise(hh["transactions"], as_of, hh["accounts"])
    if hh.get("_monthly_income_override"):
        norm["monthly_income_p"] = P(hh["_monthly_income_override"])
    cash = e03.run(hh)

    ninety = iso(add_days(d(as_of), -90))
    recent_loans = [ln for ln in norm["app_loans"] if ln["disbursal"]["date"] >= ninety]
    # A linked member's twin (real AA data) never gets a "not on RBI's list" verdict from our partial copy.
    live = bool(hh.get("_norm"))
    lenders = e04.lender_shield(recent_loans, live=live)
    per100 = e04.debt_load(norm["emi_monthly_p"], norm["monthly_income_p"])
    if norm.get("emi_known") is False:
        per100 = None  # a linked member with no complete month of data: unknown, not ₹0

    jars = hh["jars_live"]
    emergency_p = sum(P(j["saved"]) for j in jars if j["kind"] == "emergency")
    idle_p = sum(a["balance_p"] for a in norm["idle_accounts"])
    liquid_p = P(hh["closing_balance"]) + idle_p + emergency_p + P(hh.get("declared_cash") or 0)
    res_days = e05.resilience_days(liquid_p, P(hh["essentials_per_day"]), norm["fixed_monthly_p"])

    prot = e06.assess(hh["members"], norm["premiums"], hh.get("ration"))

    income_conf = e16.grade(source="aa", months_seen=max(norm["salary_months"], 3 if norm["gig_rows"] else 0),
                            estimated=hh["income_type"] == "gig" or bool(norm.get("income_declared")))
    conf = {
        "deficit": e16.combine(income_conf, "pakka"),
        "lender": e04.lender_confidence(lenders),
        "protection": prot["confidence"],
        "resilience": "andaaza",
        "safe": income_conf,
        "debt": "pakka" if norm["salary_months"] >= 3 or hh["income_type"] != "salary" else "andaaza",
    }
    ctx = {"hh": hh, "as_of": as_of, "norm": norm, "cash": cash, "lenders": lenders, "per100": per100,
           "jars": jars, "resilience_days": res_days, "liquid_p": liquid_p, "protection": prot, "conf": conf,
           "deficit_fix": _deficit_fix(hh, cash)}
    ctx["needs"] = e13.needs(ctx)
    ctx["nba"] = e14.cards(ctx["needs"], ctx)
    return ctx


def _fmt_day(s: str) -> str:
    x = d(s)
    return f"{x.day} {EN_MONTHS[x.month]}"


def metrics(ctx: dict) -> dict:
    hh, cash, norm = ctx["hh"], ctx["cash"], ctx["norm"]
    safe = max(0, R(cash["low_before_income"]["balance_p"] - cash["floor_p"]))
    ess = hh["essentials_per_day"]
    if safe == 0:
        s_status = "red"
        s_sub = L(f"Sirf zaroori kharch ({inr(ess)}/din)", f"Essentials only ({inr(ess)}/day)")
    else:
        s_status = "amber" if safe < ess * 3 else "green"
        if any(e["type"] == "salary" for e in cash["events"]):
            dd = _fmt_day(cash["next_income_date"])
            s_sub = L(f"Salary ({dd}) tak, zaroori kharch ke baad", f"Until salary on {dd}, after essentials")
        else:
            s_sub = L("Agle 14 din, zaroori kharch ke baad", "Next 14 days, after essentials")
    rd = ctx["resilience_days"]
    fixed_day = R(norm["fixed_monthly_p"] // 30)
    lenders_risky = sum(1 for x in ctx["lenders"] if x["_risky"])
    prot = ctx["protection"]
    return {
        "safe_to_spend": {"value": safe, "unit": "inr", "status": s_status, "confidence": ctx["conf"]["safe"],
                          "label": L("Aaj kharch kar sakte hain", "Safe to spend today"), "sub": s_sub, "engine": "E03"},
        "resilience_days": {"value": rd, "unit": "days", "status": e05.status(rd), "confidence": ctx["conf"]["resilience"],
                            "label": L("Bina aamdani kitne din", "Days covered without income"),
                            "sub": L(f"Bachat {inr(R(ctx['liquid_p']))} ÷ roz {inr(ess + fixed_day)}"
                                     + (f" (ghar ka cash {inr(hh['declared_cash'])} samet, aapne bataya)" if hh.get("declared_cash") else "")
                                     + (f" · PF {inr(hh['locked_savings'])} nahi gina (retirement ke liye)" if hh.get("locked_savings") else ""),
                                     f"Savings {inr(R(ctx['liquid_p']))} ÷ {inr(ess + fixed_day)}/day"
                                     + (f" (incl. {inr(hh['declared_cash'])} cash at home, you told us)" if hh.get("declared_cash") else "")
                                     + (f" · PF {inr(hh['locked_savings'])} not counted (locked for retirement)" if hh.get("locked_savings") else "")),
                            "engine": "E05"},
        "debt_load": {"value": ctx["per100"], "unit": "per100", "status": e04.debt_status(ctx["per100"], lenders_risky),
                      "confidence": ctx["conf"]["debt"],
                      "label": L("₹100 kamai par karz", "Debt per ₹100 earned"),
                      "sub": e04.debt_sub(norm["emi_monthly_p"], len(ctx["lenders"])), "engine": "E04"},
        "protection": {"value": None, "unit": "status", "status": prot["status"], "confidence": prot["confidence"],
                       "label": L("Suraksha (bima)", "Protection (insurance)"), "sub": prot["sub"], "engine": "E06"},
    }


SPEND_LABELS = {
    "ghar": L("Ghar (kiraya, bill, fee)", "Home (rent, bills, fees)"),
    "khana": L("Khana-peena", "Food & groceries"),
    "emi": L("EMI / karz", "EMIs / loans"),
    "bachat": L("Bachat / bima", "Savings / insurance"),
    "baaki": L("Baaki (cash, dawai, anya)", "Other (cash, medicine, misc)"),
}


def spend(ctx: dict) -> list[dict]:
    if ctx["hh"].get("_spend") is not None:
        return ctx["hh"]["_spend"]
    return spend_from_norm(ctx["norm"], ctx["as_of"])


def spend_from_norm(norm: dict, as_of: str) -> list[dict]:
    out = []
    for b in spend_last_month(norm, as_of):
        top = sorted(b["rows"], key=lambda r: r["paise"])[:3]
        out.append({"key": b["key"], "label": SPEND_LABELS[b["key"]], "amount": R(b["total_p"]),
                    "top": [txn_out(r) for r in top]})
    return out


def analytics_for(hid: str, hh: dict) -> tuple[dict, str]:
    cache = store.STATE["derived"].setdefault(hid, {})
    if "analytics" not in cache:
        res, mode = connectors.with_fallback(connectors.analytics(), connectors.replay_analytics(), "analyse",
                                             hid, hh["transactions"])
        cache["analytics"], cache["analytics_mode"] = res, mode
    return cache["analytics"], cache["analytics_mode"]


def crosscheck(ctx: dict, pa: dict) -> list[dict]:
    norm = ctx["norm"]
    ours_inc = R(norm["monthly_income_p"])
    ours_emi = R(norm["emi_monthly_p"])
    sal_day = norm["salary_day"]
    n_loans = len(ctx["lenders"])
    return [
        {"field": L("Mahine ki aamdani", "Monthly income"), "ours": inr(ours_inc), "perfios": inr(pa["monthly_income"]),
         "agree": abs(ours_inc - pa["monthly_income"]) <= 0.02 * max(1, ours_inc)},
        {"field": L("Salary ki tareekh", "Salary day"), "ours": str(sal_day) if sal_day else "—",
         "perfios": str(pa["salary_day"]) if pa.get("salary_day") else "—", "agree": sal_day == pa.get("salary_day")},
        {"field": L("EMI har mahine", "EMIs per month"), "ours": inr(ours_emi), "perfios": inr(pa["emi_monthly"]),
         "agree": ours_emi == pa["emi_monthly"]},
        {"field": L("Bounce (6 mahine)", "Bounces (6 months)"), "ours": str(norm["bounces"]), "perfios": str(pa["bounces_6m"]),
         "agree": norm["bounces"] == pa["bounces_6m"]},
        {"field": L("Cash kharch ka hissa", "Cash share of spend"), "ours": f"{norm['cash_share_pct']}%",
         "perfios": f"{pa['cash_share_pct']}%", "agree": abs(norm["cash_share_pct"] - pa["cash_share_pct"]) <= 5},
        {"field": L("App loan (3 mahine)", "App loans (3 months)"), "ours": str(n_loans), "perfios": str(pa["app_loans_3m"]),
         "agree": n_loans == pa["app_loans_3m"]},
    ]


def _public_lender(x: dict) -> dict:
    return {k: v for k, v in x.items() if not k.startswith("_")}


def dashboard(hid: str) -> dict | None:
    hh = load(hid)
    if not hh:
        return None
    pa, amode = analytics_for(hh["id"], hh)
    ds = dict(store.STATE["data_source"][hh["id"]])
    if amode == "live":
        ds["analytics"] = "Perfios (live)"
    return dashboard_for(hh, data_source=ds, analytics=pa, game_block=game.game_out(hh["id"]))


def dashboard_for(hh: dict, *, data_source: dict, analytics: dict | None, game_block: dict) -> dict:
    """Dashboard for any household: a fixture (A/B/C) or a linked user's twin."""
    ctx = compute(hh)
    norm = ctx["norm"]
    return {
        "household": {
            "id": hh["id"], "family_name": hh["family_name"], "primary_user": hh["primary_user"], "city": hh["city"],
            "income_type": hh["income_type"],
            # unknown is not zero: a twin with no complete month has no monthly income yet
            "monthly_income": R(norm["monthly_income_p"]) if norm.get("income_known", True) else None,
            "members": [{k: m[k] for k in ("id", "name", "role", "earner", "age", "sharing", "avatar") if k in m}
                        for m in hh["members"]],
            "literacy_mode": hh["literacy_mode"], "language": hh["language"],
        },
        "as_of": hh["as_of"],
        "data_source": data_source,
        "metrics": metrics(ctx),
        "protection_detail": ctx["protection"]["detail"],
        "river": ctx["cash"]["river"],
        "nba": ctx["nba"],
        "jars": hh["jars_live"],
        "spend": spend(ctx),
        "lender_shield": [_public_lender(x) for x in ctx["lenders"]],
        # Perfios cross-check only exists where Perfios analysed the same data (the replay fixtures).
        "crosscheck": crosscheck(ctx, analytics) if analytics else [],
        # records the member added through Perfios Hub (derived facts only) and anything to act on
        "records": hh.get("records") or [],
        "records_notes": hh.get("records_notes") or [],
        "game": game_block,
    }


def household_list() -> list[dict]:
    out = []
    for hid in ("A", "B", "C"):
        hh = load(hid)
        ctx = compute(hh)
        out.append({"id": hid, "family_name": hh["family_name"], "city": hh["city"],
                    "income": R(ctx["norm"]["monthly_income_p"]), "members": len(hh["members"]),
                    "problem": hh["problem"], "hero": ctx["nba"][0]["title"] if ctx["nba"] else L("Sab theek", "All good")})
    return out


# --------------------------------------------------------------------------------------------
# Simulate (scenario branch on a copy)
# --------------------------------------------------------------------------------------------
def simulate(hid: str, moves=None, shock_amount: int = 0, salary_delay_days: int = 0, cut_per_day: int = 0,
             purchase: dict | None = None) -> dict | None:
    hh = load(hid)
    if not hh:
        return None
    return simulate_for(hh, moves=moves, shock_amount=shock_amount, salary_delay_days=salary_delay_days,
                        cut_per_day=cut_per_day, purchase=purchase)


def simulate_for(hh: dict, moves=None, shock_amount: int = 0, salary_delay_days: int = 0, cut_per_day: int = 0,
                 purchase: dict | None = None) -> dict:
    """Scenario branch. Returns the after-river plus the before figures on the same baseline and horizon,
    the responses that would (or would not) close a shortfall, loan terms, and goal impact."""
    base_ctx = compute(hh)
    base = base_ctx["cash"]

    extra: list[dict] = []
    loan = None
    purchase_out = None
    if purchase:
        amount, pay = int(purchase["amount"]), purchase.get("pay", "cash")
        if pay == "loan":
            loan = e17.loan_terms(amount, purchase.get("loan"))
        extra = e17.purchase_events(hh["as_of"], amount, pay, loan)
        purchase_out = {"amount": amount, "pay": pay}

    kwargs = dict(moves=moves, shock_amount=shock_amount or 0, salary_delay_days=salary_delay_days or 0,
                  cut_per_day=cut_per_day or 0, extra=extra)
    scen = e03.run(hh, **kwargs)
    ess_p = max(0, P(hh["essentials_per_day"]) - P(cut_per_day or 0))
    emergency_p = sum(P(j["saved"]) for j in hh["jars_live"] if j["kind"] == "emergency")
    idle_p = sum(a["balance_p"] for a in base_ctx["norm"]["idle_accounts"])
    spend_now_p = P(abs(shock_amount or 0)) + sum(-P(x["amount"]) for x in extra if x["date"] == iso(add_days(d(hh["as_of"]), 1)))
    liquid_p = P(hh["closing_balance"]) - spend_now_p + idle_p + emergency_p + P(hh.get("declared_cash") or 0)
    res = e05.resilience_days(liquid_p, ess_p, base_ctx["norm"]["fixed_monthly_p"])
    gap_before, gap_after = R(base["gap_p"]), R(scen["gap_p"])

    out = {"river": scen["river"], "resilience_days": res, "gap_before": gap_before, "gap_after": gap_after,
           "message": scenario_message(hh, base, scen, moves or [], shock_amount or 0, salary_delay_days or 0,
                                       cut_per_day or 0, res),
           "scenario": True,
           # before, on the same baseline and horizon
           "resilience_before": base_ctx["resilience_days"],
           "min_balance_before": base["river"]["min_balance"], "min_date_before": base["river"]["min_date"],
           "first_deficit_date_before": base["first_deficit"]["date"] if base["first_deficit"] else None,
           "first_deficit_date": scen["first_deficit"]["date"] if scen["first_deficit"] else None,
           "conditional": [e03.event_out(e) for e in scen["events"] if e.get("moved")]}

    if loan is not None:
        out["loan"] = loan
        if loan["complete"]:
            before, after = e17.debt_load_after(base_ctx["norm"]["emi_monthly_p"], base_ctx["norm"]["monthly_income_p"], loan["emi"])
            loan.update(debt_per100_before=before, debt_per100_after=after, first_emi=e17.first_emi_date(hh["as_of"]),
                        debt_status_after=e04.debt_status(after, False) if after is not None else None)
            out["message"] = L(
                f"EMI {inr(loan['emi'])} har mahine, {loan['months']} mahine. Kul {inr(loan['total_cost'])} denge — "
                f"daam se {inr(loan['extra_over_price'])} zyada (har ₹100 par ₹{loan['extra_per_100']}).",
                f"EMI of {inr(loan['emi'])} a month for {loan['months']} months. You pay {inr(loan['total_cost'])} in all — "
                f"{inr(loan['extra_over_price'])} more than the price (₹{loan['extra_per_100']} on every ₹100).")
        else:
            out["message"] = L("Kul kharcha batane ke liye loan ki poori sharten chahiye.",
                               "Total cost needs full loan terms.")
    if purchase_out:
        out["purchase"] = purchase_out

    if scen["gap_p"] > 0 and not (loan is not None and not loan["complete"]):
        r = e17.responses(hh, kwargs, scen)
        out["responses"], out["feasible"] = r["responses"], r["feasible"]
        g = next((x for x in r["responses"] if x["kind"] == "gullak"), None)
        if g:
            needed = R(max(0, -scen["low_before_income"]["balance_p"]))
            gi = e17.goal_impact(hh, g["jar_id"], needed)
            if gi:
                out["goal_impact"] = gi
    return out


def scenario_message(hh, base, scen, moves, shock, delay, cut, res) -> dict:
    gb, ga = R(base["gap_p"]), R(scen["gap_p"])
    fg = R(scen["floor_gap_p"])
    moved = [e for e in scen["events"] if e.get("moved")]
    is_fee = any(e["type"] == "fee" for e in moved)
    what_hi = "Fee aage badhane" if is_fee else ("Tareekh badalne" if moved else "Is badlav")
    what_en = "Moving the fee" if is_fee else ("Moving the date" if moved else "This change")
    before_hi = "salary se pehle" if any(e["type"] == "salary" for e in scen["events"]) else "agli kamai se pehle"
    before_en = "before salary" if before_hi.startswith("salary") else "before your next income"
    hi, en = [], []
    if shock:
        hi.append(f"{inr(shock)} ke achanak kharch se")
        en.append(f"With a sudden {inr(shock)} expense,")
    if delay:
        hi.append(f"salary {delay} din der se aane par")
        en.append(f"with salary {delay} days late,")
    if cut:
        hi.append(f"roz {inr(cut)} kam kharch karke")
        en.append(f"cutting {inr(cut)} a day,")
    lead_hi = (" ".join(hi) + " ") if hi else ""
    lead_en = (" ".join(en) + " ") if en else ""

    if gb > 0 and ga == 0:
        s_hi = f"{what_hi} se {inr(gb)} ki kami khatam." if not hi else f"{lead_hi}{inr(gb)} ki kami khatam."
        s_en = f"{what_en} removes the {inr(gb)} shortfall." if not en else f"{lead_en[:1].upper() + lead_en[1:]}the {inr(gb)} shortfall is gone."
    elif ga > 0:
        fd = scen["first_deficit"]
        day = d(fd["date"]).day
        s_hi = f"{lead_hi}{day} tareekh ko {inr(ga)} kam padenge. Bina aamdani {res} din chal payenge."
        s_en = f"{(lead_en[:1].upper() + lead_en[1:]) if lead_en else ''}you'll be {inr(ga)} short on {_fmt_day(fd['date'])}. You can last {res} days without income."
        s_en = s_en[:1].upper() + s_en[1:]
        return L(s_hi, s_en)
    else:
        s_hi = f"{lead_hi}koi din minus mein nahi jaata."
        s_en = f"{lead_en}no day goes below zero."
        s_hi, s_en = s_hi[:1].upper() + s_hi[1:], s_en[:1].upper() + s_en[1:]
    if fg > 0:
        s_hi += f" Par {before_hi} {inr(fg)} safety floor se kam rahega — 5 din ₹200 kam kharch karein ya Gullak use karein."
        s_en += f" But {before_en} you'll be {inr(fg)} below the safety floor — spend ₹200 less for 5 days or use the Gullak."
    else:
        s_hi += f" Safety floor ({inr(R(scen['floor_p']))}) bhi surakshit hai."
        s_en += f" Your safety floor ({inr(R(scen['floor_p']))}) stays safe too."
    return L(s_hi, s_en)
