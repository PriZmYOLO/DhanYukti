"""E03 — the ONE shared cash-flow simulator (used by dashboard AND simulate).

Projects end-of-day balance for `days` days starting at as_of (day 0 = as_of closing balance).
Within a day, money moves in this order:
  1. essentials (per-day, minus any cut)
  2. scheduled debits that were NOT moved by the user
  3. credits (salary / gig) — a salary credit lands at end of day, after normal debits
  4. debits the user MOVED onto this day (so a bill moved to salary day is paid after the credit)
All money is integer paise internally; `river_out` converts to contract rupees.
"""
from __future__ import annotations

import copy

from app.engines.common import L, P, R, add_days, d, iso

INCOME_TYPES = ("salary", "gig")


def build_events(upcoming: list[dict], as_of: str, *, moves: list[dict] | None = None, shock_amount: int = 0,
                 salary_delay_days: int = 0, extra: list[dict] | None = None) -> list[dict]:
    """Scenario branch of the event list (never mutates input). Amounts in rupees in, paise out.

    `extra` adds scenario-only events (a purchase, a loan's processing fee or EMIs), same shape as
    `upcoming`. A moved event keeps its `original_date`: moving a bill is a request to the payee,
    so the scenario never treats the new date as agreed.
    """
    evs = []
    move_map = {m["event_id"]: m["new_date"] for m in (moves or [])}
    for e in copy.deepcopy(upcoming):
        e["paise"] = P(e["amount"])
        e["moved"] = False
        if e["id"] in move_map and move_map[e["id"]] != e["date"]:
            e["original_date"] = e["date"]
            e["date"] = move_map[e["id"]]
            e["moved"] = True
        if salary_delay_days and e["type"] == "salary":
            e["date"] = iso(add_days(d(e["date"]), int(salary_delay_days)))
        evs.append(e)
    if shock_amount:
        evs.append({"id": "shock", "date": iso(add_days(d(as_of), 1)), "type": "bill",
                    "label": L("Achanak kharch", "Unexpected expense"), "amount": -abs(int(shock_amount)),
                    "paise": -P(abs(int(shock_amount))), "movable": False, "moved": False, "scenario": True})
    for x in copy.deepcopy(extra or []):
        x["paise"] = P(x["amount"])
        x.setdefault("moved", False)
        x.setdefault("movable", False)
        x["scenario"] = True
        evs.append(x)
    return evs


def simulate(opening_p: int, as_of: str, events: list[dict], essentials_per_day_p: int, *,
             cut_per_day_p: int = 0, days: int = 30) -> list[dict]:
    """Return [{date, balance_p, events:[...]}] for `days` days, day 0 = as_of."""
    start = d(as_of)
    by_date: dict[str, list[dict]] = {}
    for e in events:
        by_date.setdefault(e["date"], []).append(e)
    bal = opening_p
    out = [{"date": as_of, "balance_p": bal, "events": []}]
    burn = max(0, essentials_per_day_p - max(0, cut_per_day_p))
    for i in range(1, days):
        day = iso(add_days(start, i))
        todays = by_date.get(day, [])
        bal -= burn
        for e in todays:
            if e["paise"] < 0 and not e.get("moved"):
                bal += e["paise"]
        for e in todays:
            if e["paise"] > 0:
                bal += e["paise"]
        for e in todays:
            if e["paise"] < 0 and e.get("moved"):
                bal += e["paise"]
        out.append({"date": day, "balance_p": bal, "events": todays})
    return out


def first_deficit(series: list[dict]) -> dict | None:
    for s in series:
        if s["balance_p"] < 0:
            return s
    return None


def next_income_date(events: list[dict], as_of: str, income_type: str) -> str | None:
    """Next salary date; for gig households there is no payday, so use a 14-day window."""
    sal = sorted(e["date"] for e in events if e["type"] == "salary" and e["date"] > as_of)
    if sal:
        return sal[0]
    return iso(add_days(d(as_of), 14))


def lowest_before(series: list[dict], before: str) -> dict:
    cands = [s for s in series if s["date"] < before] or series[:1]
    return min(cands, key=lambda s: (s["balance_p"], s["date"]))


def gap_p(series: list[dict]) -> int:
    """Shortfall on the first day the balance goes below zero (0 if never).

    NOTE: we report the gap on the FIRST deficit day (e.g. ₹3,000 on 28 Sep for household A),
    which is the amount the family must arrange for the bill that causes the deficit.
    `min_balance` still reports the true lowest point (which may be deeper because
    essentials keep running). See README "Contract notes".
    """
    fd = first_deficit(series)
    return -fd["balance_p"] if fd else 0


def event_out(e: dict) -> dict:
    out = {"id": e["id"], "type": e["type"], "label": e["label"], "amount": R(e["paise"]),
           "movable": bool(e.get("movable", False))}
    if e.get("scenario"):
        out["scenario"] = True
    elif e.get("certainty"):
        out["certainty"] = e["certainty"]
        if e.get("basis"):
            out["basis"] = e["basis"]
    if e.get("series"):
        out["series"] = e["series"]
    if e.get("biller"):
        out["biller"] = True   # date and amount from the biller itself (Perfios Hub, with consent)
    if e.get("checked"):
        # the member's own word on this payment: "confirmed" as seen, or "corrected" by them
        out["checked"] = e["checked"]
    if e.get("moved"):
        # Moving a bill is only a request: the payee has not agreed, so the original date still stands.
        out["moved"] = True
        out["original_date"] = e["original_date"]
        out["needs"] = L(f"{e['contact']} ki haan", f"{e['contact']} to agree") if e.get("contact") \
            else L("Jisko paisa dena hai unki haan", "The payee to agree")
    return out


def river_out(series: list[dict], floor_p: int) -> dict:
    low = min(series, key=lambda s: (s["balance_p"], s["date"]))
    return {
        "floor": R(floor_p),
        "days": [{"date": s["date"], "balance": R(s["balance_p"]), "events": [event_out(e) for e in s["events"]]}
                 for s in series],
        "min_balance": R(low["balance_p"]),
        "min_date": low["date"],
        "gap": R(gap_p(series)),
    }


def run(hh: dict, *, moves=None, shock_amount: int = 0, salary_delay_days: int = 0, cut_per_day: int = 0,
        extra: list[dict] | None = None, opening_extra: int = 0, days: int = 30) -> dict:
    """Convenience wrapper over a household dict. Returns series + helpers (paise).

    `opening_extra` (rupees) adds money to today's balance, e.g. breaking a Gullak.
    """
    as_of = hh["as_of"]
    events = build_events(hh["upcoming"], as_of, moves=moves, shock_amount=shock_amount,
                          salary_delay_days=salary_delay_days, extra=extra)
    series = simulate(P(hh["closing_balance"]) + P(opening_extra), as_of, events, P(hh["essentials_per_day"]),
                      cut_per_day_p=P(cut_per_day or 0), days=days)
    nid = next_income_date(events, as_of, hh.get("income_type", "salary"))
    low_before = lowest_before(series, nid)
    floor_p = P(hh["safety_floor"])
    return {
        "events": events,
        "series": series,
        "next_income_date": nid,
        "low_before_income": low_before,
        "floor_p": floor_p,
        "floor_gap_p": max(0, floor_p - low_before["balance_p"]),
        "gap_p": gap_p(series),
        "first_deficit": first_deficit(series),
        "river": river_out(series, floor_p),
    }
