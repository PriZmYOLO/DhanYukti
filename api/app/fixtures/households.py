"""Golden fixtures for households A, B, C.

All money here is in integer RUPEES (engines convert to paise). Transactions are what the AA
FI fetch would return (after decryption) plus declared entries; `upcoming` is the obligation
schedule the Household Twin projects forward (E03).

As-of for every household: 2026-09-23.
"""
from __future__ import annotations

import calendar
import copy
from datetime import date

from app.engines.common import L

AS_OF = "2026-09-23"
MONTHS = [(2026, m) for m in range(4, 10)]  # Apr..Sep 2026 = last 6 months


def _mk(y: int, m: int, day: int) -> str | None:
    last = calendar.monthrange(y, m)[1]
    if day > last:
        return None
    s = date(y, m, day).isoformat()
    return s if s <= AS_OF else None


def _mondays(y: int, m: int) -> list[int]:
    return [d for d in range(1, calendar.monthrange(y, m)[1] + 1) if date(y, m, d).weekday() == 0]


def _sorted(txns: list[dict]) -> list[dict]:
    return sorted(txns, key=lambda t: (t["date"], t["amount"] < 0))


# ---------------------------------------------------------------------------------------------
# Household A — Sunita & Ramesh Yadav, Panipat (salary, textile mill)
# ---------------------------------------------------------------------------------------------
def _a_txns() -> list[dict]:
    t: list[dict] = []

    def add(y, m, day, narr, amt, acct="SB-4521", src="aa"):
        ds = _mk(y, m, day)
        if ds:
            t.append({"date": ds, "narration": narr, "amount": amt, "account": acct, "source": src})

    for y, m in MONTHS:
        add(y, m, 1, "UPI/VERMA DAIRY MILK/PANIPAT", -1800)
        for kd in (2, 9, 16, 23):
            add(y, m, kd, "UPI/GUPTA KIRANA STORE/MODEL TOWN", -1600)
        add(y, m, 3, "ATM WDL SBI PANIPAT MODEL TOWN", -2200)
        add(y, m, 18, "ATM WDL SBI PANIPAT MODEL TOWN", -2200)
        add(y, m, 5, "ACH DR BAJAJ FINANCE LTD EMI 4401", -2100)
        add(y, m, 5, "ACH DR HDFC BANK TWO WHEELER LOAN EMI", -2100)
        add(y, m, 7, "RD INSTALMENT A/C XX9012", -1000)
        add(y, m, 10, "UPI/INDANE GAS PANIPAT/LPG REFILL", -900)
        add(y, m, 12, "UPI/JIO PREPAID RECHARGE", -299)
        add(y, m, 14, "UPI/HP PETROL PUMP GT ROAD", -1000)
        add(y, m, 20, "UPI/SHARMA MEDICOS/PANIPAT", -450)
        add(y, m, 27, "BBPS/UHBVN ELECTRICITY BILL", -1500)
        add(y, m, 28, "UPI/ST MARYS SCHOOL PANIPAT/FEE", -5000)
        add(y, m, 30, "NEFT CR SHREE KRISHNA TEXTILE MILLS SALARY", 30000)

    # own-account transfer Ramesh -> Sunita (must never count as income)
    add(2026, 8, 2, "IMPS/SELF/TRF TO SUNITA YADAV XX7788", -2000)
    add(2026, 8, 2, "IMPS/SELF/TRF FROM RAMESH YADAV XX4521", 2000, acct="SB-7788")
    add(2026, 8, 4, "UPI/SABZI MANDI PANIPAT", -1200, acct="SB-7788")
    add(2026, 8, 19, "UPI/SABZI MANDI PANIPAT", -800, acct="SB-7788")
    # app-loan cycle (2 loans in 3 months)
    add(2026, 7, 10, "UPI/QUICKRUPEE/LOAN DISBURSAL", 3000)
    add(2026, 7, 25, "UPI/QUICKRUPEE/LOAN REPAY", -3340)
    add(2026, 8, 12, "UPI/KREDITBEE/LOAN DISBURSAL", 5000)
    add(2026, 9, 11, "UPI/KREDITBEE/LOAN REPAYMENT", -5120)
    # penalties = 590 in 6 months
    add(2026, 4, 30, "CHRG MIN BAL NON MAINT INCL GST", -118)
    add(2026, 6, 30, "CHRG MIN BAL NON MAINT INCL GST", -118)
    add(2026, 8, 6, "ACH RTN CHRG BAJAJ FINANCE INCL GST", -236)
    add(2026, 9, 1, "CHRG MIN BAL NON MAINT INCL GST", -118)
    return _sorted(t)


def _ev(id, dt, type, hi, en, amount, movable=False, **extra):
    e = {"id": id, "date": dt, "type": type, "label": L(hi, en), "amount": amount, "movable": movable}
    e.update(extra)
    return e


HOUSEHOLD_A = {
    "id": "A",
    "family_name": L("Yadav parivaar", "The Yadav family"),
    "primary_user": "sunita",
    "city": L("Panipat, Haryana", "Panipat, Haryana"),
    "income_type": "salary",
    "literacy_mode": "aasaan",
    "language": "hi",
    "problem": L("Fee salary se pehle, app loan ka chakkar", "Fee due before salary, app-loan cycle"),
    "members": [
        {"id": "sunita", "name": "Sunita", "role": L("Grihini", "Homemaker"), "earner": False, "age": 35,
         "sharing": "poora", "avatar": "woman",
         "cover": {"life": False, "health": None, "note": L("Ayushman patrata pata nahi", "Ayushman eligibility unknown")}},
        {"id": "ramesh", "name": "Ramesh", "role": L("Textile mill mein kaam", "Works at a textile mill"), "earner": True,
         "age": 38, "sharing": "poora", "avatar": "man", "main_earner": True,
         "cover": {"life": False, "health": None,
                   "note": L("Jeevan bima nahi · Ayushman patrata pata nahi", "No life cover · Ayushman eligibility unknown")}},
        {"id": "pooja", "name": "Pooja", "role": L("Beti, Class 7", "Daughter, Class 7"), "earner": False, "age": 12,
         "sharing": "private", "avatar": "girl",
         "cover": {"life": False, "health": None, "note": L("Bachchon ke liye health cover parivaar policy se", "Children get health cover via a family policy")}},
        {"id": "rohan", "name": "Rohan", "role": L("Beta, Class 4", "Son, Class 4"), "earner": False, "age": 9,
         "sharing": "private", "avatar": "boy",
         "cover": {"life": False, "health": None, "note": L("Bachchon ke liye health cover parivaar policy se", "Children get health cover via a family policy")}},
    ],
    "accounts": [
        {"id": "SB-4521", "masked": "XXXXXX4521", "fip": "SBI", "holder": "ramesh", "type": "SAVINGS", "balance": 6000, "operational": True},
        {"id": "SB-7788", "masked": "XXXXXX7788", "fip": "Punjab National Bank", "holder": "sunita", "type": "SAVINGS", "balance": 0, "operational": True},
    ],
    "own_accounts": ["XX4521", "XX7788"],
    "closing_balance": 6000,
    "safety_floor": 4000,
    "essentials_per_day": 500,
    "transactions": _a_txns(),
    "upcoming": [
        _ev("elec_sep", "2026-09-27", "bill", "Bijli bill (UHBVN)", "Electricity bill (UHBVN)", -1500, protected=True),
        _ev("fee_school", "2026-09-28", "fee", "School fee (St. Mary's)", "School fee (St. Mary's)", -5000, movable=True,
            protected=True, contact="School (St. Mary's, Panipat)",
            ask_message=L(
                "Namaste Sir/Madam, main Sunita Yadav, Pooja (Class 7) aur Rohan (Class 4) ki maa. "
                "Hamare ghar ki salary har mahine 30 tareekh ko aati hai. Kya is mahine ki fee ₹5,000 "
                "28 ki jagah 30 September tak jama karne ki anumati mil sakti hai? Hum 30 ko zaroor jama kar denge. "
                "Aapki madad ke liye bahut dhanyavaad.",
                "Namaste Sir/Madam, I am Sunita Yadav, mother of Pooja (Class 7) and Rohan (Class 4). "
                "Our salary comes on the 30th of every month. Could we please pay this month's fee of ₹5,000 "
                "by 30 September instead of the 28th? We will surely pay on the 30th. Thank you very much for your help.",
            )),
        _ev("salary_sep", "2026-09-30", "salary", "Ramesh ki salary", "Ramesh's salary", 30000),
        _ev("emi_bajaj_oct", "2026-10-05", "emi", "Bajaj Finance EMI", "Bajaj Finance EMI", -2100, protected=True),
        _ev("emi_hdfc_oct", "2026-10-05", "emi", "HDFC bike loan EMI", "HDFC bike loan EMI", -2100, protected=True),
        _ev("lpg_oct", "2026-10-10", "bill", "Gas cylinder (Indane)", "LPG cylinder (Indane)", -900),
        _ev("jio_oct", "2026-10-12", "bill", "Jio recharge", "Jio recharge", -299),
    ],
    "jars": [
        {"id": "emergency", "name": L("Emergency Gullak", "Emergency jar"), "goal": 15000, "saved": 2400, "kind": "emergency", "target_date": "2027-07-31"},
        {"id": "school", "name": L("School fee Gullak", "School fee jar"), "goal": 5000, "saved": 1200, "kind": "school", "target_date": "2026-10-28"},
        {"id": "diwali", "name": L("Diwali Gullak", "Diwali jar"), "goal": 4000, "saved": 900, "kind": "festival", "target_date": "2026-11-08"},
    ],
    "perfios_analytics": {
        # canned Perfios analytics output (replay). Perfios counted the 2 Aug self-transfer as income.
        "monthly_income": 30667, "salary_detected": True, "salary_day": 30, "emi_monthly": 4200,
        "bounces_6m": 1, "cash_share_pct": 18, "app_loans_3m": 2,
    },
    "game": {
        "points": 340, "streak": 6, "streak_shield": 1, "badges_earned": ["pehla_kadam"],
        "mission": {"title": L("Is mahine ₹1,000 bachao", "Save ₹1,000 this month"), "progress": 640, "target": 1000},
        "leaderboard": [
            {"member_id": "sunita", "name": "Sunita", "habits": 18, "streak": 6},
            {"member_id": "ramesh", "name": "Ramesh", "habits": 7, "streak": 2},
            {"member_id": "pooja", "name": "Pooja", "habits": 5, "streak": 3},
            {"member_id": "rohan", "name": "Rohan", "habits": 2, "streak": 1},
        ],
        "ledger": [
            {"date": "2026-09-12", "what": L("Jio ka sasta plan chuna", "Picked a cheaper Jio plan"), "amount": 50, "evidenced": True},
            {"date": "2026-09-18", "what": L("Gullak mein bachat", "Saved in Gullak"), "amount": 640, "evidenced": True},
            {"date": "2026-09-20", "what": L("Bijli bill time par — late fee nahi lagi", "Paid electricity on time — no late fee"), "amount": 50, "evidenced": False},
        ],
    },
}

# ---------------------------------------------------------------------------------------------
# Household B — Farida Sheikh, Indore (sole earner, tailoring cash + gig payouts)
# ---------------------------------------------------------------------------------------------
_B_INCOME = {
    4: ([1500, 1800, 2200, 1700], [6000, 5500, 6300]),
    5: ([2400, 2600, 2600, 2000, 1400], [5000, 5200, 4800]),
    6: ([1500, 1600, 1400, 1500], [7000, 6500, 6500]),
    7: ([2100, 2300, 2400, 2200], [6000, 5500, 5500]),
    8: ([2500, 2600, 2400, 2700], [5500, 5200, 5100]),
    9: ([1800, 2100, 2000], [5000, 4800]),
}


def _b_txns() -> list[dict]:
    t: list[dict] = []

    def add(y, m, day, narr, amt, acct="SB-3310", src="aa"):
        ds = _mk(y, m, day)
        if ds:
            t.append({"date": ds, "narration": narr, "amount": amt, "account": acct, "source": src})

    for y, m in MONTHS:
        gig, cash = _B_INCOME[m]
        for i, (day, amt) in enumerate(zip(_mondays(y, m), gig)):
            payer = "BUNDL TECHNOLOGIES SWIGGY PAYOUT" if i % 2 == 0 else "ZOMATO LTD PARTNER PAYOUT"
            add(y, m, day, f"NEFT CR {payer}", amt)
        for day, amt in zip((6, 16, 26), cash):
            add(y, m, day, "CASH DEP INDORE RAJWADA BR (SILAI)", amt)
        add(y, m, 1, "UPI/SHARMA HOUSE RENT/INDORE", -5000)
        add(y, m, 5, "BBPS/MPPKVVCL ELECTRICITY BILL", -800)
        add(y, m, 10, "UPI/GYAN JYOTI SCHOOL/FEE", -1200)
        add(y, m, 12, "UPI/HP GAS AGENCY INDORE", -900)
        add(y, m, 15, "ACH DR BAJAJ FINSERV EMI MOBILE", -900)
        for kd in (3, 10, 17, 24):
            add(y, m, kd, "UPI/ALIF KIRANA/KHAJRANA", -1500)
        add(y, m, 2, "UPI/SANCHI MILK PARLOUR", -1200)
        add(y, m, 8, "ATM WDL BOB INDORE KHAJRANA", -2000)
        add(y, m, 22, "ATM WDL BOB INDORE KHAJRANA", -2000)
        add(y, m, 19, "UPI/APNA MEDICAL STORE", -600)
        add(y, m, 21, "UPI/SILAI MATERIAL KAPDA BAZAAR", -1500)
    add(2026, 7, 14, "CHRG SMS ALERT QTR", -18)
    return _sorted(t)


HOUSEHOLD_B = {
    "id": "B",
    "family_name": L("Sheikh parivaar", "The Sheikh family"),
    "primary_user": "farida",
    "city": L("Indore, Madhya Pradesh", "Indore, Madhya Pradesh"),
    "income_type": "gig",
    "literacy_mode": "saathi",
    "language": "hi",
    "problem": L("Akeli kamane wali, koi bima nahi, aamdani upar-neeche", "Sole earner, no insurance, uneven income"),
    "members": [
        {"id": "farida", "name": "Farida", "role": L("Silai + tiffin (Swiggy/Zomato)", "Tailoring + tiffin (Swiggy/Zomato)"),
         "earner": True, "age": 34, "sharing": "poora", "avatar": "woman", "main_earner": True,
         "cover": {"life": False, "health": None, "note": L("Koi bima nahi · Ayushman patrata pata nahi", "No insurance · Ayushman eligibility unknown")}},
        {"id": "zubeda", "name": "Zubeda", "role": L("Ammi", "Mother"), "earner": False, "age": 63,
         "sharing": "sirf_total", "avatar": "elder_woman",
         "cover": {"life": False, "health": None, "note": L("Ayushman (70+ nahi) — patrata check karein", "Ayushman — check eligibility")}},
        {"id": "ayaan", "name": "Ayaan", "role": L("Beta, Class 6", "Son, Class 6"), "earner": False, "age": 11,
         "sharing": "private", "avatar": "boy", "cover": {"life": False, "health": None, "note": L("Health cover nahi", "No health cover")}},
        {"id": "sana", "name": "Sana", "role": L("Beti, Class 2", "Daughter, Class 2"), "earner": False, "age": 7,
         "sharing": "private", "avatar": "girl", "cover": {"life": False, "health": None, "note": L("Health cover nahi", "No health cover")}},
    ],
    "accounts": [
        {"id": "SB-3310", "masked": "XXXXXX3310", "fip": "Bank of Baroda", "holder": "farida", "type": "SAVINGS", "balance": 8000, "operational": True},
    ],
    "own_accounts": ["XX3310"],
    "closing_balance": 8000,
    "safety_floor": 3000,
    "essentials_per_day": 450,
    "transactions": _b_txns(),
    "upcoming": [
        _ev("cash_sep26", "2026-09-26", "gig", "Silai ki kamai (cash jama)", "Tailoring income (cash deposit)", 3500),
        _ev("gig_sep28", "2026-09-28", "gig", "Swiggy payout", "Swiggy payout", 2000),
        _ev("rent_oct", "2026-10-01", "rent", "Makaan kiraya", "House rent", -5000, protected=True),
        _ev("elec_oct", "2026-10-05", "bill", "Bijli bill (MPPKVVCL)", "Electricity bill (MPPKVVCL)", -800, protected=True),
        _ev("gig_oct05", "2026-10-05", "gig", "Zomato payout", "Zomato payout", 2200),
        _ev("cash_oct06", "2026-10-06", "gig", "Silai ki kamai (cash jama)", "Tailoring income (cash deposit)", 4000),
        _ev("fee_oct", "2026-10-10", "fee", "School fee (Gyan Jyoti)", "School fee (Gyan Jyoti)", -1200, movable=True, protected=True),
        _ev("gas_oct", "2026-10-12", "bill", "Gas cylinder", "LPG cylinder", -900),
        _ev("gig_oct12", "2026-10-12", "gig", "Swiggy payout", "Swiggy payout", 1800),
        _ev("emi_oct", "2026-10-15", "emi", "Mobile EMI (Bajaj Finserv)", "Mobile EMI (Bajaj Finserv)", -900, protected=True),
        _ev("cash_oct16", "2026-10-16", "gig", "Silai ki kamai (cash jama)", "Tailoring income (cash deposit)", 3500),
        _ev("gig_oct19", "2026-10-19", "gig", "Zomato payout", "Zomato payout", 2100),
    ],
    "jars": [
        {"id": "emergency", "name": L("Emergency Gullak", "Emergency jar"), "goal": 10000, "saved": 1500, "kind": "emergency", "target_date": "2027-03-31"},
    ],
    "perfios_analytics": {
        "monthly_income": 26000, "salary_detected": False, "salary_day": None, "emi_monthly": 900,
        "bounces_6m": 0, "cash_share_pct": 23, "app_loans_3m": 0,
    },
    "game": {
        "points": 120, "streak": 2, "streak_shield": 0, "badges_earned": [],
        "mission": {"title": L("Is hafte ₹300 Gullak mein", "₹300 into the Gullak this week"), "progress": 100, "target": 300},
        "leaderboard": [
            {"member_id": "farida", "name": "Farida", "habits": 6, "streak": 2},
            {"member_id": "ayaan", "name": "Ayaan", "habits": 3, "streak": 1},
        ],
        "ledger": [
            {"date": "2026-09-21", "what": L("Gullak mein bachat", "Saved in Gullak"), "amount": 100, "evidenced": True},
        ],
    },
}

# ---------------------------------------------------------------------------------------------
# Household C — Arjun & Meena Nair, Coimbatore (dual salary, idle surplus)
# ---------------------------------------------------------------------------------------------
def _c_txns() -> list[dict]:
    t: list[dict] = []

    def add(y, m, day, narr, amt, acct="SB-1122", src="aa"):
        ds = _mk(y, m, day)
        if ds:
            t.append({"date": ds, "narration": narr, "amount": amt, "account": acct, "source": src})

    for y, m in MONTHS:
        add(y, m, 1, "NEFT CR LAKSHMI AUTO COMPONENTS SALARY", 22000)
        add(y, m, 5, "NEFT CR SRI VIDYA MANDIR SALARY", 16000)
        add(y, m, 5, "UPI/PALANISAMY K/HOUSE RENT", -8000)
        add(y, m, 3, "UPI/INDANE GAS COIMBATORE", -900)
        add(y, m, 10, "UPI/KAVYA SCHOOL FEE/SVM", -3000)
        if m % 2 == 0:
            add(y, m, 8, "BBPS/TANGEDCO ELECTRICITY", -1100)
        add(y, m, 11, "UPI/AIRTEL POSTPAID", -499)
        for kd in (2, 9, 16, 23):
            add(y, m, kd, "UPI/SRI MURUGAN STORES", -2600)
        add(y, m, 4, "UPI/AAVIN MILK", -1500)
        add(y, m, 6, "ATM WDL INDIAN BANK RS PURAM", -3000)
        add(y, m, 20, "ATM WDL INDIAN BANK RS PURAM", -3000)
        add(y, m, 14, "UPI/INDIAN OIL PETROL", -1500)
        add(y, m, 25, "UPI/RELIANCE TRENDS", -1200)
    add(2026, 5, 29, "PMJJBY PREMIUM ARJUN NAIR", -436)
    add(2026, 5, 29, "PMJJBY PREMIUM MEENA NAIR", -436)
    add(2026, 5, 29, "PMSBY PREMIUM ARJUN NAIR", -20)
    # last movement on the idle savings account
    add(2026, 6, 1, "NEFT/SELF/TRF TO ARJUN NAIR XX5566", -10000)
    add(2026, 6, 1, "NEFT/SELF/TRF FROM ARJUN NAIR XX1122", 10000, acct="SB-5566")
    return _sorted(t)


HOUSEHOLD_C = {
    "id": "C",
    "family_name": L("Nair parivaar", "The Nair family"),
    "primary_user": "meena",
    "city": L("Coimbatore, Tamil Nadu", "Coimbatore, Tamil Nadu"),
    "income_type": "dual",
    "literacy_mode": "pro",
    "language": "ta",
    "problem": L("₹52,000 bekaar pade hain, padhai ka lakshya", "₹52,000 idle, education goal ahead"),
    "members": [
        {"id": "arjun", "name": "Arjun", "role": L("Auto parts factory mein supervisor", "Supervisor, auto-parts factory"),
         "earner": True, "age": 36, "sharing": "poora", "avatar": "man", "main_earner": True,
         "cover": {"life": True, "health": True, "note": L("PMJJBY + ESI", "PMJJBY + ESI")}},
        {"id": "meena", "name": "Meena", "role": L("School teacher", "School teacher"), "earner": True, "age": 33,
         "sharing": "poora", "avatar": "woman",
         "cover": {"life": True, "health": True, "note": L("PMJJBY + school group health", "PMJJBY + school group health")}},
        {"id": "kavya", "name": "Kavya", "role": L("Beti, Class 3", "Daughter, Class 3"), "earner": False, "age": 8,
         "sharing": "private", "avatar": "girl",
         "cover": {"life": False, "health": True, "note": L("Maa ki group health policy mein", "Covered on mother's group health")}},
    ],
    "accounts": [
        {"id": "SB-1122", "masked": "XXXXXX1122", "fip": "Indian Bank", "holder": "arjun", "type": "SAVINGS", "balance": 14000, "operational": True},
        {"id": "SB-5566", "masked": "XXXXXX5566", "fip": "Canara Bank", "holder": "arjun", "type": "SAVINGS", "balance": 52000, "operational": False},
    ],
    "own_accounts": ["XX1122", "XX5566"],
    "closing_balance": 14000,
    "safety_floor": 6000,
    "essentials_per_day": 600,
    "transactions": _c_txns(),
    "upcoming": [
        _ev("salary_arjun_oct", "2026-10-01", "salary", "Arjun ki salary", "Arjun's salary", 22000),
        _ev("gas_oct", "2026-10-03", "bill", "Gas cylinder", "LPG cylinder", -900),
        _ev("salary_meena_oct", "2026-10-05", "salary", "Meena ki salary", "Meena's salary", 16000),
        _ev("rent_oct", "2026-10-05", "rent", "Makaan kiraya", "House rent", -8000, protected=True),
        _ev("elec_oct", "2026-10-08", "bill", "Bijli bill (TANGEDCO)", "Electricity bill (TANGEDCO)", -1100, protected=True),
        _ev("fee_oct", "2026-10-10", "fee", "Kavya ki school fee", "Kavya's school fee", -3000, movable=True, protected=True),
        _ev("airtel_oct", "2026-10-11", "bill", "Airtel postpaid", "Airtel postpaid", -499),
    ],
    "jars": [
        {"id": "education", "name": L("Kavya padhai Gullak", "Kavya's education jar"), "goal": 100000, "saved": 8000, "kind": "education", "target_date": "2030-06-01"},
        {"id": "emergency", "name": L("Emergency Gullak", "Emergency jar"), "goal": 40000, "saved": 12000, "kind": "emergency", "target_date": "2027-06-30"},
    ],
    "perfios_analytics": {
        "monthly_income": 38000, "salary_detected": True, "salary_day": 1, "emi_monthly": 0,
        "bounces_6m": 0, "cash_share_pct": 19, "app_loans_3m": 0,
    },
    "game": {
        "points": 760, "streak": 14, "streak_shield": 2, "badges_earned": ["pehla_kadam", "suraksha_kavach"],
        "mission": {"title": L("Padhai Gullak mein ₹5,000", "₹5,000 into the education jar"), "progress": 2000, "target": 5000},
        "leaderboard": [
            {"member_id": "meena", "name": "Meena", "habits": 31, "streak": 14},
            {"member_id": "arjun", "name": "Arjun", "habits": 22, "streak": 9},
            {"member_id": "kavya", "name": "Kavya", "habits": 12, "streak": 5},
        ],
        "ledger": [
            {"date": "2026-09-05", "what": L("Padhai Gullak mein bachat", "Saved in education jar"), "amount": 2000, "evidenced": True},
        ],
    },
}

HOUSEHOLDS = {"A": HOUSEHOLD_A, "B": HOUSEHOLD_B, "C": HOUSEHOLD_C}


def get_household(hid: str) -> dict | None:
    """Return a deep copy so callers can never mutate the golden source."""
    h = HOUSEHOLDS.get(hid.upper())
    if not h:
        return None
    h = copy.deepcopy(h)
    h["as_of"] = AS_OF
    return h
