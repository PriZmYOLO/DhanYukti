"""E13 — priority engine. Turns engine outputs into ranked "needs".

Tiers:
  1 Act now : cash deficit within 14 days; predatory app lender in use
  2 Protect : protected obligation lands on a deficit day (merged into the tier-1 deficit card
              when one exists); main earner has no life cover
  3 Build   : resilience < 30 days; penalties > ₹200 in 3 months
  4 Grow    : idle surplus
Within a tier, the earliest date of harm wins; ties broken by a fixed kind order.
"""
from __future__ import annotations

from app.engines.common import P, add_days, d, iso

KIND_ORDER = {"deficit": 0, "protected_obligation": 1, "lender": 2, "protect_earner": 3,
              "penalties": 4, "resilience": 5, "grow": 6}
IDLE_MIN_P = P(10000)


def needs(ctx: dict) -> list[dict]:
    as_of = ctx["as_of"]
    horizon14 = iso(add_days(d(as_of), 14))
    out: list[dict] = []
    cash = ctx["cash"]

    fd = cash["first_deficit"]
    if fd and fd["date"] <= horizon14:
        out.append({"kind": "deficit", "tier": 1, "harm_date": fd["date"], "severity": "red"})
    elif fd:
        # deficit exists but beyond 14 days: protected obligation on deficit day -> tier 2
        prot = [e for e in fd["events"] if e.get("protected") and e["paise"] < 0]
        if prot:
            out.append({"kind": "protected_obligation", "tier": 2, "harm_date": fd["date"], "severity": "amber"})

    risky = [x for x in ctx["lenders"] if x["_risky"]]
    if risky:
        harm = fd["date"] if fd else iso(add_days(d(as_of), 30))
        out.append({"kind": "lender", "tier": 1, "harm_date": harm, "severity": "red", "lenders": risky})

    prot = ctx["protection"]
    main_uncovered = [m for m in prot["uncovered_earners"] if m.get("main_earner")]
    if main_uncovered:
        out.append({"kind": "protect_earner", "tier": 2, "harm_date": iso(add_days(d(as_of), 30)),
                    "severity": "red" if prot["sole_earner"] else "amber", "member": main_uncovered[0]})

    if ctx["norm"]["penalty_3m_p"] > P(200):
        out.append({"kind": "penalties", "tier": 3, "harm_date": iso(add_days(d(as_of), 7)), "severity": "amber"})

    if ctx["resilience_days"] < 30:
        out.append({"kind": "resilience", "tier": 3, "harm_date": iso(add_days(d(as_of), 30)),
                    "severity": "red" if ctx["resilience_days"] < 7 else "amber"})

    idle_p = sum(a["balance_p"] for a in ctx["norm"]["idle_accounts"])
    if idle_p >= IDLE_MIN_P and not fd:
        out.append({"kind": "grow", "tier": 4, "harm_date": iso(add_days(d(as_of), 90)), "severity": "green",
                    "idle_p": idle_p})

    out.sort(key=lambda n: (n["tier"], n["harm_date"], KIND_ORDER[n["kind"]]))
    return out
