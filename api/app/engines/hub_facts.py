"""Perfios Hub lookups -> the few derived facts DhanYukti keeps, and how the engines use them.

`derive(kind, result, as_of)` runs once, right after a lookup the member asked for. It keeps only
what changes a decision and drops everything that identifies a person: no names, addresses, phone
numbers, e-mails, photos, chassis/engine/policy numbers, bill numbers or Aadhaar fragments. IDs the
member typed are kept masked (last 4) so they can recognise the record.

`apply_hub(hh, hub)` layers the derived facts onto the member's twin (a copy), after the bank data
and what they told us:
  - electricity / gas: the biller's due date and amount replace our projection of that bill
    ("pakka", basis: the biller), or add the bill if the bank never showed it;
  - EPF: PF is locked retirement savings — shown, never counted as spendable; an active EPF member
    has EDLI life cover (up to ₹7 lakh, only while contributions continue);
  - ration card: an AAY / priority card is a pointer to check Ayushman (PM-JAY) eligibility;
  - vehicle (RC + e-challans) and driving licence: insurance / PUC / licence dates and unpaid fines
    become tasks (E13/E14). Motor third-party insurance is compulsory by law.
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta

from app.engines.common import L, d, inr, iso

KINDS = ("electricity", "png", "ration", "epf", "rc", "challan", "dl")
HORIZON_DAYS = 45
EDLI_MAX = 700000          # EDLI Scheme 1976: max assurance ₹7 lakh (min ₹2.5 lakh after 12 months' service)
EDLI_ACTIVE_MONTHS = 3     # a contribution within this many months = still an active EPF member

BILLER = L("Biller ne pakka kiya (Perfios Hub)", "Confirmed by the biller (Perfios Hub)")
ELEC_WORDS = ("ELECTRIC", "BIJLI", "POWER", "VIDYUT", "ENERGY", "DISCOM", "BESCOM", "MSEDCL", "MAHAVITARAN", "BSES",
              "TORRENT", "TATA POWER", "ADANI ELEC", "TNEB", "TANGEDCO", "KSEB", "UHBVN", "DHBVN", "PSPCL", "CESC",
              "WBSEDCL", "JBVNL", "UPPCL", "BEST", "VIJ", "VITRAN")
GAS_WORDS = ("GAS", "PNG", "IGL", "MGL", "INDRAPRASTHA", "MAHANAGAR", "GAIL")

PNG_PROVIDERS = {"AG": "Adani Gas", "IG": "Indraprastha Gas", "MG": "Mahanagar Gas", "GAIL": "GAIL Gas",
                 "GJ": "Gujarat Gas"}
PRIORITY_SCHEMES = {"AAY", "PHH", "BPL", "SPHH", "PHH-SFSS"}

_MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


# ----------------------------------------------------------------------------------------------
# parsing helpers (the Hub returns strings: "28-09-2026", "13-Mar-2024", "2025-02-15 17:54:41")
# ----------------------------------------------------------------------------------------------
def parse_date(s) -> str | None:
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    if s.upper() in ("NA", "N/A", "NULL", "-", "NOT AVAILABLE"):
        return None
    for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            pass
    m = re.match(r"^(\d{1,2})[-/ ]([A-Za-z]{3})[A-Za-z]*[-/ ](\d{4})", s)
    if m and m.group(2).lower() in _MONTHS:
        try:
            return date(int(m.group(3)), _MONTHS[m.group(2).lower()], int(m.group(1))).isoformat()
        except ValueError:
            return None
    return None


def money(s) -> int | None:
    if s is None or isinstance(s, bool):
        return None
    if isinstance(s, (int, float)):
        return int(round(s))
    t = re.sub(r"[^0-9.\-]", "", str(s))
    try:
        return int(round(float(t))) if t not in ("", "-", ".") else None
    except ValueError:
        return None


def mask(s) -> str:
    s = re.sub(r"\s+", "", str(s or ""))
    return ("•" * min(6, max(0, len(s) - 4))) + s[-4:] if s else ""


def _blank(v) -> bool:
    return v is None or str(v).strip().upper() in ("", "NA", "N/A", "NULL", "NONE", "NOT AVAILABLE")


# ----------------------------------------------------------------------------------------------
# derive: raw Hub result -> derived facts (what we keep)
# ----------------------------------------------------------------------------------------------
def derive(kind: str, result, *, as_of: str, entered: dict | None = None) -> dict:
    entered = entered or {}
    r = result if isinstance(result, dict) else {}
    base = {"kind": kind, "fetched_on": as_of, "source": "perfios_hub"}
    if kind == "electricity":
        due = money(r.get("amount_payable"))
        if due is None:
            due = money(r.get("total_amount")) or money(r.get("bill_amount"))
        return {**base, "provider": str(entered.get("board") or "")[:24], "consumer": mask(entered.get("consumer_no")),
                "bill_amount": money(r.get("bill_amount")), "amount_due": due,
                "due_date": parse_date(r.get("bill_due_date")),
                "bill_date": parse_date(r.get("bill_issue_date")) or parse_date(r.get("bill_date"))}
    if kind == "png":
        prov = str(entered.get("provider") or "")[:8]
        return {**base, "provider": prov, "provider_name": PNG_PROVIDERS.get(prov, prov),
                "consumer": mask(entered.get("consumer_no") or entered.get("bp_no")),
                "bill_amount": money(r.get("Bill_Amount") or r.get("bill_amount")), "amount_due": money(r.get("Bill_Amount") or r.get("bill_amount")),
                "due_date": parse_date(r.get("Due_Date") or r.get("due_date")),
                "bill_date": parse_date(r.get("Bill_Date") or r.get("bill_date"))}
    if kind == "ration":
        scheme = str(r.get("schemeName") or "").strip().upper()[:12] or None
        return {**base, "scheme": scheme, "priority": scheme in PRIORITY_SCHEMES,
                "state": str(r.get("state") or "").strip().title()[:40] or None,
                "members": len(r.get("memberDetails") or []) or None, "card": mask(entered.get("card_no"))}
    if kind == "epf":
        ests = r.get("est_details") or []
        overall = r.get("overall_pf_balance") or {}
        last = None
        for e in ests:
            for p in e.get("passbook") or []:
                if str(p.get("db_cr_flag", "C")).upper() != "C":
                    continue
                dt = parse_date(p.get("tr_date_my")) or parse_date(p.get("approved_on"))
                if dt and (last is None or dt > last):
                    last = dt
        still_employed = any(_blank(e.get("doe_epf")) for e in ests)
        active = bool(last) and (d(as_of) - d(last)).days <= EDLI_ACTIVE_MONTHS * 31 or (still_employed and bool(ests))
        pf = money(overall.get("current_pf_balance"))
        if pf is None:
            pf = sum(money((e.get("pf_balance") or {}).get("net_balance")) or 0 for e in ests) or None
        return {**base, "pf_balance": pf, "pension_balance": money(overall.get("pension_balance")),
                "last_contribution": last[:7] if last else None, "active": bool(active),
                "establishments": len(ests), "uan": mask(entered.get("uan"))}
    if kind == "rc":
        fin = r.get("financier")
        klass = str(r.get("vehicleClassDescription") or "")[:48]
        permit = not _blank(r.get("nationalPermitNumber")) or not _blank(r.get("statePermitNumber"))
        commercial = permit or bool(re.search(r"GOODS|TAXI|CAB|TRANSPORT|MAXI|3WT|E-RICKSHAW|AUTO RICKSHAW|LGV|HGV|MGV", klass.upper()))
        return {**base, "reg": mask(entered.get("reg_no")), "vehicle_class": klass or None,
                "category": str(r.get("vehicleCatgory") or r.get("vehicleCategory") or "")[:12] or None,
                "insurance_upto": parse_date(r.get("insuranceUpto")), "puc_upto": parse_date(r.get("pucExpiryDate")),
                "fitness_upto": parse_date(r.get("fitnessUpto")), "tax_upto": parse_date(r.get("taxPaidUpto")),
                "financed": not _blank(fin), "commercial": commercial,
                "rc_status": str(r.get("rcStatus") or "")[:16] or None,
                "blacklisted": str(r.get("blackListStatus") or "NA").upper() not in ("NA", "", "NO", "N")}
    if kind == "challan":
        rows = result if isinstance(result, list) else (r.get("challans") or [])
        pending = [c for c in rows if isinstance(c, dict) and _challan_pending(c)]
        return {**base, "reg": mask(entered.get("reg_no")), "total": len(rows), "pending": len(pending),
                "pending_amount": sum(money(c.get("totalAmount")) or 0 for c in pending),
                "oldest_pending": min((parse_date(c.get("challanDate")) for c in pending if parse_date(c.get("challanDate"))), default=None)}
    if kind == "dl":
        v = r.get("validity") or {}
        return {**base, "dl": mask(entered.get("dl_no")), "status": str(r.get("status") or "")[:16] or None,
                "valid_nt": _range_end(v.get("nonTransport")), "valid_t": _range_end(v.get("transport")),
                "classes": [str(c.get("cov"))[:8] for c in (r.get("covDetails") or []) if isinstance(c, dict) and c.get("cov")][:8]}
    raise ValueError(kind)


def _challan_pending(c: dict) -> bool:
    st = str(c.get("status") or "").upper()
    if st in ("DISPOSED", "PAID", "CLOSED", "SETTLED"):
        return False
    return st in ("PENDING", "UNPAID", "OPEN") or _blank(c.get("paymentDateAndTime"))


def _range_end(s) -> str | None:
    if _blank(s):
        return None
    parts = re.split(r"\s+to\s+", str(s), flags=re.I)
    return parse_date(parts[-1])


def agent_view(result) -> dict:
    """IRDAI agent register lookup: shown to the member, never stored."""
    rows = result if isinstance(result, list) else ([result] if isinstance(result, dict) else [])
    out = []
    for a in rows[:6]:
        st = str(a.get("statusOfAgency") or "").strip()
        out.append({"name": re.sub(r"\s+", " ", str(a.get("agentName") or "")).strip().title()[:60],
                    "insurer": str(a.get("insurer") or "").strip()[:80], "insurer_type": str(a.get("insurerType") or "")[:20],
                    "status": st[:80], "active": bool(re.search(r"\b(active|valid|in force)\b", st, re.I)) and not re.search(r"in-?active|not active", st, re.I),
                    "appointed": parse_date(a.get("dateOfAppointment"))})
    return {"found": bool(out), "records": out, "any_active": any(x["active"] for x in out)}


# ----------------------------------------------------------------------------------------------
# apply: derived facts -> the member's twin (a copy)
# ----------------------------------------------------------------------------------------------
def _matches(e: dict, words: tuple[str, ...], provider: str) -> bool:
    text = " ".join([e.get("series") or "", e.get("id") or "", (e.get("label") or {}).get("en", "")]).upper().replace("_", " ")
    return any(w in text for w in words) or (bool(provider) and provider.upper() in text)


def _bill(hh: dict, f: dict, words: tuple[str, ...], label: dict, tag: str, notes: list) -> None:
    as_of = d(hh["as_of"])
    due, amt = f.get("due_date"), f.get("amount_due")
    if not due or not amt or amt <= 0:
        return
    dd = d(due)
    if dd < as_of:
        notes.append(L(f"{label['hi']}: {inr(amt)} ki aakhri tareekh {dd.day}/{dd.month} nikal gayi — bhara nahi to late fee se bachne ke liye abhi bharein.",
                       f"{label['en']}: {inr(amt)} was due on {dd.day}/{dd.month} — if it isn't paid yet, pay now to avoid a late fee."))
        return
    if dd > as_of + timedelta(days=HORIZON_DAYS):
        return
    up = hh["upcoming"]
    near = [e for e in up if e["amount"] < 0 and e.get("type") == "bill" and _matches(e, words, f.get("provider") or "")
            and abs((d(e["date"]) - dd).days) <= 15]
    if near:
        ev = min(near, key=lambda e: abs((d(e["date"]) - dd).days))
        ev["date"], ev["amount"] = due, -int(amt)
    else:
        ev = {"id": f"hub_{tag}_{due}", "type": "bill", "amount": -int(amt), "date": due, "label": label,
              "movable": False, "protected": True}
        up.append(ev)
    ev["certainty"], ev["basis"], ev["biller"] = "pakka", BILLER, True


def apply_hub(hh: dict, hub: dict | None) -> dict:
    hh["records"] = []
    if not hub:
        return hh
    notes: list = []
    as_of = hh["as_of"]
    facts = {k: v for k, v in hub.items() if k in KINDS and isinstance(v, dict)}
    hh["hub"] = facts

    if f := facts.get("electricity"):
        _bill(hh, f, ELEC_WORDS, L("Bijli bill", "Electricity bill"), "elec", notes)
    if f := facts.get("png"):
        _bill(hh, f, GAS_WORDS, L("Gas (PNG) bill", "Gas (PNG) bill"), "png", notes)
    hh["upcoming"].sort(key=lambda e: (e["date"], e["amount"] < 0))

    if (f := facts.get("epf")) and f.get("pf_balance") is not None:
        hh["locked_savings"] = int(f["pf_balance"])
    if (f := facts.get("epf")) and f.get("active"):
        holder = next((m for m in hh.get("members", []) if m.get("account_holder")), None)
        if holder:
            holder["edli"] = True
    if f := facts.get("ration"):
        hh["ration"] = {"scheme": f.get("scheme"), "priority": bool(f.get("priority"))}

    hh["records"] = [_record(k, f, as_of) for k, f in facts.items()]
    hh["records_notes"] = notes
    return hh


def _fmt(s: str | None) -> str:
    if not s:
        return "—"
    x = d(s)
    return f"{x.day:02d}-{x.month:02d}-{x.year}"


def _record(kind: str, f: dict, as_of: str) -> dict:
    """One line per record for the member's "Records" list (derived facts only)."""
    if kind == "electricity":
        lines = [L(f"Bill {inr(f['amount_due'])}, aakhri tareekh {_fmt(f.get('due_date'))}" if f.get("amount_due") else "Koi bakaya nahi",
                   f"Bill {inr(f['amount_due'])}, due {_fmt(f.get('due_date'))}" if f.get("amount_due") else "Nothing due")]
        title = L(f"Bijli · {f.get('provider') or ''} {f.get('consumer') or ''}".strip(), f"Electricity · {f.get('provider') or ''} {f.get('consumer') or ''}".strip())
    elif kind == "png":
        lines = [L(f"Bill {inr(f['amount_due'])}" + (f", aakhri tareekh {_fmt(f['due_date'])}" if f.get("due_date") else ""),
                   f"Bill {inr(f['amount_due'])}" + (f", due {_fmt(f['due_date'])}" if f.get("due_date") else ""))] if f.get("amount_due") else [L("Bill nahi mila", "No bill found")]
        title = L(f"Gas · {f.get('provider_name') or ''}", f"Gas · {f.get('provider_name') or ''}")
    elif kind == "ration":
        title = L(f"Ration card {f.get('card') or ''}".strip(), f"Ration card {f.get('card') or ''}".strip())
        lines = [L(f"Yojana {f.get('scheme') or '—'} · {f.get('members') or '?'} sadasya", f"Scheme {f.get('scheme') or '—'} · {f.get('members') or '?'} members")]
        if f.get("scheme") == "AAY":
            lines.append(L("AAY card: Ayushman (PM-JAY) ke liye patr ho sakte hain — beneficiary.nha.gov.in par dekhein",
                           "AAY card: you may be eligible for Ayushman (PM-JAY) — check at beneficiary.nha.gov.in"))
        elif f.get("priority"):
            lines.append(L("Priority card: Ayushman patrata beneficiary.nha.gov.in par dekhein",
                           "Priority card: check Ayushman eligibility at beneficiary.nha.gov.in"))
    elif kind == "epf":
        title = L(f"PF (EPF) {f.get('uan') or ''}".strip(), f"PF (EPF) {f.get('uan') or ''}".strip())
        lines = [L(f"PF bachat {inr(f['pf_balance'])} — retirement ke liye, roz ke kharch ke liye nahi",
                   f"PF savings {inr(f['pf_balance'])} — locked for retirement, not spendable")] if f.get("pf_balance") is not None else []
        if f.get("active"):
            lines.append(L(f"EDLI jeevan bima: {inr(EDLI_MAX)} tak, jab tak PF katta rahe",
                           f"EDLI life cover: up to {inr(EDLI_MAX)}, while PF contributions continue"))
        else:
            lines.append(L("Haal mein PF jama nahi dikha — EDLI bima naukri ke saath hi chalta hai",
                           "No recent PF contribution — EDLI cover only runs while you're employed"))
    elif kind == "rc":
        title = L(f"Gaadi {f.get('reg') or ''}".strip(), f"Vehicle {f.get('reg') or ''}".strip())
        lines = [L(f"Bima {_fmt(f.get('insurance_upto'))} tak · PUC {_fmt(f.get('puc_upto'))} tak",
                   f"Insurance till {_fmt(f.get('insurance_upto'))} · PUC till {_fmt(f.get('puc_upto'))}")]
        if f.get("financed"):
            lines.append(L("Gaadi par loan (hypothecation) darj hai", "A loan (hypothecation) is recorded on this vehicle"))
    elif kind == "challan":
        title = L(f"E-challan {f.get('reg') or ''}".strip(), f"E-challans {f.get('reg') or ''}".strip())
        lines = [L(f"{f['pending']} bakaya challan · {inr(f['pending_amount'])}", f"{f['pending']} unpaid · {inr(f['pending_amount'])}")
                 if f.get("pending") else L("Koi bakaya challan nahi", "No unpaid challans")]
    else:  # dl
        title = L(f"Driving licence {f.get('dl') or ''}".strip(), f"Driving licence {f.get('dl') or ''}".strip())
        lines = [L(f"Private {_fmt(f.get('valid_nt'))} tak" + (f" · Commercial {_fmt(f.get('valid_t'))} tak" if f.get("valid_t") else ""),
                   f"Private till {_fmt(f.get('valid_nt'))}" + (f" · Commercial till {_fmt(f.get('valid_t'))}" if f.get("valid_t") else ""))]
    return {"kind": kind, "title": title, "lines": lines, "fetched_on": f.get("fetched_on"), "source": "Perfios Hub"}


# ----------------------------------------------------------------------------------------------
# tasks (E13 reads these)
# ----------------------------------------------------------------------------------------------
def vehicle_needs(hh: dict) -> list[dict]:
    facts = hh.get("hub") or {}
    as_of = d(hh["as_of"])
    out = []
    rc = facts.get("rc")
    if rc and rc.get("insurance_upto"):
        exp = d(rc["insurance_upto"])
        if exp <= as_of + timedelta(days=30):
            out.append({"kind": "vehicle_insurance", "tier": 1 if exp < as_of else 2, "harm_date": iso(max(exp, as_of)),
                        "severity": "red" if exp < as_of else "amber", "fact": rc, "expired": exp < as_of})
    if rc and rc.get("puc_upto"):
        exp = d(rc["puc_upto"])
        if exp <= as_of + timedelta(days=15):
            out.append({"kind": "puc", "tier": 3, "harm_date": iso(max(exp, as_of)), "severity": "amber", "fact": rc,
                        "expired": exp < as_of})
    ch = facts.get("challan")
    if ch and ch.get("pending"):
        out.append({"kind": "challans", "tier": 3, "harm_date": iso(as_of + timedelta(days=14)), "severity": "amber", "fact": ch})
    dl = facts.get("dl")
    if dl:
        commercial = bool(dl.get("valid_t"))
        end = dl.get("valid_t") or dl.get("valid_nt")
        if end:
            exp = d(end)
            window = 60 if commercial else 30
            if exp <= as_of + timedelta(days=window):
                out.append({"kind": "licence", "tier": 2 if commercial else 3, "harm_date": iso(max(exp, as_of)),
                            "severity": "red" if exp < as_of else "amber", "fact": dl, "commercial": commercial,
                            "expired": exp < as_of})
    return out
