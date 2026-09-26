# Account Aggregator integration (Anumati FIU module)

Job 1 of the finals plan: a real consent → fetch → decrypt flow on the
Anumati UAT sandbox, shown inside DhanYukti. This page is the runbook.

## Status (27 Sep)

- **Storage:** Upstash Redis `dhanyukti-aa` (Free plan, Mumbai `bom1`) is
  connected to the Vercel project.
- **Storage variables:** `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_URL`,
  `REDIS_URL` and `KV_REST_API_READ_ONLY_TOKEN` are set for all
  environments. They are not yet marked Sensitive. Follow-up: mark them
  Sensitive and remove them from Development.
- The tokens were rotated once after creation.
- Production was redeployed; `/api/aa/status` shows `storage: "redis"` and
  `storage_ready: true`.
- **Still pending:** `ANUMATI_CLIENT_ID` / `ANUMATI_CLIENT_SECRET` from
  Anumati, `NEXT_PUBLIC_AA_LIVE=true` (then redeploy), and webhook
  registration with Anumati. Until then Production runs the labelled demo
  adapter.

Never put the values of these variables in this repository, the docs, logs
or chat.

## How it works

```
Browser (DhanYukti)          DhanYukti server (Vercel)            Anumati FIU module (UAT)
 /privacy/connect ──POST /api/aa/links──▶ link recorded (choices only)
 mobile number ────POST …/approval──────▶ POST /module/initiate/consent ─▶ 202 { redirectUrl }
 "Open Anumati" (new tab) ─────────────────────────────────────────────▶ customer approves
                                         ◀── POST /api/aa/webhooks/consent  { status: ACTIVE }
                                         ◀── POST /api/aa/webhooks/data-ready { id, secret }
                                         POST /module/fi/fetch ─────────────▶ encrypted sessions
                                         decrypt (Node, lib/server/aa/crypto.ts), parse ReBIT,
                                         store accounts for 30 days
 page polls GET /api/aa/links/{id} ◀──── status, accounts, balances, "What happened" trail
```

- The browser never receives the client secret, consent handle, module
  reference, retrieval id/secret or raw data. It gets `SourceLink` only.
- A browser is identified by an httpOnly `dy_aa_session` cookie. This is not
  authentication; it only keeps one browser's links apart until H01 sign-in.
- Revoke deletes DhanYukti's copy and refuses late results. The FIU module
  has no revoke call, so the consent itself is ended in the Anumati app.
- Decryption runs in Node because Vercel can't run Java. It was verified
  against Anumati's `fiu-crypto-lib.jar` in both directions on 27 Sep 2026
  (`node scripts/aa-crosscheck.mjs <jar>`).

## Files

| Path (under `web/`)                   | What                                                    |
| ------------------------------------- | ------------------------------------------------------- |
| `lib/server/aa/fiu-client.ts`         | Calls to the FIU module; the consent body we send       |
| `lib/server/aa/links.ts`              | Link records, webhooks, collect + decrypt, revoke       |
| `lib/server/aa/crypto.ts`             | curve25519 ECDH → HKDF-SHA256 → AES-256-GCM             |
| `lib/server/aa/rebit.ts`              | ReBIT DEPOSIT (JSON or XML) → balances, transactions    |
| `lib/server/aa/store.ts`              | Upstash Redis (Vercel) or in-memory (local)             |
| `app/api/aa/*`                        | Routes, incl. `webhooks/data-ready`, `webhooks/consent` |
| `lib/provisional/h03/live-adapter.ts` | `ConsentPort` for the screens                           |
| `lib/aa/live-terms.ts`                | Terms shown before consent (must match fiu-client)      |
| `scripts/mock-fiu-module.mjs`         | Local mock of the FIU module for rehearsal              |
| `scripts/aa-crosscheck.mjs`           | Proves Node crypto matches Anumati's jar                |

## Go live on Vercel (once Anumati replies)

1. **Storage:** Vercel → Storage / Marketplace → add **Upstash Redis** to the
   project. It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or the
   `UPSTASH_REDIS_REST_*` pair). Without it, webhooks and pages can't share
   state and the routes answer "storage not set up".
2. **Environment variables** (Production), from Anumati:
   - `ANUMATI_CLIENT_ID`, `ANUMATI_CLIENT_SECRET`
   - `ANUMATI_BASE_URL` (optional; default `https://fiu-module-uat.anumati.co.in`)
   - `ANUMATI_KEY_ESCROW=true` (UAT default)
   - `NEXT_PUBLIC_AA_LIVE=true` (switches the screens from demo to live)
3. **Redeploy** (the `NEXT_PUBLIC_` flag is fixed at build time).
4. Open `https://dhan-yukti.vercel.app/api/aa/status`. Expect
   `credentials_configured: true`, `storage: "redis"`, `storage_ready: true`,
   `live_ui_enabled: true`.
5. Webhook URLs registered with Anumati:
   - data-ready: `https://dhan-yukti.vercel.app/api/aa/webhooks/data-ready`
   - consent lifecycle: `https://dhan-yukti.vercel.app/api/aa/webhooks/consent`
6. Run it: Privacy → Link your bank → tick "Read your bank data" → the test
   mobile number from Anumati → Open Anumati → approve with the test OTP →
   back in DhanYukti the card turns Active with accounts, balances and dates.
7. **Record a video of a successful run immediately** (demo fallback).

If something fails, the Vercel function logs show `[aa] …` lines with
shortened references and the provider's HTTP status (never secrets or data).
If data arrived but couldn't be decrypted, the encrypted payload is kept for
24 hours under `aa:raw:<link id>` so it can be re-opened with the jar.

## Rehearse locally without credentials

```bash
cd web
node scripts/mock-fiu-module.mjs            # terminal 1, port 4010
ANUMATI_BASE_URL=http://localhost:4010 ANUMATI_CLIENT_ID=mock-id \
ANUMATI_CLIENT_SECRET=mock-secret NEXT_PUBLIC_AA_LIVE=true npm run dev   # terminal 2
```

The mock shows a page labelled "LOCAL MOCK — not Anumati". A mobile number
ending in 0 makes the second account fail (partial state). Never demo the
mock as the real sandbox.

## Still open (asked of Anumati, 27 Sep)

- Credentials, webhook registration, test mobile + OTP, JWS signing.
- Where the user lands after approving (return URL). Until known, Anumati
  opens in a new tab and the DhanYukti tab updates itself.
- Revoke/pause in UAT and whether the lifecycle webhook fires.
- Periodic (104) re-fetch via `/module/initiate/fetch` is implemented in the
  client but not wired to a screen; the demo uses one-time consent (103).
