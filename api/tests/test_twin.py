"""Household Twin (E02) for a linked member: every engine runs on THEIR statement, never a fixture."""
from datetime import date

from fastapi.testclient import TestClient

from app.engines import e02_twin
from app.main import app

client = TestClient(app)
AS_OF = "2026-09-28"


def _statement(months=12, balance=24000.0, schemes=False):
    """Twelve months of a salaried member's savings account (same shape as the mock FIU module)."""
    txns = []
    y, m = 2026, 9
    for k in range(months, 0, -1):
        mm = m - k
        yy = y + (mm - 1) // 12
        mm = (mm - 1) % 12 + 1

        def day(n):
            return date(yy, mm, n).isoformat()

        txns += [
            {"date": day(1), "narration": "SALARY ACME TEXTILES PVT LTD", "amount": 35000.0},
            {"date": day(5), "narration": "UPI/RENT/ANIL KUMAR", "amount": -9000.0},
            {"date": day(7), "narration": "ACH/NACH BAJAJ FIN EMI", "amount": -4200.0},
            {"date": day(12), "narration": "UPI/BESCOM ELECTRICITY BILL", "amount": -(1450.0 + (k % 3) * 120)},
        ]
        txns += [{"date": day(8 + j * 2), "narration": "UPI/KIRANA STORE", "amount": -(350.0 + ((j * 137 + k * 59) % 900))}
                 for j in range(8)]
        if k % 3 == 2:
            txns.append({"date": day(20), "narration": "UPI/SCHOOL FEE/ST MARYS", "amount": -5000.0})
        if schemes and mm == 5:
            txns.append({"date": day(28), "narration": "PMJJBY PREMIUM RENEWAL", "amount": -436.0})
    # September so far (as_of 28 Sep)
    txns += [
        {"date": "2026-09-01", "narration": "SALARY ACME TEXTILES PVT LTD", "amount": 35000.0},
        {"date": "2026-09-05", "narration": "UPI/RENT/ANIL KUMAR", "amount": -9000.0},
        {"date": "2026-09-07", "narration": "ACH/NACH BAJAJ FIN EMI", "amount": -4200.0},
        {"date": "2026-09-12", "narration": "UPI/BESCOM ELECTRICITY BILL", "amount": -1570.0},
    ]
    return {"as_of": AS_OF, "fetched_at": "2026-09-28T09:00:00Z", "sandbox": True,
            "accounts": [{"id": "acct-1", "masked": "XXXXXXXX9648", "fip": "SBI-FIP-UAT", "type": "SAVINGS",
                          "balance": balance, "transactions": txns}],
            "profile": {"first_name": "TEST", "answers": {"earners": {"state": "answered", "value": 1},
                                                          "dependents": {"children": {"state": "answered", "value": 2},
                                                                         "children_in_school": {"state": "answered", "value": 1}}}}}


def _built(**kw):
    r = client.post("/api/twin/build", json=_statement(**kw)).json()
    assert r["status"] == "ready"
    return r["twin"], r["state"]


def test_build_projects_their_own_dates():
    twin, state = _built()
    ev = {(e["type"], e["date"]): e for e in twin["upcoming"]}
    assert ("salary", "2026-10-01") in ev and ev[("salary", "2026-10-01")]["amount"] == 35000
    assert ("rent", "2026-10-05") in ev and ev[("rent", "2026-10-05")]["certainty"] == "pakka"
    assert ("emi", "2026-10-07") in ev
    assert ("bill", "2026-10-12") in ev
    fee = next(e for e in twin["upcoming"] if e["type"] == "fee")
    assert fee["date"] == "2026-10-20" and fee["movable"] and fee["contact"]   # quarterly school fee
    assert twin["closing_balance"] == 24000 and twin["essentials_per_day"] > 0
    # no demo household leaks in
    assert twin["family_name"]["en"] == "Test's family" and twin["members"][0]["id"] == "me"
    assert [m["id"] for m in twin["members"]] == ["me", "child1", "child2"]
    # compute-then-delete: everyday rows are gone from the twin
    kinds = {r["kind"] for r in twin["_norm"]["rows"]}
    assert "grocery" not in kinds and "salary" in kinds
    assert state["jars"][0]["saved"] == 0 and state["game"]["points"] == 0


def test_dashboard_is_the_members_own():
    twin, state = _built()
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": state}).json()
    assert db["household"]["id"] == "me" and db["household"]["monthly_income"] == 35000
    assert db["data_source"]["mode"] == "live" and db["crosscheck"] == []
    assert db["river"]["days"][0]["balance"] == 24000 and db["river"]["days"][0]["date"] == AS_OF
    assert db["game"]["points"] == 0 and db["jars"][0]["kind"] == "emergency"
    assert db["metrics"]["debt_load"]["value"] == 12   # 4,200 EMI per 35,000 income
    names = {m["name"] for m in db["household"]["members"]}
    assert not names & {"Sunita", "Ramesh", "Farida", "Meena", "Arjun"}


def test_short_history_income_is_unknown_not_zero():
    p = _statement()
    p["accounts"][0]["transactions"] = [t for t in p["accounts"][0]["transactions"] if t["date"] >= "2026-09-01"]
    r = client.post("/api/twin/build", json=p).json()
    db = client.post("/api/twin/dashboard", json={"twin": r["twin"], "state": r["state"]}).json()
    assert db["household"]["monthly_income"] is None
    assert db["metrics"]["debt_load"]["value"] is None


def test_no_balance_is_insufficient():
    p = _statement(balance=None)
    r = client.post("/api/twin/build", json=p).json()
    assert r["status"] == "insufficient" and "twin" not in r


def test_simulate_correct_game_ask_on_twin():
    twin, state = _built()
    sim = client.post("/api/twin/simulate", json={"twin": twin, "state": state, "input": {"shock_amount": 30000}}).json()
    assert sim["river"]["days"][1]["balance"] < 24000 and "responses" in sim
    c = client.post("/api/twin/correct", json={"twin": twin, "state": state, "field": "safety_floor", "value": 6000}).json()
    assert c["dashboard"]["river"]["floor"] == 6000 and c["state"]["overlays"]["safety_floor"] == 6000
    g = client.post("/api/twin/game-event", json={"twin": twin, "state": state, "type": "gullak_deposit", "ref": "emergency", "amount": 200}).json()
    assert g["result"]["delta"] == 50 and g["state"]["jars"][0]["saved"] == 200
    a = client.post("/api/twin/ask", json={"twin": twin, "state": state, "question": "kitna kharch kar sakte hain", "lang": "hi"}).json()
    assert "₹" in a["answer"]["en"]


def test_own_pmjjby_counts_for_account_holder():
    twin, state = _built(schemes=True)
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": state}).json()
    me = next(p for p in db["protection_detail"] if p["member_id"] == "me")
    assert me["life"] is True


def test_payee_key():
    assert e02_twin.payee_key("UPI/RENT/ANIL KUMAR") == "RENT ANIL KUMAR"
    assert e02_twin.payee_key("ACH/NACH BAJAJ FIN EMI") == "BAJAJ FIN EMI"
    assert e02_twin.payee_key("NEFT CR SHREE KRISHNA TEXTILE MILLS SALARY") == "SHREE KRISHNA TEXTILE MILLS"


# ----------------------------------------------------------------------------------------------
# Confirm your bills: the member's own word on each repeating payment (series overlays)
# ----------------------------------------------------------------------------------------------
def _correct(twin, state, field, value, status=200):
    r = client.post("/api/twin/correct", json={"twin": twin, "state": state, "field": field, "value": value})
    assert r.status_code == status, r.text
    return r.json()


def _river_events(db):
    return [(day["date"], e) for day in db["river"]["days"] for e in day["events"]]


def test_every_projected_date_names_its_series_and_rhythm():
    twin, _ = _built()
    rent = [e for e in twin["upcoming"] if e["type"] == "rent"]
    assert rent and all(e["series"] == rent[0]["series"] and e["every"] == {"months": 1} for e in rent)
    fee = next(e for e in twin["upcoming"] if e["type"] == "fee")
    assert fee["every"] == {"months": 3}
    assert all(not e["id"].endswith(e["series"]) and e["id"].startswith(e["series"] + "_") for e in twin["upcoming"])


def test_confirm_marks_every_date_checked_and_keeps_bank_certainty():
    twin, state = _built()
    sid = next(e["series"] for e in twin["upcoming"] if e["type"] == "rent")
    c = _correct(twin, state, f"series:{sid}.status", "confirmed")
    rent = [e for _, e in _river_events(c["dashboard"]) if e.get("series") == sid]
    assert rent and all(e["checked"] == "confirmed" and e["certainty"] == "pakka" for e in rent)
    others = [e for _, e in _river_events(c["dashboard"]) if e.get("series") != sid]
    assert all("checked" not in e for e in others)


def test_ignore_takes_the_payment_out_of_every_engine():
    twin, state = _built()
    sid = next(e["series"] for e in twin["upcoming"] if e["type"] == "rent")
    before = client.post("/api/twin/dashboard", json={"twin": twin, "state": state}).json()
    c = _correct(twin, state, f"series:{sid}.status", "ignored")
    after = c["dashboard"]
    assert not any(e.get("series") == sid for _, e in _river_events(after))
    # ₹9,000 rent no longer leaves on 5 Oct: the balance after it is ₹9,000 higher
    b5 = next(x["balance"] for x in before["river"]["days"] if x["date"] == "2026-10-05")
    a5 = next(x["balance"] for x in after["river"]["days"] if x["date"] == "2026-10-05")
    assert a5 - b5 == 9000


def test_fix_amount_and_day_apply_to_every_date_and_say_you_told_us():
    twin, state = _built()
    sid = next(e["series"] for e in twin["upcoming"] if e["type"] == "rent")
    c = _correct(twin, state, f"series:{sid}.amount", 9500)
    c = _correct(twin, c["state"], f"series:{sid}.day", 3)
    c = _correct(twin, c["state"], f"series:{sid}.status", "confirmed")
    rent = [(dt, e) for dt, e in _river_events(c["dashboard"]) if e.get("series") == sid]
    assert rent and all(dt.endswith("-03") and e["amount"] == -9500 and e["checked"] == "corrected"
                        and e["certainty"] == "andaaza" for dt, e in rent)


def test_day_on_or_before_today_moves_to_the_next_rhythm_date():
    from app import pipeline
    twin, state = _built()
    rent = next(e for e in twin["upcoming"] if e["type"] == "rent")
    rent["date"] = "2026-09-30"           # due in two days; the member says "it's the 2nd"
    hh = pipeline.load_twin(twin, {**state, "overlays": {f"series:{rent['series']}.day": 2}})
    moved = next(e for e in hh["upcoming"] if e["id"] == rent["id"])
    assert moved["date"] == "2026-10-02"   # not 2 Sep, which is already past


def test_everyday_can_be_confirmed_but_not_ignored():
    twin, state = _built()
    _correct(twin, state, "series:everyday.status", "confirmed")
    _correct(twin, state, "series:everyday.status", "ignored", status=422)


def test_series_corrections_refuse_what_we_never_suggested_and_bad_values():
    twin, state = _built()
    sid = next(e["series"] for e in twin["upcoming"] if e["type"] == "rent")
    _correct(twin, state, "series:rent_nobody_0000.status", "confirmed", status=422)
    for field, value in [(f"series:{sid}.status", "maybe"), (f"series:{sid}.amount", 0), (f"series:{sid}.amount", -5),
                         (f"series:{sid}.amount", True), (f"series:{sid}.day", 32), (f"series:{sid}.day", 2.5),
                         (f"series:{sid}.colour", "red")]:
        _correct(twin, state, field, value, status=422)


def test_undo_is_no_decision_and_a_vanished_series_never_breaks_the_dashboard():
    twin, state = _built()
    sid = next(e["series"] for e in twin["upcoming"] if e["type"] == "rent")
    c = _correct(twin, state, f"series:{sid}.status", None)
    assert all("checked" not in e for _, e in _river_events(c["dashboard"]))
    # a decision kept from an older twin whose series is gone now
    st = {**state, "overlays": {"series:rent_old_payee_0000.status": "ignored"}}
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": st})
    assert db.status_code == 200


def test_older_twin_without_series_field_still_takes_decisions():
    twin, state = _built()
    for e in twin["upcoming"]:
        e.pop("series", None)
    rent_id = next(e["id"] for e in twin["upcoming"] if e["type"] == "rent")
    sid = rent_id.rsplit("_", 1)[0]
    c = _correct(twin, state, f"series:{sid}.status", "ignored")
    assert not any(e["type"] == "rent" for _, e in _river_events(c["dashboard"]))

# ---- what the member told us: fills gaps, never overrides the bank ------------------------------
def _a(v):
    return {"state": "answered", "value": v}


def _declared(**money):
    return {"own_income": _a("fixed"), "earners": _a(1),
            "dependents": {"children": _a(1)},
            "money": {k: _a(v) for k, v in money.items()}}


def _thin():
    """Only September so far: no complete month, no income ahead in the bank data."""
    p = _statement()
    p["accounts"][0]["transactions"] = [t for t in p["accounts"][0]["transactions"]
                                        if t["date"] >= "2026-09-01" and "SALARY" not in t["narration"]]
    r = client.post("/api/twin/build", json=p).json()
    return r["twin"], r["state"]


def test_declared_fills_thin_bank_data():
    twin, state = _thin()
    decl = _declared(cash=3000, income_amount=18000, income_frequency="monthly", next_pay="2026-10-03",
                     bill_name="School fee", bill_amount=2500, bill_due="2026-10-10")
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": state, "declared": decl}).json()
    ev = {e["id"]: e for d in db["river"]["days"] for e in d["events"]}
    inc = ev["declared_income_2026-10-03"]
    assert inc["amount"] == 18000 and inc["certainty"] == "andaaza" and "told" in inc["basis"]["en"]
    fee = ev["declared_bill_2026-10-10"]
    assert fee["type"] == "fee" and fee["amount"] == -2500 and fee["movable"]
    assert db["household"]["monthly_income"] == 18000          # was unknown
    assert "cash at home" in db["metrics"]["resilience_days"]["sub"]["en"]
    assert [m["id"] for m in db["household"]["members"]] == ["me", "child1"]
    # without the answers (no consent): back to the bank-only picture
    bare = client.post("/api/twin/dashboard", json={"twin": twin, "state": state}).json()
    assert bare["household"]["monthly_income"] is None
    assert not any(e["id"].startswith("declared_") for d in bare["river"]["days"] for e in d["events"])


def test_bank_wins_over_declared():
    twin, state = _built()
    decl = _declared(income_amount=99999, income_frequency="monthly", next_pay="2026-10-03",
                     bill_name="Rent", bill_amount=9000, bill_due="2026-10-06")
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": state, "declared": decl}).json()
    ids = {e["id"] for d in db["river"]["days"] for e in d["events"]}
    assert not any(i.startswith("declared_") for i in ids)    # bank shows salary on 1 Oct and rent on 5 Oct
    assert db["household"]["monthly_income"] == 35000


def test_income_varies_makes_pay_dates_estimates():
    twin, state = _built()
    decl = {"own_income": _a("varies")}
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": state, "declared": decl}).json()
    sal = next(e for d in db["river"]["days"] for e in d["events"] if e["type"] == "salary")
    assert sal["certainty"] == "andaaza" and "varies" in sal["basis"]["en"]


def test_no_income_of_my_own_only_when_bank_agrees():
    twin, state = _thin()
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": state, "declared": {"own_income": _a("none")}}).json()
    assert db["household"]["members"][0]["earner"] is False
    twin2, state2 = _built()   # bank shows salary: bank wins
    db2 = client.post("/api/twin/dashboard", json={"twin": twin2, "state": state2, "declared": {"own_income": _a("none")}}).json()
    assert db2["household"]["members"][0]["earner"] is True


def test_debt_unknown_without_a_complete_month_even_with_declared_income():
    twin, state = _thin()
    decl = _declared(income_amount=18000, income_frequency="monthly", next_pay="2026-10-03")
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": state, "declared": decl}).json()
    assert db["household"]["monthly_income"] == 18000 and db["metrics"]["debt_load"]["value"] is None


def test_declared_income_fills_after_member_ignores_a_bank_income():
    twin, state = _built()
    sal = next(e for e in twin["upcoming"] if e["type"] == "salary")
    sid = sal.get("series") or sal["id"].rsplit("_", 1)[0]
    c = client.post("/api/twin/correct", json={"twin": twin, "state": state, "field": f"series:{sid}.status", "value": "ignored"}).json()
    decl = _declared(income_amount=20000, income_frequency="monthly", next_pay="2026-10-04")
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": c["state"], "declared": decl}).json()
    ids = {e["id"] for d in db["river"]["days"] for e in d["events"]}
    assert "declared_income_2026-10-04" in ids


def test_twin_keeps_no_bank_narration_text():
    """Compute-then-delete: after the build, only derived payee labels remain (no refs, no raw text)."""
    import json
    p = _statement(schemes=True)
    raw = {t["narration"] for a in p["accounts"] for t in a["transactions"]}
    twin, _ = _built(schemes=True)
    blob = json.dumps(twin)
    assert not any(n in blob for n in raw if "/" in n or "PVT LTD" in n)
    assert "Rent Anil Kumar" in blob


def _with_app_loans(loans):
    """The member's statement plus app-loan cycles: (app narration, borrowed, repaid, disbursal date, repay date)."""
    p = _statement()
    for name, borrowed, repaid, d1, d2 in loans:
        p["accounts"][0]["transactions"] += [
            {"date": d1, "narration": f"UPI/{name}/LOAN DISBURSAL", "amount": float(borrowed)},
            {"date": d2, "narration": f"UPI/{name}/LOAN REPAY", "amount": -float(repaid)},
        ]
    r = client.post("/api/twin/build", json=p).json()
    assert r["status"] == "ready"
    return client.post("/api/twin/dashboard", json={"twin": r["twin"], "state": r["state"]}).json()


def test_lender_shield_never_accuses_a_real_lender_missing_from_our_copy():
    # RupeeRedee is detected as an app lender but is not in our 16-name copy of RBI's list.
    db = _with_app_loans([("RUPEEREDEE", 3000, 3340, "2026-08-10", "2026-08-25"),
                          ("KREDITBEE", 5000, 5120, "2026-08-12", "2026-09-11")])
    ls = {x["app"]: x for x in db["lender_shield"]}
    rr = ls["RupeeRedee"]
    assert rr["on_rbi_list"] is None and rr["rbi_list_status"] == "not_in_our_copy" and rr["confidence"] == "pata_nahi"
    assert rr["verdict"]["en"].startswith("Not in our copy of RBI's list — check it on RBI's site.")
    assert "Avoid" not in rr["verdict"]["en"] and "Not on RBI's list" not in rr["verdict"]["en"]
    assert "our rule, not RBI's" in rr["verdict"]["en"]
    assert ls["KreditBee"]["rbi_list_status"] == "in_our_copy" and "our rule, not RBI's" in ls["KreditBee"]["verdict"]["en"]
    card = next(n for n in db["nba"] if n["id"] == "nba_lender_shield")   # flagged for cost (our line), not the list
    assert "isn't on RBI's list" not in card["title"]["en"] and "Check it on RBI's list" in card["title"]["en"]
    assert card["why"]["confidence"] == "pata_nahi"
    assert "DhanYukti's rule (not RBI's)" in card["why"]["rule"]["en"]
    assert all(a["on_rbi_list"] is not False for a in card["action"]["payload"]["apps"])


def test_cheap_lender_missing_from_our_copy_is_unknown_not_risky():
    db = _with_app_loans([("LOANTAP", 10000, 10100, "2026-08-01", "2026-08-31")])
    (lt,) = db["lender_shield"]
    assert lt["on_rbi_list"] is None and not lt["above_our_cost_line"]
    assert "within DhanYukti's line" in lt["verdict"]["en"]
    assert not any(n["id"] == "nba_lender_shield" for n in db["nba"])
