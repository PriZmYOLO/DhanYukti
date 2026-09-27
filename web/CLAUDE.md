@AGENTS.md

## Live integrations (served by Next.js, not FastAPI)

These route handlers run inside this app and take precedence over the
FastAPI proxy (`fallback` rewrite in `next.config.ts`):

- `/api/aa/*` — live Anumati Account Aggregator flow. The webhooks
  `/api/aa/webhooks/data-ready` and `/api/aa/webhooks/consent` are registered
  with Anumati against dhan-yukti.vercel.app; do not move them.
- `/api/dpdp/*` — DPDP consent ledger.
- `/api/engine/cover/*` — insurance cover engine (product-neutral).
- `/api/voice/nudge` — Bhashini voice.

Server code lives in `src/lib/server/`. Live consent terms: `src/lib/aa/live-terms.ts`
(keep in step with `ONBOARDING_CONSENT` in `src/lib/server/aa/fiu-client.ts`).
Everything else under `/api` goes to FastAPI at `API_ORIGIN`; when that is
unreachable the screens fall back to demo data.
