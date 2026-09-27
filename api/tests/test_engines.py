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
    assert s["message"]["hi"] == ("Fee aage badhane se ₹3,000 ki kami khatam. Par salary se pehle ₹2,500 safety floor "
                                  "se kam rahega — 5 din ₹200 kam kharch karein ya Gullak use karein.")
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
    assert n["if_not"]["en"] == "You may need an app loan, costing about ₹150–₹300."
    assert n["second_step"]["hi"] == "Fee badhne ke baad bhi ₹2,500 kam — 5 din ₹200 kam kharch, ya Gullak se."
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
    assert ls["KreditBee"]["on_rbi_list"]
    assert effective_annual_pct(34000, 300000, 15) > 36
    n2 = db["nba"][1]
    assert n2["tier"] == 1 and n2["action"]["type"] == "cheaper_option"
    assert "sachet_url" in n2["action"]["payload"] and "rbi_dla_url" in n2["action"]["payload"]


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
