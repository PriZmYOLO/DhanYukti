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
