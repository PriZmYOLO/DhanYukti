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

Confirm your bills (E02 with a consent step) runs on the twin: each projected
date carries its `series` (same payee, kind and account) and rhythm (`every`);
the member's decisions are overlays `series:<id>.status|amount|day` (and
`series:everyday.status` + `essentials_per_day`) applied in
`api/app/pipeline.py`, so they cover every date and survive a rebuild while
the twin exists. They are deleted with the bank data (stop/revoke) and on a
fresh build after the twin is gone (`withoutBankCorrections`,
`src/lib/server/twin/keys.ts`): corrections name payments, so they share the
30-day cap. Twin rows keep a derived payee label, never the bank narration.
`/api/households/me/bills` (`src/lib/server/twin/bills.ts`) lists and records
them, each as a Value Ledger entry (`bill:<hash>`, no payee or amount); the
reveal step shows `ConfirmBills`. Checks: `api/tests/test_twin.py` and
`npm run test:my-bills` (mock bank + Next.js + FastAPI).

A household is several people's OWN bank links. Every link records whose account
it is (`LinkRecord.member`: "me", a family member added on this phone, or
`inv-<code>` from an invite used on the member's own phone, which sets
`household_sid` to the inviter's session) and the level THAT person chose:
`poora`, `sirf_total` (E02 `hide_totals`: money counts, payees/apps/account
numbers never leave the engines) or `private` (never sent to the engines).
`buildTwin` merges this session's links + `listJoinedLinks`. Anyone may make a
link show less (`/api/aa/links/[id]/sharing`); showing more is refused — the
owner links again with their own Anumati OTP. Check: `npm run test:household`.

Records from Perfios Hub (`/api/households/me/hub/[kind]`, `src/lib/server/twin/hub.ts`):
the member's own electricity/gas bill, ration card, EPF (OTP), vehicle RC + e-challans and
driving licence, each behind its own DPDP purpose (electricity, gas, ration, epf, rc, dl; the
call grants it with `consent: true`). FastAPI `/api/twin/hub/{kind}` makes the live call and
returns derived facts only (no names, addresses, photos); they are kept 30 days per session,
sent to the engines as `hub` with every twin call, and deleted when the purpose is withdrawn.
The IRDAI agent check (`agent`) stores nothing. Demo households A/B/C always replay.
Checks: `api/tests/test_hub.py`.

No hand-typed rupee figures reach a member. A daily spending cut comes from
E17 `cut_plan` (their own everyday spend, capped at a third — DhanYukti's rule —
checked on their own river up to the day the shortfall bites; None when spend is
unknown). Support contacts come only from `NEXT_PUBLIC_SUPPORT_PHONE` /
`NEXT_PUBLIC_GRIEVANCE_EMAIL` (`src/lib/support.ts`); unset = no phone shown.
Offline demo snapshot: `api/scripts/refresh_demo_nba.py`.

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
