# Account Aggregator integration (Anumati FIU module)

Job 1 of the finals plan: a real consent → fetch → decrypt flow on the
Anumati UAT sandbox, shown inside DhanYukti. This page is the runbook.

## Status (28 Sep): live on Anumati UAT, verified

- **Credentials:** Production has `ANUMATI_CLIENT_ID` (config),
  `ANUMATI_CLIENT_SECRET` (Secret) and `NEXT_PUBLIC_AA_LIVE=true`.
  Anumati confirmed webhook registration for our client.
- **Deployment check:** `/api/aa/status` shows `credentials_configured`,
  `live_ui_enabled` and `storage_ready` all `true`, with `storage: "redis"`.
- **Verified end to end on 28 Sep** (production logs, `[aa]` lines):
  `consent_started` → lifecycle `ACTIVE` → data-ready `collected`
  `status: "complete"` (runs with 5 and 2 accounts). The link card turned
  Active with accounts and balances; revoking from
  `https://uat-web.anumati.co.in` flipped it to revoked.
- **UAT test journey:** any mobile number → Anumati's default UAT OTP (in
  the team chat) → pick **ACME Bank** → OTP again → approve.
- **UAT facts from Anumati:** no return URL in UAT (the consent opens in a
  new tab); ACME supports DEPOSIT, TERM-DEPOSIT, RECURRING_DEPOSIT,
  EQUITIES, MUTUAL_FUNDS, SIP; 12 months of data; XML format; schema at
  https://api.rebit.org.in/schema.
- **Demo note:** run the demo in Chrome, not an embedded browser pane, so
  the Anumati tab opens separately and the DhanYukti tab keeps its session.
- **Storage:** Upstash Redis `dhanyukti-aa` (Free plan, Mumbai `bom1`).
  `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_URL`, `REDIS_URL` and
  `KV_REST_API_READ_ONLY_TOKEN` are set for all environments (tokens rotated
  once).
- **Follow-ups:** verify `x-jws-signature` (signing is enabled for our
  client); mark the `KV_*` variables Sensitive and drop Development; ask
  Anumati to rotate the client secret after 30 Sep.

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
                                         store data 24 h + derived facts ≤ 30 days
 page polls GET /api/aa/links/{id} ◀──── status, accounts, balances, "What happened" trail
```

- The browser never receives the client secret, consent handle, module
  reference, retrieval id/secret or raw data. It gets `SourceLink` only.
- A browser is identified by an httpOnly `dy_aa_session` cookie. This is not
  authentication; it only keeps one browser's links apart until H01 sign-in.
- Revoke deletes DhanYukti's copy and refuses late results. The FIU module
  has no revoke call, so the consent itself is ended in the Anumati app
  (the revoke screens link to it: `lib/aa/anumati-app.ts`).
- Retention: Decrypted bank data is deleted 24 hours after it arrives. Only a few derived facts are kept, until you revoke or for at most 30 days. Decrypted data lives under `aa:data:<link>`
  (`RAW_DATA_TTL` = 24 h); the reveal summary is stored beside it under
  `aa:summary:<link>` (`SUMMARY_TTL` = 30 days). Both go on revoke. After 24 h
  the scheme check, cover hints and policy tags answer `expired` ("Bank data
  is deleted 24 hours after fetching. Link again to refresh."), never "not
  seen" or 0; the summary route keeps serving the derived copy. Balances on
  the link record are dropped after 30 days too.
- "Delete everything" (`POST /api/me/delete`) revokes and removes every
  link of the session, withdraws every granted DPDP purpose and deletes
  reports; the Value Ledger stays. Checked by
  `scripts/privacy-retention-check.ts` (part of `npm run test:engine`).
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

## Reveal summary

After a live approval, onboarding's reveal step shows "From your bank via
Anumati (sandbox)" from `GET /api/aa/links/{id}/summary`
(`lib/server/aa/summary.ts`): balances, data window, monthly inflow,
recurring debits and the Jan Suraksha result, each with its source. It then
says the rest of the demo uses the demo household's data, labelled "Demo".
Check it with `npm run test:aa-summary` (mobile ending in 3 in the mock
gives 40 days of history, so inflow is "unknown").

## Government insurance check (Job 2a)

After data arrives, the link card and the post-approval screen show a
**Government insurance check** (PMJJBY ₹436/yr → ₹2L life, joining age
18–50; PMSBY ₹20/yr → ₹2L accident, 18–70; figures from the Department of
Financial Services).

- Rule: `lib/server/schemes/jan-suraksha.ts` (pure function). Route:
  `GET /api/aa/links/{id}/scheme-check`. Contract:
  `lib/contracts/scheme-check.ts`. Card: `components/consent/scheme-check-card.tsx`.
- **Consent-gated:** runs only if the member turned on "Alerts and suggested
  actions" when linking. Otherwise the card says the check wasn't run.
- A premium counts as seen only from a debit whose narration names the
  scheme (PMJJBY, PMSBY, Jeevan Jyoti, Suraksha Bima, or "Jan Suraksha" with
  a matching amount). Amount alone never counts.
- "No premium seen" needs the data to cover a 20 May – 15 Jun renewal
  window; otherwise the answer is "Can't tell", never "not enrolled".
- The card always says it only sees linked accounts (it may be paid from
  another), shows the evidence date and amount, and says DhanYukti earns
  nothing from public schemes, which come before any private insurance.
- Age comes from the bank profile's date of birth, reduced to an age when
  stored; the date itself isn't kept.
- Mock: a mobile number ending in **5** gives a household that already pays
  both premiums (renewal-reminder case); any other number gives the
  "₹456 a year for ₹4 lakh" suggestion.

**Demo line:** "Before any private product, we check government cover. It
costs ₹456 a year for ₹4 lakh, we earn nothing from it, and we only ran the
check because the user allowed suggestions."

## Existing insurance and the DPDP link (upgrade to Job 2a)

The insurance card now also lists **private premiums** found in the linked
bank data (`lib/server/insurance/`): the insurer is matched on the debit
narration and classed by its IRDAI licence (life / general / standalone
health). Two policies with the same insurer are told apart by premium size.
Frequency (monthly…yearly) comes from how often it was paid.

Who a policy covers and what kind it is (health, life, motor…) are **only
what the member tells us**, saved under DPDP consent "Who your insurance
covers" (`PUT /api/aa/links/{id}/policies/{key}`). The card offers that
consent inline; granting it writes a receipt to the Value Ledger;
withdrawing deletes every tag at once. The kinds offered are limited by the
insurer's licence (a life insurer can't sell motor cover).

With private cover present, the government-scheme suggestion is framed as a
low-cost top-up, not "you're uninsured". DhanYukti never recommends or
sells a private product.

Mock: a mobile number ending in **7** gives the team's example household
(HDFC ERGO, ICICI Lombard, ACKO, Axis Max Life monthly, SBI General).

## DPDP consent, Value Ledger, Consent Passport (Job 2b)

- `/privacy/notice`: the itemised DPDP notice (`lib/dpdp/notice.ts`), one
  card per purpose with purpose, data, retention, processor, an honest
  "in this build / enforced" line and a Give/Withdraw button.
- `/privacy/passport`: every consent in one place: AA bank links (one-tap
  Revoke), DPDP purposes (one-tap Withdraw/Give), Perfios Hub APIs (none
  used, stated), and the Value Ledger.
- Value Ledger (`lib/server/dpdp/ledger.ts`): append-only, SHA-256
  hash-chained receipts for DPDP grants/withdrawals and AA link events
  (requested, approved, revoked, ended). The Passport shows "Chain verified".
  Receipts download as JSON with the notice version and hash.
- Needs the same Redis storage as the AA flow on Vercel; without it the
  screens say consent records can't be loaded (nothing is faked).

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
