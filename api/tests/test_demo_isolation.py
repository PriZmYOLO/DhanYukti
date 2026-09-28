"""Each visitor gets their own demo households: one visitor's taps never change another's demo."""
from fastapi.testclient import TestClient

from app import store
from app.main import app

client = TestClient(app)
JUDGE = {"X-DY-Demo": "judge-0000-1111"}
OTHER = {"X-DY-Demo": "other-2222-3333"}


def setup_function():
    store.reset_all()


def _dash(h=None):
    return client.get("/api/households/A/dashboard", headers=h or {}).json()


def test_stop_replay_consent_only_affects_that_visitor():
    before = _dash(OTHER)["data_source"]["mode"]
    r = client.post("/api/consent/aa/cn_a_seed/revoke", headers=JUDGE).json()
    assert r["status"] == "REVOKED"
    assert _dash(JUDGE)["data_source"]["mode"] == "fixture"
    assert _dash(OTHER)["data_source"]["mode"] == before == "replay"
    assert _dash()["data_source"]["mode"] == "replay"          # shared copy untouched too
    p = client.get("/api/consent/passport/A", headers=OTHER).json()
    assert all(c["status"] == "ACTIVE" for c in p["aa"])


def test_corrections_and_gullak_are_per_visitor():
    client.post("/api/households/A/correct", headers=JUDGE, json={"field": "closing_balance", "value": 100})
    client.post("/api/game/A/event", headers=JUDGE, json={"type": "gullak_deposit", "ref": "emergency", "amount": 500})
    j, o = _dash(JUDGE), _dash(OTHER)
    assert j["river"]["days"][0]["balance"] == 100 and o["river"]["days"][0]["balance"] == 6000
    assert j["jars"][0]["saved"] == 2900 and o["jars"][0]["saved"] == 2400
    assert j["game"]["points"] > o["game"]["points"]


def test_bad_visitor_ids_fall_back_to_shared_copy():
    client.post("/api/households/A/correct", headers={"X-DY-Demo": "x"}, json={"field": "closing_balance", "value": 777})
    assert _dash()["river"]["days"][0]["balance"] == 777        # too short: shared copy (scripts/tests)
    assert _dash(JUDGE)["river"]["days"][0]["balance"] == 6000


def test_admin_reset_needs_token_and_clears_everyone(monkeypatch):
    client.post("/api/households/A/correct", headers=JUDGE, json={"field": "closing_balance", "value": 100})
    assert client.post("/api/admin/reset", headers=JUDGE).status_code == 403     # no token: refused
    monkeypatch.setenv("ADMIN_RESET_TOKEN", "t0ken")
    assert client.post("/api/admin/reset", headers={"X-Admin-Token": "nope"}).status_code == 403
    assert client.post("/api/admin/reset", headers={"X-Admin-Token": "t0ken"}).status_code == 200
    assert _dash(JUDGE)["river"]["days"][0]["balance"] == 6000


def test_forget_drops_only_the_callers_copy():
    client.post("/api/households/A/correct", headers=JUDGE, json={"field": "closing_balance", "value": 100})
    client.post("/api/households/A/correct", headers=OTHER, json={"field": "closing_balance", "value": 200})
    assert client.post("/api/demo/forget", headers=JUDGE).json()["forgotten"] is True
    assert _dash(JUDGE)["river"]["days"][0]["balance"] == 6000
    assert _dash(OTHER)["river"]["days"][0]["balance"] == 200
    assert client.post("/api/demo/forget").json()["forgotten"] is False   # no id: shared copy never dropped
