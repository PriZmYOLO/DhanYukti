"""E01 — normalise raw transactions into household facts.

Pure function. Detects: salary / gig / cash income, EMIs, app-loan cycles, bills, school fees,
rent, penalties, insurance premiums, cash share, idle accounts. Own-account transfers are
NEVER income (and never spend).
Money is integer paise internally.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date

from app.engines.common import P, R, d

# keyword rules, checked in order. Narrations are upper-cased first.
APP_LENDERS = ["QUICKRUPEE", "KREDITBEE", "MONEYVIEW", "NAVI", "FIBE", "MPOKKET", "CASHE", "TRUEBALANCE",
               "SMARTCOIN", "KISSHT", "RUPEEREDEE", "LOANTAP", "SLICE", "PAYSENSE", "INSTAMONEY", "CASHBEAN"]
GIG_PAYERS = ["SWIGGY", "ZOMATO", "URBAN COMPANY", "UBER", "OLA ", "RAPIDO", "ZEPTO", "BLINKIT", "DUNZO", "PORTER"]

CATEGORY_OF = {  # E01 kind -> spend donut key
    "rent": "ghar", "bill": "ghar", "fee": "ghar",
    "grocery": "khana",
    "emi": "emi", "app_loan_repay": "emi",
    "saving": "bachat", "premium": "bachat",
    "cash": "baaki", "penalty": "baaki", "other": "baaki", "medical": "baaki", "fuel": "baaki",
}


def classify(narration: str, amount: int) -> str:
    n = narration.upper()
    if "SELF" in n or "OWN A/C" in n:
        return "own_transfer"
    if any(a in n for a in APP_LENDERS):
        return "app_loan_disbursal" if amount > 0 else "app_loan_repay"
    if amount > 0:
        if "SALARY" in n or " SAL " in n:
            return "salary"
        if any(g in n for g in GIG_PAYERS):
            return "gig"
        if "CASH DEP" in n:
            return "cash_income"
        return "other_credit"
    if "CHRG" in n or "PENAL" in n or " RTN " in n or "BOUNCE" in n:
        return "penalty"
    if "PMJJBY" in n or "PMSBY" in n or "PREMIUM" in n or "LIC " in n or "INSURANCE" in n:
        return "premium"
    if "EMI" in n:
        return "emi"
    if "RENT" in n:
        return "rent"
    if "FEE" in n or "SCHOOL" in n:
        return "fee"
    if any(k in n for k in ("ELECTRICITY", "BBPS", "GAS", "JIO", "AIRTEL", "RECHARGE", "POSTPAID", "WATER")):
        return "bill"
    if "RD INSTAL" in n or "SIP" in n or "GULLAK" in n:
        return "saving"
    if "ATM" in n or "CASH WDL" in n:
        return "cash"
    if any(k in n for k in ("KIRANA", "DAIRY", "MILK", "SABZI", "STORES", "MANDI", "AAVIN")):
        return "grocery"
    if any(k in n for k in ("MEDIC", "PHARMA", "HOSPITAL")):
        return "medical"
    if "PETROL" in n or "FUEL" in n or "INDIAN OIL" in n:
        return "fuel"
    return "other"


INCOME_KINDS = ("salary", "gig", "cash_income")


def _app_name(n: str) -> str:
    u = n.upper()
    for a in APP_LENDERS:
        if a in u:
            return {"QUICKRUPEE": "QuickRupee", "KREDITBEE": "KreditBee", "MONEYVIEW": "MoneyView",
                    "RUPEEREDEE": "RupeeRedee", "LOANTAP": "LoanTap", "INSTAMONEY": "InstaMoney", "CASHBEAN": "CashBean",
                    "SMARTCOIN": "SmartCoin", "TRUEBALANCE": "TrueBalance", "MPOKKET": "mPokket", "PAYSENSE": "PaySense"}.get(a, a.title())
    return "Unknown"


def _month_key(s: str) -> str:
    return s[:7]


def full_months_before(as_of: date, n: int) -> list[str]:
    """The n complete calendar months before as_of's month, oldest first."""
    y, m = as_of.year, as_of.month
    out = []
    for _ in range(n):
        m -= 1
        if m == 0:
            y, m = y - 1, 12
        out.insert(0, f"{y:04d}-{m:02d}")
    return out


def normalise(txns: list[dict], as_of: str, accounts: list[dict] | None = None) -> dict:
    as_of_d = d(as_of)
    rows = []
    for t in txns:
        k = classify(t["narration"], t["amount"])
        rows.append({**t, "kind": k, "paise": P(t["amount"])})

    last3 = full_months_before(as_of_d, 3)
    income_by_month: dict[str, int] = defaultdict(int)
    for r in rows:
        if r["kind"] in INCOME_KINDS:
            income_by_month[_month_key(r["date"])] += r["paise"]
    monthly_income_p = sum(income_by_month.get(m, 0) for m in last3) // 3

    salary_rows = [r for r in rows if r["kind"] == "salary"]
    gig_rows = [r for r in rows if r["kind"] == "gig"]
    cash_inc_rows = [r for r in rows if r["kind"] == "cash_income"]
    salary_days = sorted({d(r["date"]).day for r in salary_rows})
    salary_months = len({_month_key(r["date"]) for r in salary_rows})
    # main salary day = day-of-month of the largest recurring salary credit
    salary_day = d(max(salary_rows, key=lambda r: (r["paise"], r["date"]))["date"]).day if salary_rows else None

    # EMIs: monthly average over last 3 full months
    emi_by_month: dict[str, int] = defaultdict(int)
    for r in rows:
        if r["kind"] == "emi":
            emi_by_month[_month_key(r["date"])] += -r["paise"]
    emi_monthly_p = sum(emi_by_month.get(m, 0) for m in last3) // 3

    # fixed monthly obligations used by resilience: EMIs + rent + bills
    fixed_by_month: dict[str, int] = defaultdict(int)
    for r in rows:
        if r["kind"] in ("emi", "rent", "bill"):
            fixed_by_month[_month_key(r["date"])] += -r["paise"]
    fixed_monthly_p = sum(fixed_by_month.get(m, 0) for m in last3) // 3

    # app-loan cycles: pair each disbursal with the next repayment for the same app
    loans = []
    open_by_app: dict[str, dict] = {}
    for r in sorted(rows, key=lambda x: x["date"]):
        if r["kind"] == "app_loan_disbursal":
            open_by_app[_app_name(r["narration"])] = r
        elif r["kind"] == "app_loan_repay":
            app = _app_name(r["narration"])
            disb = open_by_app.pop(app, None)
            if disb:
                loans.append({
                    "app": app,
                    "borrowed_p": disb["paise"],
                    "repaid_p": -r["paise"],
                    "charges_p": -r["paise"] - disb["paise"],
                    "days": (d(r["date"]) - d(disb["date"])).days,
                    "disbursal": disb, "repay": r,
                })
    for app, disb in open_by_app.items():
        loans.append({"app": app, "borrowed_p": disb["paise"], "repaid_p": 0, "charges_p": 0, "days": 0,
                      "disbursal": disb, "repay": None, "open": True})

    penalties = [r for r in rows if r["kind"] == "penalty"]
    penalty_6m_p = -sum(r["paise"] for r in penalties)
    three_months_ago = date(as_of_d.year if as_of_d.month > 3 else as_of_d.year - 1,
                            (as_of_d.month - 3 - 1) % 12 + 1, min(as_of_d.day, 28)).isoformat()
    penalty_3m_p = -sum(r["paise"] for r in penalties if r["date"] > three_months_ago)
    bounces = [r for r in penalties if "RTN" in r["narration"].upper() or "BOUNCE" in r["narration"].upper()]

    # cash share: ATM withdrawals / all spend (excluding own transfers & loan repayments)
    spend_rows = [r for r in rows if r["paise"] < 0 and r["kind"] not in ("own_transfer",)]
    total_spend = -sum(r["paise"] for r in spend_rows) or 1
    cash_spend = -sum(r["paise"] for r in spend_rows if r["kind"] == "cash")
    cash_share_pct = round(100 * cash_spend / total_spend)

    premiums = [r for r in rows if r["kind"] == "premium"]

    # idle accounts: non-operational account with no debit in >= 90 days
    idle = []
    for a in accounts or []:
        debits = [r for r in rows if r.get("account") == a["id"] and r["paise"] < 0]
        last_move = max([r["date"] for r in rows if r.get("account") == a["id"]], default=None)
        last_debit = max([r["date"] for r in debits], default=None)
        ref = last_debit or last_move
        days_idle = (as_of_d - d(ref)).days if ref else 999
        if not a.get("operational", True) and days_idle >= 90 and a["balance"] > 0:
            idle.append({"account": a["id"], "masked": a["masked"], "fip": a["fip"],
                         "balance_p": P(a["balance"]), "days_idle": days_idle})

    own = [r for r in rows if r["kind"] == "own_transfer"]

    return {
        "rows": rows,
        "monthly_income_p": monthly_income_p,
        "income_by_month_p": dict(income_by_month),
        "salary_rows": salary_rows,
        "gig_rows": gig_rows,
        "cash_income_rows": cash_inc_rows,
        "salary_days": salary_days,
        "salary_months": salary_months,
        "salary_day": salary_day,
        "emi_monthly_p": emi_monthly_p,
        "fixed_monthly_p": fixed_monthly_p,
        "app_loans": loans,
        "penalties": penalties,
        "penalty_6m_p": penalty_6m_p,
        "penalty_3m_p": penalty_3m_p,
        "bounces": len(bounces),
        "cash_share_pct": cash_share_pct,
        "premiums": premiums,
        "idle_accounts": idle,
        "own_transfers": own,
    }


def spend_last_month(norm: dict, as_of: str) -> list[dict]:
    """Spend donut for the last complete calendar month."""
    month = full_months_before(d(as_of), 1)[0]
    buckets: dict[str, list[dict]] = {k: [] for k in ("ghar", "khana", "emi", "bachat", "baaki")}
    for r in norm["rows"]:
        if r["paise"] >= 0 or not r["date"].startswith(month) or r["kind"] == "own_transfer":
            continue
        buckets[CATEGORY_OF.get(r["kind"], "baaki")].append(r)
    return [{"key": k, "total_p": -sum(r["paise"] for r in v), "rows": v} for k, v in buckets.items()]


def txn_out(r: dict) -> dict:
    """Contract Txn shape."""
    return {"date": r["date"], "narration": r["narration"], "amount": R(r["paise"]) if "paise" in r else r["amount"],
            "source": r.get("source", "aa")}
