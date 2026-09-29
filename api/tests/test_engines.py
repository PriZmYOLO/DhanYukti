"""Golden-fixture tests. Numbers here are the demo's source of truth."""
from fastapi.testclient import TestClient

from app import pipeline, store
from app.engines import e03_cashflow as e03
from app.engines.common import inr
from app.engines.e01_normalise import classify, normalise
from app.engines.e04_debt import effective_annual_pct
from app.fixtures.households import get_household
from app.main import app

client = TestClient(app)


def setup_function():
    store.reset()


def _bal(river):
    return {d["date"]: d["balance"] for d in river["days"]}


def test_inr_format():
    assert inr(3000) == "₹3,000"
    assert inr(150000) == "₹1,50,000"
    assert inr(-3500) == "-₹3,500"


def test_river_A_baseline_exact():
    hh = pipeline.load("A")
    run = e03.run(hh)
    b = _bal(run["river"])
    assert b["2026-09-23"] == 6000
    assert b["2026-09-24"] == 5500
    assert b["2026-09-25"] == 5000
    assert b["2026-09-26"] == 4500
    assert b["2026-09-27"] == 2500
    assert b["2026-09-28"] == -3000
    assert b["2026-09-29"] == -3500
    assert b["2026-09-30"] == 26000
    assert len(run["river"]["days"]) == 30
    assert run["river"]["gap"] == 3000
    assert run["first_deficit"]["date"] == "2026-09-28"
    assert run["river"]["floor"] == 4000


def test_simulate_move_fee_A():
    s = pipeline.simulate("A", moves=[{"event_id": "fee_school", "new_date": "2026-09-30"}])
    b = _bal(s["river"])
    assert all(v >= 0 for v in b.values())
    assert b["2026-09-29"] == 1500
    assert b["2026-09-30"] == 26000
    assert s["gap_before"] == 3000
    assert s["gap_after"] == 0
    assert s["scenario"] is True
    # the daily cut is Sunita's own: ₹500/day everyday spend, at most a third (₹160), for the 6 days to the lowest point
    assert s["message"]["hi"] == ("Fee aage badhane se ₹3,000 ki kami khatam. Par salary se pehle ₹2,500 safety floor "
                                  "se kam rahega. 6 din roz ₹160 kam kharch — ₹500 ki jagah ₹340. "
                                  "Isse bhi ₹1,540 kam rahega — baaki Gullak ya parivaar se.")
    assert "₹2,500" in s["message"]["en"]


def test_simulate_shock_and_delay_A():
    s = pipeline.simulate("A", shock_amount=1000)
    assert _bal(s["river"])["2026-09-24"] == 4500
    assert s["gap_after"] == 4000
    s2 = pipeline.simulate("A", salary_delay_days=2)
    assert _bal(s2["river"])["2026-09-30"] < 0
    s3 = pipeline.simulate("A", cut_per_day=200)
    assert _bal(s3["river"])["2026-09-24"] == 5700


def test_hero_nba_A():
    db = pipeline.dashboard("A")
    n = db["nba"][0]
    assert n["tier"] == 1 and n["severity"] == "red" and n["icon"] == "school"
    assert n["title"]["hi"] == "28 tareekh ko ₹3,000 kam padenge"
    assert n["title"]["en"] == "You'll be ₹3,000 short on the 28th"
    assert n["body"]["hi"] == "School fee (₹5,000) salary se 2 din pehle hai."
    assert n["body"]["en"] == "The school fee comes 2 days before salary."
    assert n["task"]["hi"] == "School se fee 30 tareekh tak badhane ki request bhejein. Hum message likh denge."
    # from her own past app loans (₹460 on ₹8,000), not a made-up range
    assert n["if_not"]["en"] == "You may need an app loan — at your past app loans' cost, about ₹170 interest on ₹3,000."
    assert n["second_step"]["en"] == ("Even after moving the fee, you're ₹2,500 below your safety floor. 6 days, ₹160 less each day — "
                                      "₹340 instead of ₹500. That still leaves ₹1,540 short — the rest from the Gullak or family.")
    assert n["second_step"]["hi"] == ("Fee badhne ke baad bhi safety floor se ₹2,500 kam. 6 din roz ₹160 kam kharch — "
                                      "₹500 ki jagah ₹340. Isse bhi ₹1,540 kam rahega — baaki Gullak ya parivaar se.")
    assert n["action"]["type"] == "message"
    assert n["action"]["payload"]["to"] == "School (St. Mary's, Panipat)"
    assert set(n["action"]["payload"]["text"]) == {"hi", "en"}
    assert n["why"]["rule"]["hi"] == "Salary 30 ko aati hai, fee 28 ko hai"
    assert n["why"]["confidence"] == "pakka" and n["why"]["tag"] == "jaankari"
    saw = {(t["date"], t["amount"]) for t in n["why"]["saw"]}
    assert {("2026-08-30", 30000), ("2026-07-30", 30000), ("2026-08-28", -5000), ("2026-08-27", -1500)} <= saw
    assert 3 <= len(n["why"]["saw"]) <= 5


def test_lender_shield_A():
    db = pipeline.dashboard("A")
    ls = {x["app"]: x for x in db["lender_shield"]}
    q = ls["QuickRupee"]
    assert not q["on_rbi_list"] and q["borrowed"] == 3000 and q["charges"] == 340 and q["days"] == 15
    assert q["effective_annual_pct"] == 276
    assert q["rbi_list_status"] == "not_on_list" and q["verdict"]["en"].startswith("Not on RBI's list (demo).")
    assert ls["KreditBee"]["on_rbi_list"] and ls["KreditBee"]["rbi_list_status"] == "in_our_copy"
    assert "our rule, not RBI's" in ls["KreditBee"]["verdict"]["en"]
    assert effective_annual_pct(34000, 300000, 15) > 36
    n2 = db["nba"][1]
    assert n2["tier"] == 1 and n2["action"]["type"] == "cheaper_option"
    assert "sachet_url" in n2["action"]["payload"] and "rbi_dla_url" in n2["action"]["payload"]
    assert "DhanYukti's rule (not RBI's)" in n2["why"]["rule"]["en"]


def test_metrics_A():
    db = pipeline.dashboard("A")
    m = db["metrics"]
    assert m["safe_to_spend"]["value"] == 0 and m["safe_to_spend"]["status"] == "red"
    assert m["safe_to_spend"]["sub"]["hi"] == "Sirf zaroori kharch (₹500/din)"
    assert m["debt_load"]["value"] == 14
    assert 10 <= m["resilience_days"]["value"] <= 13
    assert m["protection"]["status"] in ("amber", "red")
    assert db["household"]["monthly_income"] == 30000
    tiers = [n["tier"] for n in db["nba"]]
    assert tiers == sorted(tiers)
    assert any(n["id"] == "nba_penalties" and n["tier"] == 3 for n in db["nba"])
    spend_total = sum(s["amount"] for s in db["spend"])
    assert 27000 <= spend_total <= 31000
    assert db["game"]["points"] == 340 and db["game"]["level"] == 2 and db["game"]["streak"] == 6
    assert [j["saved"] for j in db["jars"]] == [2400, 1200, 900]


def test_own_transfer_never_income():
    hh = get_household("A")
    assert classify("IMPS/SELF/TRF FROM RAMESH YADAV XX4521", 2000) == "own_transfer"
    norm = normalise(hh["transactions"], hh["as_of"], hh["accounts"])
    assert norm["monthly_income_p"] == 30000 * 100
    assert norm["penalty_6m_p"] == 590 * 100


def test_household_B_and_C():
    b = pipeline.dashboard("B")
    assert b["nba"][0]["tier"] == 2 and b["nba"][0]["action"]["type"] == "protect"
    assert b["nba"][0]["title"]["hi"].startswith("Ghar ki akeli kamane wali — ₹436 saal mein ₹2 lakh ka jeevan bima (PMJJBY)")
    assert b["river"]["gap"] == 0
    assert b["household"]["monthly_income"] == 26000
    c = pipeline.dashboard("C")
    assert c["nba"][0]["tier"] == 4 and c["nba"][0]["why"]["tag"] == "referral"
    assert c["nba"][0]["title"]["hi"] == "₹52,000 bekaar pade hain"
    assert c["household"]["monthly_income"] == 38000


def test_api_endpoints_smoke():
    assert client.get("/api/health").json()["ok"]
    assert len(client.get("/api/households").json()) == 3
    assert client.get("/api/households/A/dashboard").status_code == 200
    r = client.post("/api/households/A/correct", json={"field": "essentials_per_day", "value": 400}).json()
    assert r["ok"] and r["dashboard"]["river"]["days"][1]["balance"] == 5600
    assert client.post("/api/households/A/correct", json={"field": "nope", "value": 1}).status_code == 422
    st = client.post("/api/consent/aa/start", json={"household_id": "A", "member_id": "sunita", "mobile": "9999999999"}).json()
    h = st["consent_handle"]
    assert st["status"] == "PENDING" and st["mode"] == "replay"
    assert client.get(f"/api/consent/aa/{h}/status").json()["status"] == "PENDING"
    assert client.get(f"/api/consent/aa/{h}/status").json()["status"] == "ACTIVE"
    f = client.post(f"/api/consent/aa/{h}/fetch").json()
    assert f["ok"] and f["accounts"] == 2 and f["transactions"] > 50 and len(f["steps"]) == 7
    rv = client.post(f"/api/consent/aa/{h}/revoke").json()
    assert rv["status"] == "REVOKED"
    assert client.get("/api/households/A/dashboard").status_code == 200
    g = client.post("/api/game/A/event", json={"type": "gullak_deposit", "ref": "emergency", "amount": 100}).json()
    assert g["delta"] == 50 and g["jars"][0]["saved"] == 2500
    c1 = client.post("/api/game/A/event", json={"type": "checkin"}).json()
    c2 = client.post("/api/game/A/event", json={"type": "checkin"}).json()
    assert c1["delta"] == 5 and c2["delta"] == 0 and c1["streak"] == 7
    a = client.post("/api/ask", json={"household_id": "A", "question": "Agar fee 30 ko dein to?", "lang": "hi"}).json()
    assert "₹3,000" in a["answer"]["hi"] and a["tag"] == "jaankari"
    assert client.get("/api/capabilities").status_code == 200
    assert client.get("/api/consent/passport/A").json()["dpdp"]


def test_enrich_requires_consent_and_returns_replay():
    r = client.post("/api/enrich/A/electricity", json={"consent": False, "input": {}})
    assert r.status_code == 403
    for kind in ("electricity", "rc", "ration", "epf"):
        r = client.post(f"/api/enrich/A/{kind}", json={"consent": True, "input": {}}).json()
        assert r["kind"] == kind and r["mode"] == "replay" and r["result"] and set(r["used_for"]) == {"hi", "en"}
    assert client.get("/api/consent/passport/A").json()["dpdp"][3]["granted"] is True  # electricity
    assert client.post("/api/enrich/A/aadhaar_raw", json={"consent": True}).status_code == 404


def test_bsa_upload_replay():
    pdf = b"%PDF-1.4\n1 0 obj << /Type /Page >> endobj\n%%EOF"
    r = client.post("/api/bsa/upload", files={"file": ("stmt.pdf", pdf, "application/pdf")}, data={"household_id": "B"})
    body = r.json()
    assert r.status_code == 200 and body["mode"] == "replay" and body["status"] == "COMPLETED" and body["report_id"]
    bad = client.post("/api/bsa/upload", files={"file": ("x.pdf", b"hello", "application/pdf")})
    assert bad.status_code == 415


def test_capabilities_lists_every_api():
    caps = client.get("/api/capabilities").json()
    apis = " | ".join(c["api"] for c in caps)
    for needle in ("Consent create", "Consent status", "Consent artefact", "FI request", "FI fetch", "revoke",
                   "notification", "categorisation", "salary / EMI", "BSA: initiate", "BSA: upload", "BSA: status",
                   "BSA: retrieve", "electricity", "RC Advanced", "ration", "EPF", "DigiLocker"):
        assert needle in apis, needle
    assert all(c["status"] in ("live", "replay", "blocked", "untested") for c in caps)


def test_live_failure_falls_back_to_replay(monkeypatch):
    from app import connectors
    from app.connectors.anumati.client import AnumatiClient
    from app.connectors.perfios.hub import PerfiosHubClient

    cfg_a = {k: "x" for k in ("ANUMATI_CLIENT_ID", "ANUMATI_CLIENT_SECRET", "ANUMATI_FIU_ID",
                               "ANUMATI_CALLBACK_URL", "ANUMATI_REDIRECT_URL")}
    cfg_a["ANUMATI_BASE_URL"] = "http://127.0.0.1:9"  # nothing listens here
    cfg_p = {"PERFIOS_BASE_URL": "http://127.0.0.1:9", "PERFIOS_SECURE_ID": "x", "PERFIOS_SECURE_CREDENTIAL": "x",
             "PERFIOS_ORG_ID": "x"}
    monkeypatch.setattr(connectors, "aa", lambda mode=None: AnumatiClient(cfg_a, timeout=1))
    monkeypatch.setattr(connectors, "hub", lambda: PerfiosHubClient(cfg_p, timeout=1))
    st = client.post("/api/consent/aa/start", json={"household_id": "A", "member_id": "ramesh", "mobile": "9000000000"}).json()
    assert st["mode"] == "replay" and st["status"] == "PENDING"
    r = client.post("/api/enrich/A/epf", json={"consent": True}).json()
    assert r["mode"] == "replay"


# ---------------------------------------------------------------------------------------------
# No fixed "₹200 less for 5 days": every plan comes from the household's own numbers
# ---------------------------------------------------------------------------------------------
from app.engines import e03_cashflow as _e03  # noqa: E402
from app.engines import e17_whatif as _e17  # noqa: E402


def test_cut_plan_uses_the_households_own_everyday_spend():
    hh = pipeline.load("A")
    hh["essentials_per_day"] = 330            # the review's example member
    plan = _e17.cut_plan(hh, target="gap")
    assert plan["per_day_now"] == 330
    assert plan["cut_per_day"] == 110 and plan["per_day_after"] == 220      # capped at a third of ₹330
    assert plan["days"] == 5 and plan["until"] == "2026-09-28"             # tomorrow .. the deficit day
    river = _e03.run(hh, cut_per_day=plan["cut_per_day"])["series"]
    low = min(x["balance_p"] for x in river if x["date"] <= plan["until"])
    assert plan["left_after"] * 100 == -low and not plan["fixes"]         # what the river says, not arithmetic
    text = _e17.cut_text(plan)
    assert "₹330" in text["en"] and "₹220" in text["en"] and "₹500" not in text["en"] and "₹300" not in text["en"]


def test_cut_plan_is_the_smallest_cut_that_closes_the_gap():
    hh = pipeline.load("A")
    hh["closing_balance"] += 2500             # ₹500 short on the 28th instead of ₹3,000
    plan = _e17.cut_plan(hh, target="gap")
    assert plan["fixes"] and plan["left_after"] == 0 and plan["cut_per_day"] == 100   # ₹500 over 5 days
    river = _e03.run(hh, cut_per_day=plan["cut_per_day"] - 10)["series"]
    assert min(x["balance_p"] for x in river if x["date"] <= plan["until"]) < 0        # ₹90 wouldn't do


def test_cut_plan_unknown_spend_gives_no_numbers():
    hh = pipeline.load("A")
    hh["essentials_per_day"] = 0
    assert _e17.cut_plan(hh, target="gap") is None
    hh = pipeline.load("A")
    hh["essentials_known"] = False
    assert _e17.cut_plan(hh, target="gap") is None


def test_deficit_plan_card_carries_the_households_own_plan():
    hh = pipeline.load("A")
    hh["essentials_per_day"] = 330
    for e in hh["upcoming"]:
        if e["type"] == "fee":
            e["movable"] = False                 # nothing to move: the card offers the spending plan
    ctx = pipeline.compute(hh)
    card = next(n for n in ctx["nba"] if n["action"]["type"] == "plan" and "gap" in n["action"]["payload"])
    plan = card["action"]["payload"]["cut_plan"]
    assert plan["per_day_now"] == 330 and plan["cut_per_day"] == 110


def test_whatif_cut_option_is_the_households_own_cut():
    hh = pipeline.load("A")
    hh["essentials_per_day"] = 330
    scen = _e03.run(hh)
    cut = next(r for r in _e17.responses(hh, {}, scen)["responses"] if r["kind"] == "cut")
    assert cut["label"]["en"] == "Spend ₹110 less a day" and cut["plan"]["per_day_now"] == 330


def test_reminder_is_the_day_before_their_own_emi():
    hh = pipeline.load("A")
    for e in hh["upcoming"]:
        if e["type"] == "emi":
            e["date"] = e["date"][:8] + "17"      # their EMI moves to the 17th
    ctx = pipeline.compute(hh)
    card = next((n for n in ctx["nba"] if n["id"] == "nba_penalties"), None)
    if card:
        rem = card["action"]["payload"]["reminders"]
        assert rem and rem[0]["day"] == 16
