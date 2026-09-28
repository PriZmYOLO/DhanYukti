"""POST /api/admin/reset is team-only: it needs X-Admin-Token = ADMIN_RESET_TOKEN."""
from fastapi.testclient import TestClient

from app import store
from app.main import app

client = TestClient(app)


def test_reset_refused_when_env_unset(monkeypatch):
    monkeypatch.delenv("ADMIN_RESET_TOKEN", raising=False)
    assert client.post("/api/admin/reset").status_code == 403
    assert client.post("/api/admin/reset", headers={"X-Admin-Token": "anything"}).status_code == 403


def test_reset_refused_with_wrong_or_missing_header(monkeypatch):
    monkeypatch.setenv("ADMIN_RESET_TOKEN", "team-only-test-token")
    assert client.post("/api/admin/reset").status_code == 403
    assert client.post("/api/admin/reset", headers={"X-Admin-Token": "wrong"}).status_code == 403


def test_reset_works_with_the_token(monkeypatch):
    monkeypatch.setenv("ADMIN_RESET_TOKEN", "team-only-test-token")
    store.STATE["consents"]["h-test"] = {"household_id": "A", "status": "ACTIVE"}
    r = client.post("/api/admin/reset", headers={"X-Admin-Token": "team-only-test-token"})
    assert r.status_code == 200 and r.json() == {"ok": True}
    assert "h-test" not in store.STATE["consents"]
