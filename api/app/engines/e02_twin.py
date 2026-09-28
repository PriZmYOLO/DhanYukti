"""E02 — Household Twin from a member's OWN bank data (live Account Aggregator fetch).

The fixtures (A/B/C) carry a hand-written household. A linked member's household is built here
from what their bank sent, so every engine (E03–E17) runs on their numbers, not a demo family's.

Compute-then-delete: the input is the decrypted statement (held for at most 24 hours by the
caller). The twin returned keeps only derived facts: E01's figures, the income/obligation rows
that are the evidence for those figures, projected upcoming dates, and last month's spend
buckets (top 3 rows each). Everyday purchases (groceries, cash, shopping) are summarised into
"essentials per day" and then dropped.

Honesty rules (same as the rest of the engines):
  - Unknown is not zero. No balance → no cash river; fewer than 1 complete month → income unknown.
  - A projected date is "pakka" only when bank data shows it on the same day in 3+ months (E17).
  - Nothing here is copied from a demo household.
"""
from __future__ import annotations

import re
import statistics
from calendar import monthrange
from datetime import date, timedelta

from app.engines import e17_whatif as e17
from app.engines.common import L, P, R, d, iso
from app.engines.e01_normalise import full_months_before, normalise

HORIZON_DAYS = 45                 # project a little past the 30-day river
OBLIGATION_KINDS = ("emi", "rent", "bill", "fee", "premium", "saving")
INCOME_KINDS = ("salary", "gig", "cash_income")
EVIDENCE_KINDS = set(OBLIGATION_KINDS) | set(INCOME_KINDS) | {"penalty", "app_loan_disbursal", "app_loan_repay"}
EVERYDAY_KINDS = ("grocery", "cash", "other", "medical", "fuel")
EVENT_TYPE = {"salary": "salary", "gig": "gig", "cash_income": "gig", "emi": "emi", "rent": "rent", "bill": "bill",
              "fee": "fee", "premium": "premium", "saving": "bill"}
KIND_WORD = {
    "salary": L("Salary", "Salary"), "gig": L("Kamai", "Payout"), "cash_income": L("Cash jama", "Cash deposit"),
    "emi": L("EMI", "EMI"), "rent": L("Kiraya", "Rent"), "bill": L("Bill", "Bill"), "fee": L("Fee", "Fee"),
    "premium": L("Bima premium", "Insurance premium"), "saving": L("Bachat kist", "Savings instalment"),
}
PROTECTED = {"emi", "rent", "bill", "fee", "premium"}
_PREFIX = re.compile(r"^(UPI|NEFT|IMPS|RTGS|ACH|NACH|BBPS|ECS|POS|MMT|INB|CR|DR|TRF|TO|BY)\b[\s/:-]*")
_NOISE = re.compile(r"\b(UPI|NEFT|IMPS|RTGS|ACH|NACH|BBPS|ECS|DR|CR|PVT|LTD|LIMITED|INDIA|REF|TXN|PAYMENT|PAY)\b")


# ----------------------------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------------------------
def payee_key(narration: str) -> str:
    """A stable name for who was paid / who paid, from a bank narration."""
    s = (narration or "").upper()
    for _ in range(3):
        s = _PREFIX.sub("", s)
    s = re.sub(r"[A-Z]*\d[\w]*", " ", s)      # refs, account numbers, dates
    s = _NOISE.sub(" ", s)
    s = re.sub(r"[^A-Z ]+", " ", s)
    words = [w for w in s.split() if len(w) > 1]
    return " ".join(words[:4]) or "UNKNOWN"


def _title(key: str) -> str:
    return " ".join(w.capitalize() for w in key.split())


def _label(kind: str, key: str) -> dict:
    word = KIND_WORD[kind]
    name = _title(key)
    if word["en"].split()[0].upper() in key:
        return L(name, name)
    return L(f"{word['hi']}: {name}", f"{word['en']}: {name}")


def _month_idx(x: date) -> int:
    return x.year * 12 + x.month - 1


def _on_day(m0: int, day: int) -> date:
    """Day-of-month `day` (clamped) in month index m0 (year*12 + month-1)."""
    y, m = divmod(m0, 12)
    return date(y, m + 1, min(day, monthrange(y, m + 1)[1]))


def _round_to(n: float, step: int) -> int:
    return int(-(-n // step) * step) if n > 0 else 0


# ----------------------------------------------------------------------------------------------
# upcoming dates projected from the member's own payments
# ----------------------------------------------------------------------------------------------
def project_upcoming(rows: list[dict], as_of: str) -> list[dict]:
    """Recurring income and obligations, projected forward. Everyday spend is not projected here
    (it is essentials per day)."""
    as_of_d = d(as_of)
    until = as_of_d + timedelta(days=HORIZON_DAYS)
    groups: dict[tuple[str, str], list[dict]] = {}
    for r in rows:
        if r["kind"] in OBLIGATION_KINDS or r["kind"] in INCOME_KINDS:
            groups.setdefault((r["kind"], payee_key(r["narration"])), []).append(r)

    out: list[dict] = []
    for (kind, key), rs in groups.items():
        rs = sorted(rs, key=lambda r: r["date"])
        dates = [d(r["date"]) for r in rs]
        amounts = [r["amount"] for r in rs]
        months = sorted({_month_idx(x) for x in dates})
        per_month = len(rs) / max(1, len(months))

        if kind in ("gig", "cash_income") or per_month > 1.5:
            # irregular / several-a-month income: step by the typical gap over the last 90 days
            recent = [(x, a) for x, a in zip(dates, amounts) if (as_of_d - x).days <= 90]
            if len(recent) < 3 or kind not in INCOME_KINDS:
                continue
            gaps = [(b[0] - a[0]).days for a, b in zip(recent, recent[1:]) if (b[0] - a[0]).days > 0]
            if not gaps:
                continue
            step = max(3, round(statistics.median(gaps)))
            amt = round(statistics.median(a for _, a in recent[-6:]))
            nxt = recent[-1][0] + timedelta(days=step)
            while nxt <= as_of_d:
                nxt += timedelta(days=step)
            k = 0
            while nxt <= until and k < 12:
                out.append(_event(kind, key, nxt, amt, rs))
                nxt += timedelta(days=step)
                k += 1
            continue

        if len(months) < 2:
            continue  # seen once: can't call it recurring
        gaps = [b - a for a, b in zip(months, months[1:])]
        cadence = round(statistics.median(gaps))
        if cadence not in (1, 2, 3, 6, 12):
            continue
        if _month_idx(as_of_d) - months[-1] > cadence + 1:
            continue  # stopped
        day = round(statistics.median(x.day for x in dates[-3:]))
        amt = round(statistics.median(amounts[-3:]))
        m0 = months[-1] + cadence
        while _on_day(m0, day) <= as_of_d:
            m0 += cadence
        while (nx := _on_day(m0, day)) <= until:
            out.append(_event(kind, key, nx, amt, rs))
            m0 += cadence
    out.sort(key=lambda e: (e["date"], e["amount"] < 0))
    return out


def _event(kind: str, key: str, when: date, amount: int, seen: list[dict]) -> dict:
    slug = re.sub(r"[^a-z0-9]+", "_", key.lower()).strip("_")[:24] or "x"
    ev = {"id": f"{kind}_{slug}_{when.isoformat()}", "date": iso(when), "type": EVENT_TYPE[kind],
          "label": _label(kind, key), "amount": int(amount), "movable": kind == "fee", "_kind": kind}
    if kind in PROTECTED:
        ev["protected"] = True
    if kind == "fee":
        ev["contact"] = _title(key)
    return ev


# ----------------------------------------------------------------------------------------------
# essentials, floor, income window
# ----------------------------------------------------------------------------------------------
def essentials_per_day(rows: list[dict], as_of: str, data_from: str) -> tuple[int | None, dict]:
    """Median month of everyday spend (groceries, cash, medicine, fuel, other) ÷ days in month."""
    months = covered_full_months(as_of, data_from)
    per_day = []
    for m in months:
        y, mo = int(m[:4]), int(m[5:])
        total = -sum(r["amount"] for r in rows if r["date"].startswith(m) and r["amount"] < 0 and r["kind"] in EVERYDAY_KINDS)
        per_day.append(total / monthrange(y, mo)[1])
    if per_day:
        v = _round_to(statistics.median(per_day), 10)
        return v, L(f"Pichhle {len(per_day)} poore mahino ka roz ka kharch (ration, cash, dawai, anya) — beech ka mahina",
                    f"Everyday spend (groceries, cash, medicine, other) in the last {len(per_day)} full months — the middle month")
    days = max(1, (d(as_of) - d(data_from)).days)
    total = -sum(r["amount"] for r in rows if r["amount"] < 0 and r["kind"] in EVERYDAY_KINDS)
    if total <= 0:
        return None, L("Roz ka kharch bank data mein nahi dikha", "No everyday spend seen in bank data")
    return _round_to(total / days, 10), L(f"Sirf {days} din ka data — andaaza", f"Only {days} days of data — an estimate")


def covered_full_months(as_of: str, data_from: str, n: int = 3) -> list[str]:
    return [m for m in full_months_before(d(as_of), n) if f"{m}-01" >= data_from]


def _rescale(by_month_p: dict[str, int], months: list[str]) -> int | None:
    if not months:
        return None
    return sum(by_month_p.get(m, 0) for m in months) // len(months)


# ----------------------------------------------------------------------------------------------
# members from onboarding answers (what the member told us; skipped = unknown)
# ----------------------------------------------------------------------------------------------
def _count(ans: dict | None, *path: str) -> int | None:
    node = ans or {}
    for p in path:
        node = node.get(p, {}) if isinstance(node, dict) else {}
    return int(node["value"]) if isinstance(node, dict) and node.get("state") == "answered" else None


def build_members(profile: dict, has_income: bool) -> list[dict]:
    ans = profile.get("answers")
    first = (profile.get("first_name") or "").strip().title() or None
    unknown_cover = L("Bank data mein bima premium nahi dikha — pata nahi", "No insurance premium seen in bank data — unknown")
    me = {"id": "me", "name": first or "Aap", "role": L("Aap (khaata aapka)", "You (account holder)"),
          "earner": has_income, "main_earner": has_income, "sharing": "poora", "avatar": "woman",
          "account_holder": True, "cover": {"life": None, "health": None, "note": unknown_cover}}
    if profile.get("age"):
        me["age"] = int(profile["age"])
    members = [me]
    extra_earners = max(0, (_count(ans, "earners") or 0) - (1 if has_income else 0))
    for i in range(min(extra_earners, 3)):
        members.append({"id": f"earner{i + 2}", "name": f"Kamaane wale {i + 2}", "role": L("Kamaane wale (khaata nahi juda)", "Earner (account not linked)"),
                        "earner": True, "sharing": "private", "avatar": "man",
                        "cover": {"life": None, "health": None, "note": L("Inka data nahi juda — pata nahi", "Their data isn't linked — unknown")}})
    kids = _count(ans, "dependents", "children") or 0
    in_school = _count(ans, "dependents", "children_in_school") or 0
    for i in range(min(kids, 4)):
        members.append({"id": f"child{i + 1}", "name": f"Bachcha {i + 1}",
                        "role": L("Bachcha, school mein" if i < in_school else "Bachcha", "Child, in school" if i < in_school else "Child"),
                        "earner": False, "sharing": "private", "avatar": "girl" if i % 2 else "boy",
                        "cover": {"life": None, "health": None, "note": L("Pata nahi", "Unknown")}})
    for i in range(min(_count(ans, "dependents", "elders") or 0, 2)):
        members.append({"id": f"elder{i + 1}", "name": f"Buzurg {i + 1}", "role": L("Buzurg (60+)", "Elder (60+)"),
                        "earner": False, "sharing": "private", "avatar": "elder_woman" if i == 0 else "elder_man",
                        "cover": {"life": None, "health": None, "note": L("Pata nahi", "Unknown")}})
    return members


def fresh_state(twin: dict) -> dict:
    """A new member's own jars and game: nothing carried over from any demo household."""
    ess = twin["essentials_per_day"] or 0
    goal = max(1000, _round_to(ess * 30, 500)) if ess else 5000
    target = iso(d(twin["as_of"]) + timedelta(days=180))
    name = twin["members"][0]["name"]
    return {
        "overlays": {},
        "jars": [{"id": "emergency", "name": L("Emergency Gullak", "Emergency jar"), "goal": goal, "saved": 0,
                  "kind": "emergency", "target_date": target}],
        "open_actions": [],
        "game": {"points": 0, "streak": 0, "streak_shield": 0, "badges_earned": [],
                 "mission": {"title": L("Is mahine ₹500 Gullak mein", "₹500 into the Gullak this month"), "progress": 0, "target": 500},
                 "leaderboard": [{"member_id": "me", "name": name, "habits": 0, "streak": 0}],
                 "ledger": [], "last_checkin": None, "checkins": []},
    }


# ----------------------------------------------------------------------------------------------
# build
# ----------------------------------------------------------------------------------------------
def build(payload: dict) -> dict:
    """{as_of, fetched_at, sandbox, accounts:[{id, masked, fip, type, balance, transactions:[...]}], profile}
    → {status: "ready"|"insufficient", missing: [L], twin?: {...}, state?: {...}}"""
    as_of = payload["as_of"]
    accounts = [a for a in payload.get("accounts", []) if (a.get("fi_type") or "DEPOSIT") == "DEPOSIT"]
    txns: list[dict] = []
    for a in accounts:
        for t in a.get("transactions", []):
            if t.get("amount") is None or not t.get("date") or t["date"] > as_of:
                continue
            txns.append({"date": t["date"], "narration": t.get("narration") or "", "amount": float(t["amount"]),
                         "account": a["id"], "source": "aa"})
    txns.sort(key=lambda t: (t["date"], t["amount"] < 0))
    balances = [a.get("balance") for a in accounts]
    known = [b for b in balances if b is not None]

    missing = []
    if not txns:
        missing.append(L("Savings khaate ka len-den nahi aaya", "No savings account transactions came through"))
    if not known:
        missing.append(L("Khaate ka balance nahi aaya", "The account balance didn't come through"))
    if missing:
        return {"status": "insufficient", "missing": missing}

    data_from = txns[0]["date"]
    norm = normalise(txns, as_of, [])
    rows = norm["rows"]
    for r in rows:
        r["amount"] = R(r["paise"])

    # E01 averages over 3 full months; a shorter window must not be divided by 3.
    months = covered_full_months(as_of, data_from)
    income_by_month = norm["income_by_month_p"]
    emi_by_month: dict[str, int] = {}
    fixed_by_month: dict[str, int] = {}
    for r in rows:
        m = r["date"][:7]
        if r["kind"] == "emi":
            emi_by_month[m] = emi_by_month.get(m, 0) - r["paise"]
        if r["kind"] in ("emi", "rent", "bill"):
            fixed_by_month[m] = fixed_by_month.get(m, 0) - r["paise"]
    income_p = _rescale(income_by_month, months)
    norm["monthly_income_p"] = income_p or 0
    norm["emi_monthly_p"] = _rescale(emi_by_month, months) or 0
    norm["fixed_monthly_p"] = _rescale(fixed_by_month, months) or 0
    norm["income_known"] = income_p is not None
    norm["months_covered"] = len(months)

    upcoming = project_upcoming(rows, as_of)
    e17.annotate_certainty(upcoming, [{"date": r["date"], "amount": r["amount"], "source": "aa"} for r in rows])
    for e in upcoming:
        e.pop("_kind", None)

    ess, ess_basis = essentials_per_day(rows, as_of, data_from)
    floor = max(1000, _round_to((ess or 0) * 7, 500))
    has_income = bool(norm["salary_rows"] or norm["gig_rows"] or norm["cash_income_rows"])
    income_type = "salary" if norm["salary_months"] >= 2 else ("gig" if has_income else "salary")
    if norm["salary_months"] >= 2 and (norm["gig_rows"] or norm["cash_income_rows"]):
        income_type = "dual"

    profile = payload.get("profile") or {}
    members = build_members(profile, has_income)
    first = members[0]["name"]
    fam = L(f"{first} ka parivaar", f"{first}'s family") if first != "Aap" else L("Aapka parivaar", "Your family")

    # spend donut for last full month, then drop everyday rows (compute-then-delete)
    from app import pipeline  # late import: pipeline does not import this module
    spend = pipeline.spend_from_norm(norm, as_of)
    norm["rows"] = [r for r in rows if r["kind"] in EVIDENCE_KINDS]
    norm["own_transfers"] = []

    twin = {
        "id": "me", "version": 1, "as_of": as_of, "fetched_at": payload.get("fetched_at"),
        "family_name": fam, "primary_user": "me", "city": L("—", "—"),
        "income_type": income_type, "literacy_mode": profile.get("literacy_mode") or "saathi",
        "language": profile.get("language") or "hi", "members": members,
        "accounts": [{"id": a["id"], "masked": a.get("masked") or "", "fip": a.get("fip") or "", "type": a.get("type") or "SAVINGS",
                      "balance": a.get("balance"), "operational": True} for a in accounts],
        "closing_balance": round(sum(known)), "balance_partial": len(known) < len(balances),
        "safety_floor": floor,
        "essentials_per_day": ess or 0, "essentials_basis": ess_basis, "essentials_known": ess is not None,
        "upcoming": upcoming, "transactions": [],
        "data_window": {"from": data_from, "to": as_of, "full_months": len(months)},
        "sandbox": bool(payload.get("sandbox")),
        "_norm": norm, "_spend": spend,
    }
    return {"status": "ready", "missing": [], "twin": twin, "state": fresh_state(twin)}
