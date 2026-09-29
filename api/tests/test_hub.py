"""Perfios Hub: live client shapes (from the hub.perfios.ai docs), derived facts, and how the engines use them."""
import copy

import pytest
from fastapi.testclient import TestClient

from app import connectors
from app.config import settings
from app.connectors.perfios import hub as hub_mod
from app.connectors.perfios.hub import HubLookupError, PerfiosHubClient
from app.engines import hub_facts
from app.main import app
from tests.test_twin import _built, _river_events

client = TestClient(app)
AS_OF = "2026-09-28"

# Real response from the Hub test environment (electricity, sample consumer, 29 Sep 2026), personal fields blanked.
ELEC = {"result": {"address": "", "amount_payable": "1722.04", "bill_amount": "1663.2", "bill_due_date": "10-10-2026",
                   "bill_no": "260811223363565", "consumer_name": "V SINGH", "consumer_number": "HW5274",
                   "email_address": "", "mobile_number": "", "total_amount": "", "bill_date": "",
                   "bill_issue_date": "07-09-2026"},
        "request_id": "6bc0702c-0114-4417-ac3f-682a2dcd0d5b", "status-code": "101"}
RATION = {"requestId": "r1", "statusCode": 101, "result": {
    "rcId": "12344556433", "state": "JHARKHAND", "district": "DUMKA", "fpsId": "1362012345", "schemeName": "AAY",
    "address": "DUMKA,KATHIKUND", "memberDetails": [{"memberName": "A", "uid": "Yes", "relationshipName": "SELF"},
                                                    {"memberName": "B", "uid": "Yes", "relationshipName": "OTHER"}]}}
EPF = {"status-code": "101", "request_id": "e2", "result": {
    "employee_details": {"member_name": "X", "father_name": "Y", "dob": "05-03-1990"},
    "est_details": [{"est_name": "ACME", "member_id": "MHBAN1", "doj_epf": "24-03-2021", "doe_epf": "",
                     "pf_balance": {"net_balance": 84000},
                     "passbook": [{"tr_date_my": "01-08-2026", "db_cr_flag": "C", "cr_ee_share": "1800"},
                                  {"tr_date_my": "01-07-2026", "db_cr_flag": "C", "cr_ee_share": "1800"}]}],
    "overall_pf_balance": {"pension_balance": 30000, "current_pf_balance": 84000}}}
RC = {"requestId": "v1", "statusCode": 101, "result": {
    "chassisNumber": "MBJ11", "engineNumber": "2KD9", "ownerName": "S SHUKLA", "presentAddress": "Thane",
    "financier": "HDFC BANK LTD", "insuranceUpto": "05-10-2026", "insurancePolicyNumber": "1105",
    "pucExpiryDate": "22-04-2027", "fitnessUpto": "29-12-2030", "taxPaidUpto": "31-Dec-2099",
    "vehicleClassDescription": "Goods Carrier(LGV)", "vehicleCatgory": "LGV", "rcStatus": "ACTIVE",
    "blackListStatus": "NA", "nationalPermitNumber": "", "statePermitNumber": "MH04/123"}}
CHALLAN = {"requestId": "c1", "statusCode": 101, "result": [
    {"totalAmount": 500, "challanNo": "X1", "challanDate": "2026-06-15 17:54:41", "paymentDateAndTime": "",
     "violatorName": "A", "status": "Pending"},
    {"totalAmount": 135, "challanNo": "X2", "challanDate": "2025-02-15 17:54:41",
     "paymentDateAndTime": "2025-02-15 05:02:25", "status": "DISPOSED"}]}
DL = {"requestId": "d1", "statusCode": 101, "result": {
    "name": "P PANDEY", "img": "/9j/4AAQ", "dob": "05-10-1994", "dlNumber": "MH0120130001960", "status": "Active",
    "validity": {"nonTransport": "08-01-2013 to 07-01-2033", "transport": "08-01-2023 to 20-10-2026"},
    "covDetails": [{"cov": "MCWG"}, {"cov": "LMV"}, {"cov": "TRANS"}], "address": [{"completeAddress": "Mumbai"}]}}
AGENT = {"requestId": "a1", "statusCode": 101, "result": [
    {"pan": "AHAPR6428A", "agentName": "VINOD   RUBEN", "insurerType": "Life", "insurer": "AEGON LIFE",
     "statusOfAgency": "Blacklisted", "dateOfAppointment": "01-04-2015"},
    {"pan": "AHAPR6428A", "agentName": "Vinod", "insurerType": "Life", "insurer": "MAX LIFE",
     "statusOfAgency": "Active", "dateOfAppointment": "14-02-2008"}]}

PERSONAL = ("V SINGH", "HW5274", "260811223363565", "S SHUKLA", "MBJ11", "2KD9", "1105", "Thane", "P PANDEY", "/9j/",
            "MH0120130001960", "DUMKA,KATHIKUND", "1362012345", "12344556433")


def _all_facts():
    e = {"board": "JBVNL", "consumer_no": "HW5274", "card_no": "12344556433", "uan": "100912345678",
         "reg_no": "MH04CY4545", "dl_no": "MH0120130001960"}
    return {
        "electricity": hub_facts.derive("electricity", ELEC["result"], as_of=AS_OF, entered=e),
        "ration": hub_facts.derive("ration", RATION["result"], as_of=AS_OF, entered=e),
        "epf": hub_facts.derive("epf", EPF["result"], as_of=AS_OF, entered=e),
        "rc": hub_facts.derive("rc", RC["result"], as_of=AS_OF, entered=e),
        "challan": hub_facts.derive("challan", CHALLAN["result"], as_of=AS_OF, entered=e),
        "dl": hub_facts.derive("dl", DL["result"], as_of=AS_OF, entered=e),
    }


# ----------------------------------------------------------------------------------------------
def test_derived_facts_keep_no_personal_details():
    facts = _all_facts()
    blob = repr(facts)
    for s in PERSONAL:
        assert s not in blob, s
    f = facts["electricity"]
    assert f["amount_due"] == 1722 and f["due_date"] == "2026-10-10" and f["bill_date"] == "2026-09-07"
    assert f["consumer"].endswith("5274") and f["provider"] == "JBVNL"
    assert facts["ration"] == {**facts["ration"], "scheme": "AAY", "priority": True, "members": 2, "state": "Jharkhand"}
    assert facts["epf"]["pf_balance"] == 84000 and facts["epf"]["active"] and facts["epf"]["last_contribution"] == "2026-08"
    rc = facts["rc"]
    assert rc["insurance_upto"] == "2026-10-05" and rc["financed"] and rc["commercial"] and rc["tax_upto"] == "2099-12-31"
    assert facts["challan"]["pending"] == 1 and facts["challan"]["pending_amount"] == 500
    assert facts["dl"]["valid_t"] == "2026-10-20" and facts["dl"]["valid_nt"] == "2033-01-07"


def test_date_and_money_parsing():
    assert hub_facts.parse_date("13-Mar-2024") == "2024-03-13"
    assert hub_facts.parse_date("31-Dec-2099") == "2099-12-31"
    assert hub_facts.parse_date("2025-02-15 17:54:41") == "2025-02-15"
    assert hub_facts.parse_date("NA") is None and hub_facts.parse_date("") is None
    assert hub_facts.money("1943.0") == 1943 and hub_facts.money("₹1,234.5") == 1234 and hub_facts.money("") is None


def test_biller_date_replaces_our_projection_and_is_pakka():
    twin, state = _built()
    hub = {"electricity": _all_facts()["electricity"]}
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": state, "hub": hub}).json()
    bills = [(dt, e) for dt, e in _river_events(db) if "lectric" in str(e.get("label")) or "BESCOM" in str(e.get("label"))
             or e.get("biller")]
    dates = [dt for dt, _ in bills]
    assert "2026-10-10" in dates and "2026-10-12" not in dates, bills
    ev = next(e for dt, e in bills if dt == "2026-10-10")
    assert ev["amount"] == -1722 and ev["certainty"] == "pakka" and "biller" in ev["basis"]["en"]
    assert any(r["kind"] == "electricity" for r in db["records"])
    # without the consent-gated facts the member's own projection is back
    db2 = client.post("/api/twin/dashboard", json={"twin": twin, "state": state}).json()
    assert "2026-10-12" in [dt for dt, e in _river_events(db2) if e["type"] == "bill"] and db2["records"] == []


def test_overdue_bill_becomes_a_note_not_a_river_event():
    twin, state = _built()
    f = {**_all_facts()["electricity"], "due_date": "2026-09-20"}
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": state, "hub": {"electricity": f}}).json()
    assert db["records_notes"] and "1,722" in db["records_notes"][0]["en"]
    assert not any(e.get("biller") for _, e in _river_events(db))


def test_epf_is_locked_savings_and_edli_is_life_cover():
    twin, state = _built()
    base = client.post("/api/twin/dashboard", json={"twin": twin, "state": state}).json()
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": state, "hub": {"epf": _all_facts()["epf"]}}).json()
    # PF never counts as spendable: days covered is unchanged, and says so
    assert db["metrics"]["resilience_days"]["value"] == base["metrics"]["resilience_days"]["value"]
    assert "not counted" in db["metrics"]["resilience_days"]["sub"]["en"]
    me = next(p for p in db["protection_detail"] if p["member_id"] == "me")
    assert me["life"] and "EDLI" in me["note"]["en"]
    assert "no life cover seen" not in db["metrics"]["protection"]["sub"]["en"]


def test_aay_ration_card_points_to_ayushman():
    twin, state = _built()
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": state, "hub": {"ration": _all_facts()["ration"]}}).json()
    assert "AAY" in db["metrics"]["protection"]["sub"]["en"]


def test_vehicle_and_licence_tasks():
    twin, state = _built()
    f = _all_facts()
    hub = {k: f[k] for k in ("rc", "challan", "dl")}
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": state, "hub": hub}).json()
    ids = [n["id"] for n in db["nba"]]
    ins = next(n for n in db["nba"] if n["id"].startswith("nba_vehicle_insurance"))
    assert ins["tier"] == 2 and ins["action"]["type"] == "link" and "05-10-2026" in ins["title"]["en"]
    assert "work vehicle" in ins["body"]["en"]
    assert any(i.startswith("nba_challans") for i in ids) and any(i.startswith("nba_licence") for i in ids)
    lic = next(n for n in db["nba"] if n["id"].startswith("nba_licence"))
    assert "commercial" in lic["title"]["en"] and lic["tier"] == 2
    assert not any(i.startswith("nba_puc") for i in ids)   # PUC valid till April 2027


def test_simulate_and_correct_carry_hub_facts():
    twin, state = _built()
    hub = {"electricity": _all_facts()["electricity"]}
    r = client.post("/api/twin/correct", json={"twin": twin, "state": state, "hub": hub, "field": "essentials_per_day", "value": 400})
    assert r.status_code == 200 and any(e.get("biller") for _, e in _river_events(r.json()["dashboard"]))
    s = client.post("/api/twin/simulate", json={"twin": twin, "state": state, "hub": hub, "input": {"shock_amount": 2000}})
    assert s.status_code == 200


# ----------------------------------------------------------------------------------------------
# the live client and the lookup endpoint (network stubbed)
# ----------------------------------------------------------------------------------------------
def _client_with(responses: dict, calls: list):
    c = PerfiosHubClient({"PERFIOS_SECURE_ID": "u", "PERFIOS_SECURE_CREDENTIAL": "p", "PERFIOS_ORG_ID": "o"})

    def fake(method, path, *, json=None, files=None, data=None):
        calls.append((path, json))
        return copy.deepcopy(responses[path])
    c.request = fake
    return c


def test_client_uses_documented_paths_and_bodies():
    calls = []
    c = _client_with({"/v2/elec": ELEC, "/v3/rc-advanced": RC, "/v3/ration-details": RATION}, calls)
    assert c.base == "https://hub-test.perfios.ai/ssp/kyc/api"
    assert c.electricity("HW5274", "JBVNL", "HARMU")["result"]["amount_payable"] == "1722.04"
    c.rc("MH04CY4545")
    c.ration("12344556433")
    assert calls[0] == ("/v2/elec", {"consumer_id": "HW5274", "service_provider": "JBVNL", "district": "HARMU", "consent": "Y"})
    assert calls[1] == ("/v3/rc-advanced", {"registrationNumber": "MH04CY4545", "version": 3.1, "consent": "Y"})
    assert calls[2][1]["rationCardNumber"] == "12344556433" and calls[2][1]["consent"] == "Y"
    h = c._headers("rid")
    assert h["x-secure-id"] == "u" and h["x-secure-cred"] == "p" and h["x-organization-id"] == "o"


def test_client_raises_on_not_found():
    c = _client_with({"/v2/elec": {"status-code": "103", "request_id": "x"}}, [])
    with pytest.raises(HubLookupError) as e:
        c.electricity("AB12", "BESCOM")
    assert e.value.code == "not_found"


@pytest.fixture
def live_hub(monkeypatch):
    calls = []
    responses = {"/v2/elec": ELEC, "/v3/rc-advanced": RC, "/v3/rc-challan": CHALLAN, "/v3/dl": DL,
                 "/v3/irda-verification": AGENT, "/v3/ration-details": RATION,
                 "/v2/epf-get-otp": {"status-code": "101", "request_id": "otp-req-1234", "result": {"message": "sent"}},
                 "/v2/epf-get-passbook": EPF}
    monkeypatch.setattr(type(settings), "hub_mode", property(lambda self: "live"))
    monkeypatch.setattr(connectors, "hub", lambda: _client_with(responses, calls))
    return calls


def _lookup(kind, inp, status=200):
    r = client.post(f"/api/twin/hub/{kind}", json={"as_of": AS_OF, "input": inp})
    assert r.status_code == status, r.text
    return r.json()


def test_lookup_returns_derived_facts_only(live_hub):
    r = _lookup("electricity", {"board": "jbvnl", "consumer_no": "hw 5274", "district": "Harmu"})
    assert r["ok"] and r["facts"]["electricity"]["amount_due"] == 1722
    assert "V SINGH" not in repr(r)
    v = _lookup("rc", {"reg_no": "mh-04-cy-4545"})
    assert set(v["facts"]) == {"rc", "challan"} and v["facts"]["challan"]["pending"] == 1
    assert live_hub[-2][0] == "/v3/rc-advanced" and live_hub[-1] == ("/v3/rc-challan", {"vehicleNo": "MH04CY4545", "consent": "Y"})
    dl = _lookup("dl", {"dl_no": "MH01 20130001960", "dob": "1994-10-05"})
    assert dl["facts"]["dl"]["valid_t"] == "2026-10-20" and live_hub[-1][1]["dob"] == "05-10-1994"
    ag = _lookup("agent", {"pan": "ahapr6428a"})
    assert ag["agent"]["any_active"] and ag["agent"]["records"][0]["name"] == "Vinod Ruben"
    assert not ag["agent"]["records"][0]["active"]


def test_epf_two_step_otp(live_hub):
    r = _lookup("epf_otp", {"uan": "100912345678"})
    assert r == {"ok": True, "otp_sent": True, "request_id": "otp-req-1234"}
    p = _lookup("epf", {"request_id": "otp-req-1234", "otp": "123456", "uan": "100912345678"})
    assert p["facts"]["epf"]["pf_balance"] == 84000 and p["facts"]["epf"]["uan"].endswith("5678")
    assert live_hub[-1] == ("/v2/epf-get-passbook", {"request_id": "otp-req-1234", "otp": "123456", "is_pdf_required": "n",
                                                     "partial_data": "n", "epf_balance": "y", "consent": "Y"})
    _lookup("epf", {"request_id": "otp-req-1234", "otp": "12"}, status=422)


def test_lookup_validates_input_and_needs_district(live_hub):
    _lookup("electricity", {"board": "JBVNL", "consumer_no": "HW5274"}, status=422)       # JBVNL needs a district
    _lookup("electricity", {"board": "BESCOM", "consumer_no": "x"}, status=422)
    _lookup("agent", {"pan": "123"}, status=422)
    _lookup("nope", {}, status=404)
    assert live_hub == []   # nothing reached Perfios


def test_tamil_nadu_drops_the_discom_code(live_hub):
    _lookup("electricity", {"board": "CHENNAI_NORTH", "consumer_no": "01123456789"})
    assert live_hub[-1][1]["consumer_id"] == "123456789"


def test_not_found_and_outage_are_codes_not_demo_data(monkeypatch):
    monkeypatch.setattr(type(settings), "hub_mode", property(lambda self: "live"))
    monkeypatch.setattr(connectors, "hub", lambda: _client_with({"/v2/elec": {"status-code": "103"}}, []))
    assert _lookup("electricity", {"board": "BESCOM", "consumer_no": "AB1234"}) == {"ok": False, "code": "not_found"}

    from app.connectors.base import SponsorError

    def down(*a, **k):
        raise SponsorError("x", 402, "r", "perfios")
    c = _client_with({}, [])
    c.request = down
    monkeypatch.setattr(connectors, "hub", lambda: c)
    r = _lookup("electricity", {"board": "BESCOM", "consumer_no": "AB1234"})
    assert r["ok"] is False and r["code"] == "hub_credits" and r["upstream_status"] == 402

    def refused(*a, **k):
        e = SponsorError("x", 401, "r", "perfios")
        e.reason = "Invalid credentials"
        raise e
    c.request = refused
    r = _lookup("electricity", {"board": "BESCOM", "consumer_no": "AB1234"})
    assert r["code"] == "hub_auth" and r["upstream_reason"] == "Invalid credentials" and "secure_id" in r
    assert "PERFIOS_SECURE_CREDENTIAL" not in repr(r)


def test_without_creds_the_lookup_says_so():
    if settings.hub_mode == "live":
        pytest.skip("creds present in this environment")
    assert _lookup("ration", {"card_no": "12344556433"}) == {"ok": False, "code": "hub_not_configured"}


def test_demo_households_stay_replay_and_epf_copy_is_honest(monkeypatch):
    monkeypatch.setattr(type(settings), "hub_mode", property(lambda self: "live"))
    monkeypatch.setattr(connectors, "hub", lambda: (_ for _ in ()).throw(AssertionError("live hub used for a demo")))
    r = client.post("/api/enrich/A/epf", json={"consent": True}).json()
    assert r["mode"] == "replay" and "never counted as spendable" in r["used_for"]["en"]
    assert hub_mod.PATHS["epf_otp"] == "/v2/epf-get-otp"


PNG = {"result": {"Bill_No": "4000256445202503", "Due_Date": "12-10-2026", "Bill_Amount": "1943.0", "mobile": "",
                  "Customer_Address": "", "Bill_Date": "20-09-2026", "Email": "", "Customer_Name": "SYED SARWAR HUSAIN  "},
       "request_id": "07ff593f", "status-code": "101"}


def test_png_gas_bill_lookup_and_river(live_hub, monkeypatch):
    calls = []
    monkeypatch.setattr(connectors, "hub", lambda: _client_with({"/v2/png": PNG}, calls))
    r = _lookup("png", {"provider": "ag", "consumer_no": "1000082138"})
    f = r["facts"]["png"]
    assert f["provider_name"] == "Adani Gas" and f["amount_due"] == 1943 and f["due_date"] == "2026-10-12"
    assert "SYED" not in repr(r) and calls[-1] == ("/v2/png", {"service_provider": "AG", "consumer_id": "1000082138", "bp_no": "", "consent": "Y"})
    _lookup("png", {"provider": "IG", "consumer_no": "123"}, status=422)   # IGL needs a BP number
    twin, state = _built()
    db = client.post("/api/twin/dashboard", json={"twin": twin, "state": state, "hub": {"png": f}}).json()
    gas = [(dt, e) for dt, e in _river_events(db) if e.get("biller")]
    assert gas == [("2026-10-12", gas[0][1])] and gas[0][1]["amount"] == -1943
    assert any(r["kind"] == "png" for r in db["records"])


def test_ration_lookup_endpoint(live_hub):
    r = _lookup("ration", {"card_no": "12344556433"})
    assert r["facts"]["ration"]["scheme"] == "AAY" and "KATHIKUND" not in repr(r)
