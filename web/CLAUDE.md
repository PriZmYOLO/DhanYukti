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
- `/api/households/me/*`, `/api/game/me/event`, `/api/ask/me`,
  `/api/consent/passport/me` — the linked member's OWN household ("me").
  Built by the FastAPI engines (E02, `/api/twin/*`, stateless) from their
  own AA data while it is here (≤ 24 h); the twin (derived facts) and their
  jars/game/corrections live in the KV store per session
  (`src/lib/server/twin/`). Never falls back to a demo household: errors come
  back with a code (`not_linked`, `data_pending`, `data_expired`,
  `twin_insufficient`, `engine_unreachable`) and `MyHouseholdIssue` explains.
  Demo households A/B/C appear only when someone picks one (splash chips,
  Family tab, `?demo=`).

Server code lives in `src/lib/server/`. Live consent terms: `src/lib/aa/live-terms.ts`
(keep in step with `ONBOARDING_CONSENT` in `src/lib/server/aa/fiu-client.ts`).
Everything else under `/api` goes to FastAPI at `API_ORIGIN`; when that is
unreachable the screens fall back to demo data.

Onboarding's "connect bank" step uses the live flow when `/api/aa/status`
reports credentials, storage and `NEXT_PUBLIC_AA_LIVE=true`
(client: `src/lib/aa-live.ts`); otherwise it keeps the FastAPI replay
simulation (`/anumati`). DPDP toggles also write to the Value Ledger via
`src/lib/dpdp-ledger.ts`. Call `ensureSession()` (`src/lib/session.ts`)
before any new stateful `/api/aa` or `/api/dpdp` call.
