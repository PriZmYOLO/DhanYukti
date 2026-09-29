"""E14 — Next Best Action cards: bilingual copy, Why packet, action payload.

Rules calculate, copy explains. Every number shown in a card comes from an engine output.
"""
from __future__ import annotations

from app.engines import e04_debt, e06_protection
from app.engines.common import L, R, d, inr, ordinal
from app.engines.e01_normalise import txn_out

TIER_LABEL = {
    1: L("Abhi karein", "Act now"),
    2: L("Suraksha", "Protect"),
    3: L("Majboot banayein", "Build"),
    4: L("Badhayein", "Grow"),
}
SEBI_RIA_URL = "https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=13"


def _card(need, id, icon, engine, title, body, task, if_not, action, why, points, second_step=None):
    c = {"id": id, "tier": need["tier"], "tier_label": TIER_LABEL[need["tier"]], "severity": need["severity"],
         "engine": engine, "icon": icon, "title": title, "body": body, "task": task, "if_not": if_not,
         "action": action, "why": why, "points": points}
    if second_step:
        c["second_step"] = second_step
    return c


def _last_rows(rows, pred, n):
    return sorted([r for r in rows if pred(r)], key=lambda r: r["date"], reverse=True)[:n]


# --------------------------------------------------------------------------------------------
def _deficit(need, ctx):
    hh, cash, norm = ctx["hh"], ctx["cash"], ctx["norm"]
    fd = cash["first_deficit"]
    gap = R(cash["gap_p"])
    day = d(fd["date"]).day
    income_date = cash["next_income_date"]
    is_salary = any(e["type"] == "salary" for e in cash["events"])
    fix = ctx.get("deficit_fix")
    culprit = fix["culprit"] if fix else None
    title = L(f"{day} tareekh ko {inr(gap)} kam padenge", f"You'll be {inr(gap)} short on the {ordinal(day)}")

    sal_rows = _last_rows(norm["rows"], lambda r: r["kind"] == "salary", 2)
    window_debits = [e for e in cash["events"] if e["paise"] < 0 and hh["as_of"] < e["date"] <= fd["date"]]
    saw_rows = list(sal_rows)
    for e in sorted(window_debits, key=lambda e: e["date"], reverse=True):
        dom = d(e["date"]).day
        match = _last_rows(norm["rows"], lambda r, dom=dom, amt=e["paise"]: r["paise"] == amt and d(r["date"]).day == dom, 1)
        saw_rows += match
    saw = [txn_out(r) for r in saw_rows[:5]]
    sal_day = d(income_date).day if is_salary else (norm["salary_day"] or d(income_date).day)

    if culprit:
        amt = inr(-R(culprit["paise"]))
        n_days = (d(income_date) - d(culprit["date"])).days
        is_fee = culprit["type"] == "fee"
        thing_hi = "School fee" if is_fee else culprit["label"]["hi"]
        thing_en = "The school fee" if is_fee else culprit["label"]["en"]
        pay_hi, pay_en = ("salary", "salary") if is_salary else ("agli kamai", "your next income")
        body = L(f"{thing_hi} ({amt}) {pay_hi} se {n_days} din pehle hai.",
                 f"{thing_en} comes {n_days} days before {pay_en}." if is_fee else
                 f"{thing_en} ({amt}) comes {n_days} days before {pay_en}.")
        new_day = d(fix["new_date"]).day
        contact = culprit.get("contact", culprit["label"]["en"])
        if is_fee:
            task = L(f"School se fee {new_day} tareekh tak badhane ki request bhejein. Hum message likh denge.",
                     f"Ask the school to move the fee to the {ordinal(new_day)}. We'll write the message.")
            rule = L(f"Salary {sal_day} ko aati hai, fee {d(culprit['date']).day} ko hai",
                     f"Salary arrives on the {ordinal(sal_day)}, the fee is due on the {ordinal(d(culprit['date']).day)}")
        else:
            task = L(f"{culprit['label']['hi']} {new_day} tareekh tak badhane ki request bhejein. Hum message likh denge.",
                     f"Ask to move {culprit['label']['en']} to the {ordinal(new_day)}. We'll write the message.")
            rule = L(f"Aamdani {d(income_date).day} ko, {culprit['label']['hi']} {d(culprit['date']).day} ko",
                     f"Income on the {ordinal(d(income_date).day)}, {culprit['label']['en']} on the {ordinal(d(culprit['date']).day)}")
        msg = culprit.get("ask_message") or L(
            f"Namaste, kya {culprit['label']['hi']} ({amt}) {new_day} tareekh tak jama karne ki anumati mil sakti hai? Dhanyavaad.",
            f"Hello, could we please pay {culprit['label']['en']} ({amt}) by the {ordinal(new_day)}? Thank you.")
        action = {"type": "message", "label": L("Message taiyaar hai — bhejein", "Message ready — send it"),
                  "payload": {"to": contact, "text": msg, "event_id": culprit["id"], "new_date": fix["new_date"]}}
        second = None
        if fix["floor_gap_p"] > 0:
            fg = inr(R(fix["floor_gap_p"]))
            what_hi = "Fee badhne" if is_fee else "Tareekh badhne"
            what_en = "moving the fee" if is_fee else "moving the date"
            second = L(f"{what_hi} ke baad bhi {fg} kam — 5 din ₹200 kam kharch, ya Gullak se.",
                       f"Even after {what_en}, you're {fg} below your safety floor — spend ₹200 less for 5 days, or use the Gullak.")
        icon = "school" if is_fee else "alert"
    else:
        body = L(f"{fd['date']} tak kharch aamdani se pehle aa raha hai.", f"Bills land before income by {fd['date']}.")
        task = L("Gullak ya parivaar se chhota intezaam karein; app loan se bachein.",
                 "Arrange a small amount from the Gullak or family; avoid app loans.")
        rule = L("Kharch ki tareekh aamdani se pehle", "Spending dates fall before income")
        action = {"type": "plan", "label": L("Plan dekhein", "See plan"), "payload": {"gap": gap, "date": fd["date"]}}
        second, icon = None, "alert"

    return _card(need, f"nba_deficit_{fd['date']}", icon, "E03", title, body, task,
                 L("App loan lena pad sakta hai, lagbhag ₹150–₹300 kharcha.", "You may need an app loan, costing about ₹150–₹300."),
                 action, {"saw": saw, "rule": rule, "confidence": ctx["conf"]["deficit"], "tag": "jaankari"}, 25, second)


def _lender_rule(lenders):
    """Keep RBI's list and DhanYukti's own ₹36 line apart, so a judge (or member) never reads ours as RBI's."""
    cost = e04_debt.COST_RULE
    if any(x["rbi_list_status"] == e04_debt.NOT_ON_LIST for x in lenders):
        return L("Demo: RBI ki list mein nahi = khatra. " + cost["hi"], "Demo: not on RBI's list = danger. " + cost["en"])
    if any(x["rbi_list_status"] == e04_debt.NOT_IN_OUR_COPY for x in lenders):
        return L(cost["hi"] + ". RBI list: hamari copy adhoori hai, isliye pata nahi — RBI ki site par check karein.",
                 cost["en"] + ". RBI's list: our copy is partial, so unknown — check RBI's site.")
    return cost


def _lender(need, ctx):
    lenders = need["lenders"]
    worst = max(lenders, key=lambda x: x["effective_annual_pct"])
    n = len(ctx["lenders"])
    st = worst["rbi_list_status"]
    if st == e04_debt.NOT_ON_LIST:  # demo fixtures only
        title = L(f"{worst['app']} RBI list mein nahi — {worst['days']} din mein {inr(worst['charges'])} byaaj gaya",
                  f"{worst['app']} isn't on RBI's list — {inr(worst['charges'])} interest in {worst['days']} days")
    elif st == e04_debt.NOT_IN_OUR_COPY:  # live data: we don't know, so we don't accuse
        title = L(f"{worst['app']} mehenga — {worst['days']} din mein {inr(worst['charges'])} byaaj. RBI list par check karein",
                  f"{worst['app']} is expensive — {inr(worst['charges'])} interest in {worst['days']} days. Check it on RBI's list")
    else:
        title = L(f"{worst['app']} bahut mehenga — {worst['days']} din mein {inr(worst['charges'])} byaaj",
                  f"{worst['app']} is very expensive — {inr(worst['charges'])} interest in {worst['days']} days")
    body = L(f"3 mahine mein {n} app loan. {worst['app']} ne {inr(worst['borrowed'])} par {worst['days']} din mein {inr(worst['charges'])} liye.",
             f"{n} app loans in 3 months. {worst['app']} charged {inr(worst['charges'])} on {inr(worst['borrowed'])} for {worst['days']} days.")
    saw = []
    for x in ctx["lenders"]:
        ln = x["_loan"]
        saw.append(txn_out(ln["disbursal"]))
        if ln.get("repay"):
            saw.append(txn_out(ln["repay"]))
    action = {"type": "cheaper_option", "label": L("Sasta vikalp dekhein", "See a cheaper option"),
              "payload": {"rbi_dla_url": e04_debt.RBI_DLA_URL, "rbi_dla_path": e04_debt.RBI_DLA_PATH,
                          "sachet_url": e04_debt.SACHET_URL,
                          "option": L("Bank overdraft / chhota loan", "Bank overdraft / small loan"),
                          "apps": [{"app": x["app"], "on_rbi_list": x["on_rbi_list"], "rbi_list_status": x["rbi_list_status"],
                                   "effective_annual_pct": x["effective_annual_pct"]} for x in ctx["lenders"]]}}
    return _card(need, "nba_lender_shield", "loan", "E04", title, body,
                 L("Agli baar app loan se pehle bank se overdraft ya chhota loan poochhein. App RBI list mein hai ya nahi, check karein.",
                   "Before the next app loan, ask your bank for an overdraft or small loan. Check whether the app is on RBI's list."),
                 L("Har baar ~₹300 extra, aur galat app se dhamki aur data ka khatra.",
                   "About ₹300 extra each time, plus risk of harassment and data misuse from unregistered apps."),
                 action,
                 {"saw": saw[:5], "rule": _lender_rule(lenders),
                  "confidence": ctx["conf"]["lender"], "tag": "jaankari"}, 25,
                 L("Dhamki ya galat vasooli ho to sachet.rbi.org.in par shikayat karein.",
                   "If you face threats or unfair recovery, complain at sachet.rbi.org.in."))


def _protect(need, ctx):
    m = need["member"]
    prot = ctx["protection"]
    fem = m.get("avatar") in ("woman", "elder_woman", "girl")
    if prot["sole_earner"] and fem:
        head_hi, head_en = "Ghar ki akeli kamane wali", "Only earner at home"
    else:
        head_hi, head_en = f"{m['name']} ji ka jeevan bima nahi", f"{m['name']} has no life cover"
    title = L(f"{head_hi} — {inr(e06_protection.PMJJBY_PREMIUM)} saal mein ₹2 lakh ka jeevan bima (PMJJBY)",
              f"{head_en} — ₹2 lakh life cover for {inr(e06_protection.PMJJBY_PREMIUM)} a year (PMJJBY)")
    body = L(f"Saath mein PMSBY: {inr(e06_protection.PMSBY_PREMIUM)}/saal mein ₹2 lakh durghatna bima. Ayushman card ki patrata bhi dekhein.",
             f"Also PMSBY: ₹2 lakh accident cover for {inr(e06_protection.PMSBY_PREMIUM)}/year. And check Ayushman card eligibility.")
    inc = _last_rows(ctx["norm"]["rows"], lambda r: r["kind"] in ("salary", "gig", "cash_income"), 3)
    action = {"type": "protect", "label": L("Bima kaise lein", "How to enrol"),
              "payload": {"url": e06_protection.JANSURAKSHA_URL, "ayushman_url": e06_protection.AYUSHMAN_URL,
                          "member_id": m["id"],
                          "schemes": [
                              {"name": "PMJJBY", "premium": e06_protection.PMJJBY_PREMIUM, "cover": 200000,
                               "kind": L("Jeevan bima", "Life cover")},
                              {"name": "PMSBY", "premium": e06_protection.PMSBY_PREMIUM, "cover": 200000,
                               "kind": L("Durghatna bima", "Accident cover")},
                          ],
                          "note": L("Premium official site par dobara check karein.", "Re-check the premium on the official site.")}}
    return _card(need, f"nba_protect_{m['id']}", "shield", "E06", title, body,
                 L("Bank mein PMJJBY + PMSBY form bharein (auto-debit). Ayushman patrata online check karein.",
                   "Fill the PMJJBY + PMSBY form at your bank (auto-debit). Check Ayushman eligibility online."),
                 L("Kuch ho gaya to parivaar ke paas koi sahara nahi rahega.", "If something happens, the family has no safety net."),
                 action,
                 {"saw": [txn_out(r) for r in inc],
                  "rule": L("6 mahine mein koi bima premium nahi kata; ghar ki aamdani is vyakti par tiki hai",
                            "No insurance premium debited in 6 months; household income depends on this person"),
                  "confidence": ctx["conf"]["protection"], "tag": "jaankari"}, 50)


def _penalties(need, ctx):
    norm = ctx["norm"]
    total = inr(R(norm["penalty_6m_p"]))
    title = L(f"6 mahine mein {total} bank charges kate", f"{total} lost to bank charges in 6 months")
    body = L("Min balance na rakhne aur EMI bounce ke charges.", "Charges for low minimum balance and a bounced EMI.")
    emi = inr(R(norm["emi_monthly_p"])) if norm["emi_monthly_p"] else None
    task = L(f"EMI ({emi}) se ek din pehle khate mein paisa rakhein; SMS alert chalu karein." if emi else
             "Khate mein min balance bana rahe; SMS alert chalu karein.",
             f"Keep money in the account a day before the EMI ({emi}); turn on SMS alerts." if emi else
             "Keep the minimum balance; turn on SMS alerts.")
    action = {"type": "plan", "label": L("Yaad dilayein", "Set reminder"),
              "payload": {"reminders": [{"day": 4, "text": L("Kal EMI hai — khate mein paisa rakhein", "EMI tomorrow — keep money in the account")}]}}
    return _card(need, "nba_penalties", "bolt", "E01", title, body, task,
                 L("Har mahine ~₹100 aise hi katenge.", "About ₹100 will keep getting cut every month."),
                 action,
                 {"saw": [txn_out(r) for r in sorted(norm["penalties"], key=lambda r: r["date"], reverse=True)[:5]],
                  "rule": L("CHRG / RTN wali entries = bank charges", "Entries marked CHRG / RTN = bank charges"),
                  "confidence": "pakka", "tag": "jaankari"}, 25)


def _resilience(need, ctx):
    n = ctx["resilience_days"]
    jar = next((j for j in ctx["jars"] if j["kind"] == "emergency"), None)
    title = L(f"Bina aamdani ke sirf {n} din chal payenge", f"Without income you'd last only {n} days")
    if jar:
        body = L(f"Emergency Gullak mein {inr(jar['saved'])} hai; lakshya {inr(jar['goal'])}.",
                 f"Emergency jar has {inr(jar['saved'])}; goal {inr(jar['goal'])}.")
        daily = jar["daily_suggest"]
        payload = {"jar_id": jar["id"], "amount": daily}
    else:
        body = L("Abhi koi Emergency Gullak nahi.", "No emergency jar yet.")
        daily, payload = 50, {"jar_id": "emergency", "amount": 50}
    saw = [txn_out(r) for r in _last_rows(ctx["norm"]["rows"], lambda r: r["kind"] in ("emi", "rent", "bill"), 3)]
    return _card(need, "nba_resilience", "jar", "E05", title, body,
                 L(f"Roz {inr(daily)} Emergency Gullak mein daalein.", f"Put {inr(daily)} a day into the emergency jar."),
                 L("Achanak kharch aaya to udhaar lena padega.", "A surprise expense would mean borrowing."),
                 {"type": "gullak", "label": L("Gullak mein daalein", "Add to jar"), "payload": payload},
                 {"saw": saw, "rule": L("Bachat ÷ roz ka zaroori kharch (EMI/bill ka hissa milake)",
                                        "Savings ÷ daily essentials (including share of EMIs/bills)"),
                  "confidence": ctx["conf"]["resilience"], "tag": "jaankari"}, 50)


def _grow(need, ctx):
    idle = R(need["idle_p"])
    acct = ctx["norm"]["idle_accounts"][0]
    keep = ctx["hh"]["essentials_per_day"] * 30
    move = max(0, (idle - keep) // 1000 * 1000)
    edu = next((j for j in ctx["jars"] if j["kind"] == "education"), None)
    child = next((m for m in ctx["hh"]["members"] if m.get("age") and m["age"] < 18), None)
    cname = child["name"] if child else ""
    title = L(f"{inr(idle)} bekaar pade hain", f"{inr(idle)} is sitting idle")
    body = L(f"{acct['fip']} khate mein {acct['days_idle']} din se bina istemal ke pade hain.",
             f"Unused in your {acct['fip']} account for {acct['days_idle']} days.")
    task = L(f"{inr(move)} {cname} ke padhai Gullak mein rakhein; baaki {inr(idle - move)} emergency ke liye. RD / recurring SIP ke baare mein SEBI-registered salahkar se samjhein.",
             f"Move {inr(move)} into {cname}'s education jar; keep {inr(idle - move)} for emergencies. Learn about RDs / recurring SIPs from a SEBI-registered adviser.")
    action = {"type": "gullak", "label": L("Padhai Gullak mein daalein", "Move to education jar"),
              "payload": {"jar_id": edu["id"] if edu else "education", "amount": move,
                          "learn": [L("RD: har mahine tay rakam, tay byaaj", "RD: fixed amount monthly, fixed interest"),
                                    L("Recurring SIP: bazaar se juda, jokhim hai", "Recurring SIP: market-linked, carries risk")],
                          "sebi_ria_url": SEBI_RIA_URL}}
    saw = [txn_out(r) for r in _last_rows(ctx["norm"]["rows"], lambda r: r.get("account") == acct["account"], 1)]
    saw += [txn_out(r) for r in _last_rows(ctx["norm"]["rows"], lambda r: r["kind"] == "salary", 2)]
    return _card(need, "nba_grow_idle", "grow", "E13", title, body, task,
                 L("Mehngai se paisa har saal thoda ghat-ta hai.", "Inflation quietly shrinks idle money every year."),
                 action,
                 {"saw": saw, "rule": L("90+ din se khate se koi nikasi nahi = bekaar paisa",
                                        "No withdrawal for 90+ days = idle money"),
                  "confidence": "pakka", "tag": "referral"}, 50,
                 L("Hum koi fund nahi batate — sirf jaankari. Nivesh ki salah SEBI RIA se lein.",
                   "We never name a fund — information only. Take investment advice from a SEBI RIA."))


BUILDERS = {"deficit": _deficit, "protected_obligation": _deficit, "lender": _lender, "protect_earner": _protect,
            "penalties": _penalties, "resilience": _resilience, "grow": _grow}


def cards(needs: list[dict], ctx: dict) -> list[dict]:
    return [BUILDERS[n["kind"]](n, ctx) for n in needs]
