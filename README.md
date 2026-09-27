# DhanYukti (धनयुक्ति)

Phone-first, voice-first money companion for Tier 2/3 Indian families. Uses consented Account Aggregator data (Anumati) and Perfios analytics to warn a family about a cash crunch, debt trap or protection gap before it happens — and gives one simple next step in Hindi or English.

| Folder | What |
|---|---|
| `web/` | Next.js 16 PWA — landing/login portal (`/`), web app (`/app`), works on phone and laptop |
| `api/` | FastAPI — engines (E01–E16), Anumati + Perfios connectors with replay fallback |
| `docs/` | PRD, API contract, design, content, sponsor APIs, plan, tracker |

## Run
```bash
# API
cd api && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --port 8000

# Web
cd web && npm install && npm run dev   # http://localhost:3000
```
The web app falls back to bundled demo data if the API is unreachable. Sponsor credentials go only in `api/.env` (see `api/.env.example`).

Demo households: Sunita (Panipat), Farida (Indore), Meena (Coimbatore) — pick one on the landing page.
