# API

The exact request/response shapes live in **[API_CONTRACT.md](API_CONTRACT.md)** — that file is the source of truth; `web/src/lib/types.ts` mirrors it. Change the contract first, then both sides.

## Endpoint summary
| Area | Endpoints |
|---|---|
| Meta | `GET /api/health`, `GET /api/capabilities` |
| Household | `GET /api/households`, `GET /api/households/{id}/dashboard`, `POST .../simulate`, `POST .../correct` |
| Consent | `GET /api/consent/passport/{hid}`, `POST /api/consent/dpdp`, `POST /api/consent/aa/start`, `GET .../{handle}/status`, `POST .../approve-sandbox` (replay only), `POST .../fetch`, `POST .../revoke`, `POST /api/consent/aa/callback` |
| Game | `POST /api/game/{hid}/event` |
| Companion | `POST /api/ask` |

## Sponsor connectors (behind `connectors/base.py`)
| Sponsor | Calls | Env |
|---|---|---|
| Anumati (AA) | create consent · status · FI request/fetch · revoke · callback | `ANUMATI_BASE_URL`, `ANUMATI_CLIENT_ID`, `ANUMATI_CLIENT_SECRET`, `ANUMATI_FIU_ID`, `ANUMATI_CALLBACK_URL`, `ANUMATI_REDIRECT_URL` |
| Perfios | analytics (categories, salary/EMI, bounces) · Hub: electricity, RC, ration, EPF | `PERFIOS_BASE_URL`, `PERFIOS_SECURE_ID`, `PERFIOS_SECURE_CREDENTIAL`, `PERFIOS_ORG_ID` |

Route paths and header names are constants marked `TODO(confirm with sandbox docs)` in each client. If credentials are missing or a live call fails, the connector falls back to **replay** and responses carry `mode: "replay"` — we say so aloud to judges.

## Consent request we send
Purpose: personal finance management · FI types: DEPOSIT, RECURRING_DEPOSIT, INSURANCE_POLICIES · range: last 6 months · fetch: periodic monthly · expiry: 90 days · data life: 1 day (raw deleted within 24 h).

## Errors
JSON `{detail}` with HTTP status. The client shows a friendly Hindi message and the Madad route; it never shows raw errors.
