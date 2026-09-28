# Setup

Requirements: Node 20+ (tested on 26), Python 3.11+ (tested on 3.14).

## Backend
```bash
cd api
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env          # leave empty for replay mode; fill sandbox creds for live
.venv/bin/uvicorn app.main:app --reload --port 8000
.venv/bin/pytest -q           # golden-fixture tests
```
Check: `curl localhost:8000/api/health` → `mode` shows `live` or `replay` per sponsor.

## Web
```bash
cd web
npm install
npm run dev                   # http://localhost:3000
```
`API_ORIGIN` (server-side only) defaults to `http://127.0.0.1:8000`.

## Going live with sponsor sandbox (Anish + Harshal)
1. Open the sandbox email; note base URLs, keys, test mobile numbers, test banks.
2. Fill `api/.env`. Restart API. `/api/capabilities` should show `live`.
3. Confirm route paths / header names in `connectors/*/client.py` (`TODO(confirm…)`).
4. Set `ANUMATI_CALLBACK_URL` to the public HTTPS API URL (use a tunnel locally).
5. Run one consent → approve → fetch → revoke. Save a redacted fixture to `api/app/fixtures/replay_aa_fetch.json`.

## Demo shortcuts
- `http://localhost:3000/?demo=A` (or `B`, `C`) skips onboarding and opens that household.
- `POST /api/admin/reset` resets consents, game and corrections for everyone. Team only: it needs `X-Admin-Token` = `ADMIN_RESET_TOKEN` (403 otherwise). Run `ADMIN_RESET_TOKEN=… API_URL=… web/scripts/reset-demo.sh`; never put the token in git or a `NEXT_PUBLIC_` variable.

## Phone testing
Same Wi-Fi: `npm run dev -- -H 0.0.0.0`, open `http://<laptop-ip>:3000` on the Android phone, "Add to Home screen".
