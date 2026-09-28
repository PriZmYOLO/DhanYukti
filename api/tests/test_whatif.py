"""What-if (E17) golden values for household A. Numbers here are the demo's source of truth."""
from fastapi.testclient import TestClient

from app import pipeline, store
from app.main import app

client = TestClient(app)


def setup_function():
    store.reset()


def _events(river):
    return {e["id"]: e for day in river["days"] for e in day["events"]}


def test_before_figures_on_same_baseline():
    s = pipeline.simulate("A", shock_amount=4000)
    assert s["gap_before"] == 3000 and s["min_balance_before"] == -3500 and s["min_date_before"] == "2026-09-29"
    assert s["resilience_before"] == 12
    # §30 emergency case: first deficit comes earlier but smaller; the lowest point is deeper
    assert s["gap_after"] == 1500 and s["river"]["min_balance"] == -7500
    assert s["first_deficit_date"] == "2026-09-27" and s["first_deficit_date_before"] == "2026-09-28"


def test_certainty_from_bank_data():
    ev = _events(pipeline.dashboard("A")["river"])
    assert ev["fee_school"]["certainty"] == "pakka" and ev["salary_sep"]["certainty"] == "pakka"
    evb = _events(pipeline.dashboard("B")["river"])
    assert evb["gig_sep28"]["certainty"] == "andaaza"   # payouts move around
    assert evb["rent_oct"]["certainty"] == "pakka"


def test_moved_fee_is_conditional_and_keeps_original_date():
    s = pipeline.simulate("A", moves=[{"event_id": "fee_school", "new_date": "2026-09-30"}])
    assert s["gap_after"] == 0
    (c,) = s["conditional"]
    assert c["id"] == "fee_school" and c["original_date"] == "2026-09-28" and c["moved"] is True
    assert "St. Mary's" in c["needs"]["en"]


def test_responses_baseline_fee_move_fixes():
    s = pipeline.simulate("A")
    r = {x["id"]: x for x in s["responses"]}
    assert r["move:fee_school"]["fixes"] and r["move:fee_school"]["conditional"]
    assert not r["cut"]["fixes"] and not r["gullak"]["fixes"]
    assert s["feasible"] is True


def test_no_feasible_option_for_big_shock():
    s = pipeline.simulate("A", shock_amount=20000)
    assert s["feasible"] is False
    assert all(not x["fixes"] for x in s["responses"])


def test_goal_impact_when_jar_used():
    gi = pipeline.simulate("A", shock_amount=4000)["goal_impact"]
    assert gi["jar_id"] == "emergency" and gi["saved_before"] == 2400 and gi["saved_after"] == 0
    assert gi["gap_before"] == 12600 and gi["gap_after"] == 15000


def test_loan_incomplete_terms_never_shows_total():
    r = client.post("/api/households/A/simulate",
                    json={"purchase": {"amount": 30000, "pay": "loan", "loan": {"annual_rate_pct": 24}}}).json()
    assert r["loan"]["complete"] is False
    assert set(r["loan"]["missing"]) == {"months", "processing_fee"}
    assert "total_cost" not in r["loan"] and "emi" not in r["loan"]
    assert r["gap_after"] == r["gap_before"]   # no guessed cash flow


def test_loan_complete_terms():
    r = client.post("/api/households/A/simulate", json={"purchase": {
        "amount": 30000, "pay": "loan", "loan": {"annual_rate_pct": 24, "months": 12, "processing_fee": 500}}}).json()
    ln = r["loan"]
    assert ln["complete"] and ln["emi"] == 2837 and ln["total_cost"] == 34544 and ln["extra_over_price"] == 4544
    assert ln["debt_per100_before"] == 14 and ln["debt_per100_after"] == 23


def test_cash_purchase_hits_tomorrow():
    r = client.post("/api/households/A/simulate", json={"purchase": {"amount": 2000, "pay": "cash"}}).json()
    assert r["river"]["days"][1]["balance"] == 6000 - 500 - 2000
    assert r["river"]["min_balance"] == -5500


def test_jars_expose_remaining_and_target():
    j = pipeline.dashboard("A")["jars"][0]
    assert j["remaining"] == 12600 and j["target_date"] == "2027-07-31"
