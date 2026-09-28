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

Confirm your bills (E02 with a consent step): `src/lib/server/aa/recurrence.ts`
(E02 detection, saved with the summary), `bills.ts` (member decisions) and
`outlook.ts` (light E03/E05/E14 over confirmed items only), served by
`/api/aa/links/[linkId]/bills` and shown on the reveal step
(`src/components/ConfirmBills.tsx`). Only items the member confirmed are
projected, only when the link allows "Use in household calculations", and
every decision is a Value Ledger entry. Checks: `scripts/aa-bills-check.ts`
(in `test:engine`) and the bills journey in `scripts/aa-summary-check.mjs`.

Onboarding's "connect bank" step uses the live flow when `/api/aa/status`
reports credentials, storage and `NEXT_PUBLIC_AA_LIVE=true`
(client: `src/lib/aa-live.ts`); otherwise it keeps the FastAPI replay
simulation (`/anumati`). DPDP toggles also write to the Value Ledger via
`src/lib/dpdp-ledger.ts`. Call `ensureSession()` (`src/lib/session.ts`)
before any new stateful `/api/aa` or `/api/dpdp` call.
