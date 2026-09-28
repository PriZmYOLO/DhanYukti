# Backend handoff: frontend seams

For whoever builds the backend and integrations (currently expected to be
Anish; unconfirmed). The frontend (`web/`) runs today on **labelled demo
adapters and fixtures**. Nothing in it calls a backend yet. This page lists
each place a real backend plugs in, what it must return, and what must never
happen.

All paths are relative to `web/`. Types are hand-written and provisional;
when you publish generated schemas, map them onto these types inside the
adapter, or replace the types. Screens should not need changes. Field names
are snake_case on purpose.

## Rules that apply everywhere

- **Unknown is not zero.** A missing, pending, failed or withheld value is
  `null` or an explicit status. It is never `0`, `[]` or `"none"`.
- Pending, failed, stale, denied, expired and revoked are **different
  states**. Don't collapse them into one "error".
- Money is **integer paise** (`{ amount_paise, currency: "INR" }`). Dates are
  ISO (`2026-09-28`); timestamps carry an offset. Asia/Kolkata.
- **Release only what the viewer may see.** Another member's private facts
  must be absent from the payload, not hidden by the UI.
- **No secrets, tokens, consent handles or raw files in the browser**, in
  URLs, or in logs. The demo adapters run in the browser, so a real adapter
  there may only use the signed-in member's session. Anything needing a key
  goes through a server boundary (the Home loader is already `server-only`).
- Errors use the envelope in `lib/contracts/common.ts`
  (`request_id, code, safe_message, retryable, missing_fields?`). The UI shows
  `safe_message` and `request_id` only.
- The backend owns calculations and decisions. The UI never recalculates,
  reranks or fills gaps.

## 1. Home: decision view

|       |                                                                                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seam  | `lib/data/home.ts` → `loadHomeView()` (server-only)                                                                                                                                             |
| Types | `lib/contracts/household-projection.ts` (`ProjectionRelease`), `lib/contracts/decision-packet.ts` (`DecisionRelease`), `lib/contracts/health-card.ts` (`HealthCard`), `lib/contracts/common.ts` |
| Today | Labelled fixture scenarios from `lib/fixtures/*`, `origin: "fixture"`                                                                                                                           |

**To swap:** replace the fixture lookup with your calls and return
`{ origin: "backend", projection, decision, health }`. Keep `assemble()`: it
normalises unreadable values and refuses to show a decision or Health Card
whose `snapshot_id` differs from the projection's. Don't touch
`lib/home/normalize.ts` to make a payload fit; fix the payload instead.

```ts
type ProjectionRelease =
  | { status: "released"; projection: HouseholdProjection }
  | { status: "unavailable"; reason: string; error: ErrorEnvelope | null };

type DecisionRelease =
  | { status: "released"; packet: DecisionPacket }
  | { status: "unavailable"; reason: string; error: ErrorEnvelope | null };

// HealthCard | null. null = could not be released.
```

**Never:**

- A timeout shown as "nothing needs attention". Use `unavailable`, not
  `priority: { status: "none_found" }`.
- A need that rests on another member's private facts released as
  `none_found`. It is `not_released`.
- Free text (`title`, `summary`, `reasons[].text`) containing an amount that
  isn't also a typed `MoneyPaise` field.
- A projection, decision and Health Card from different snapshots.

## 2. Onboarding: sign-in, household, context, manual money

|           |                                                                         |
| --------- | ----------------------------------------------------------------------- |
| Seam      | `lib/provisional/h01/index.ts` exports `onboardingPort`                 |
| Interface | `OnboardingPort` in `lib/provisional/h01/port.ts`; shapes in `types.ts` |
| Today     | `demoOnboardingAdapter`: sessionStorage, one demo session per tab       |

**To swap:** implement `OnboardingPort` against your routes and export it
from `index.ts` with `implementation: "h01"`.

```ts
interface OnboardingPort {
  readonly implementation: "demo" | "h01";
  loadSnapshot(): Promise<OnboardingSnapshot>;
  startSession(input: {
    display_name: string | null;
  }): Promise<OnboardingSnapshot>;
  endSession(): Promise<OnboardingSnapshot>;
  createHousehold(input: {
    household_name: Answer<string>;
  }): Promise<OnboardingSnapshot>;
  lookupInvite(code: string): Promise<ProvisionalInviteLookup>;
  acceptInvite(code: string): Promise<ProvisionalAcceptInviteResult>;
  saveContext(context: HouseholdContextDraft): Promise<OnboardingSnapshot>;
  saveManualMoney(draft: ManualMoneyDraft): Promise<OnboardingSnapshot>;
  setPresentation(p: PresentationPreference): Promise<OnboardingSnapshot>;
}
```

**Never:**

- Treat an unanswered (`{ state: "unanswered" }`) or "don't know" answer as
  zero or none.
- Let joining a household grant any data access. Members start as
  `access: "not_shared"` until the grants say otherwise.
- Accept manual money entries as facts on save. They are candidates until
  your acceptance step.
- Report an unknown invite code as "invalid". If you can't check it, return
  `status: "unavailable"`.

## 3. Consent and imports: permissions, bank linking, revoke

|                 |                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seam            | `lib/provisional/h03/index.ts` exports `consentPort` and `demoConsentControls`                                                                                                         |
| Interface       | `ConsentPort` in `lib/provisional/h03/port.ts`; shapes in `types.ts`                                                                                                                   |
| Display mapping | `lib/consent/status.ts` (`linkState`, `LINK_STATE_INFO`, `grantCounts`)                                                                                                                |
| Today           | `demoConsentAdapter` by default. With `NEXT_PUBLIC_AA_LIVE=true`, `liveConsentAdapter` → `/api/aa/*` → Anumati FIU module (real consent, fetch, decrypt). See `docs/AA_INTEGRATION.md` |

**Live adapter (27 Sep 2026):** `lib/provisional/h03/live-adapter.ts`
implements `ConsentPort` against DhanYukti's own routes (`app/api/aa/*`),
which call the Anumati FIU module server-side. `index.ts` picks it when
`AA_CONNECTED` is true, and `demoConsentControls` becomes `null`.
`ApprovalHandoff` gained `"needs_details"` (ask for the mobile number) and
`"redirect"` (Anumati's hosted consent page); `startApproval` takes optional
`{ mobile_number }`. `ConsentStatus` gained `"paused"` and `"failed"` (from
the lifecycle webhook; shown as "Status not known"). `SourceLink` gained
optional `activity` (the "What happened" trail, codes only) and
`is_sandbox`. When H03 grants and H01 sign-in exist, move the link records
from the `dy_aa_session` cookie to the signed-in member.

```ts
interface ConsentPort {
  readonly implementation: "demo" | "h03";
  getRequestTerms(): Promise<ConsentRequestTerms>;
  listLinks(): Promise<SourceLink[]>; // this member's own links only
  getLink(linkId: string): Promise<SourceLink | null>;
  requestConsent(choices: ConsentChoices): Promise<RequestConsentResult>;
  startApproval(
    linkId: string,
    details?: ApprovalDetails, // { mobile_number }, after "needs_details"
  ): Promise<ApprovalHandoff>;
  revoke(linkId: string): Promise<SourceLink>;
  reportRecommendation(
    draft: RecommendationReportDraft,
  ): Promise<FeedbackReceipt>;
}
```

**The four choices** (Guide §5) are separate and all default off. They are
`source_access`, `household_computation`, `viewer_scope`
(`only_me` | `household_adults`) and `alerts_and_actions`. Only
`source_access` is required to create a request.

**Status mapping.** You map provider states onto these two fields. The
screen state comes from `linkState()`:

| `consent.status`    | `import.status`              | Screen shows                                                                         |
| ------------------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| `requested`         | any                          | Requested (nothing fetched)                                                          |
| `awaiting_approval` | any                          | Awaiting your approval                                                               |
| `active`            | `not_started` / `processing` | Still processing (no balance, never ₹0)                                              |
| `active`            | `complete`                   | Active                                                                               |
| `active`            | `partial`                    | Partly received (per-account rows show which failed)                                 |
| `active`            | `failed`                     | Import failed                                                                        |
| `denied`            | any                          | Declined                                                                             |
| `expired`           | any                          | Expired                                                                              |
| `revoked`           | any                          | Revoked: "Data removed from your plan; your household picture will be recalculated." |
| anything else       |                              | Status not known (never shown as active)                                             |

Per account: `status: "received" | "processing" | "failed"`, `data_from`,
`data_to`, `fetched_at`, `balance: MoneyPaise | null`, `balance_as_of` and
`error`. Send every date you have. Screens show source dates for every state.

**Never:**

- Treat a request, or membership, as authorisation to fetch.
- Show a processing, failed or partial account's balance as `0`. It is `null`.
- Keep using data after `revoked` or `expired`: cancel jobs, reject late
  results and recompute. The UI stops showing account data for those states.
- Treat `reportRecommendation` as done. It returns a receipt, not a
  resolution. (Fact corrections moved to H07 in L05; see §4.)
- Let a revoke leave the household picture as it was. After `revoked`, the
  picture status in §4 must turn `recalculating`. Until H07 exists, both
  the demo and the live adapter do this in the browser by calling the h07
  demo adapter (`markDemoRecalculation`) once the link reads `revoked`.
- Put consent handles, FIU/AA tokens or statement files in `SourceLink`.
- Return another member's links.

**Known gap:** `ConnectionStatus` in the Home projection
(`household-projection.ts`) has no `awaiting_approval` or `expired`. Either
add them or tell the frontend how they collapse.

## 3a. Government insurance check (Job 2a)

|          |                                                                                              |
| -------- | -------------------------------------------------------------------------------------------- |
| Rule     | `lib/server/schemes/jan-suraksha.ts` → `checkJanSuraksha(accounts)` (pure)                   |
| Route    | `GET /api/aa/links/{id}/scheme-check` → `{ check: SchemeCheckResult }`                       |
| Contract | `lib/contracts/scheme-check.ts`                                                              |
| Gate     | Runs only when the link's `alerts_and_actions` grant is on; else `{ status: "not_allowed" }` |

Per scheme: `premium_seen` (with evidence), `not_seen` (renewal window
covered, no named debit), `outside_age`, or `unknown`. Never turn
`unknown` into "not enrolled". When the financial engines own protection
priorities (Amma), they can consume the same result; public schemes stay
ahead of any private product.

## 3a+. Reveal summary from a live link

|          |                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Rule     | `lib/server/aa/summary.ts` → `summariseAccounts()` (pure), fed by `readAccountData(sid, linkId)`                                           |
| Route    | `GET /api/aa/links/{id}/summary` → `{ summary: AccountSummary }`; 404 if not this session's active link, 409 `no_data` before data arrives |
| Contract | `lib/contracts/aa-summary.ts`                                                                                                              |
| Check    | `npm run test:aa-summary` (after `next build`; runs the local mock and `next start` on 3108/4010)                                          |

Derived facts only: total and per-account balance, data window and
transaction count, monthly inflow (median of credits per complete calendar
month; "unknown" under 2 months), up to 3 recurring debits (same payee,
within ±15%, in 2+ months) and Jan Suraksha, which returns
`not_checked_consent_off` when `alerts_and_actions` is off. No
transactions or narrations beyond a payee label. The reveal step shows it,
then says the rest of the demo uses the demo household's data: nothing yet
turns a member's own data into the Home dashboard, which stays fixture data
with a "Demo data" chip. When the engines (Amma) own income and obligations,
replace these figures with engine output.

## 3b. DPDP consent and Value Ledger (Job 2b)

|          |                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Notice   | `lib/dpdp/notice.ts` (`NOTICE_PURPOSES`, `NOTICE_VERSION`; bump the version on any change)                                                     |
| Ledger   | `lib/server/dpdp/ledger.ts` (append-only, hash-chained; `hasConsent(sid, purpose)`)                                                            |
| Routes   | `GET /api/dpdp/state`, `POST /api/dpdp/consents/{purpose}` `{ action: "grant" \| "withdraw" }`                                                 |
| Enforced | `insurance_tags` (withdraw deletes tags). `manual_entries` / `member_profile` recorded only: wire deletion when H01/H03 store them server-side |

Any new processing purpose must be added to the notice and checked with
`hasConsent` before use. AA link events are written to the same ledger.

## 3c. Family cover engine (insurance decisions)

Built by the delivery side because the financial engines hadn't started it.
Full description: `docs/COVER_ENGINE.md`.

|          |                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------- |
| Engine   | `lib/server/engines/cover/engine.ts` → `planCover(profile, conditions, meta)` (pure)               |
| Contract | `lib/contracts/cover-engine.ts` (`CoverProfile` in, `CoverPlan` out)                               |
| Routes   | `GET/PUT /api/engine/cover/profile`, `POST /api/engine/cover/run`, `GET /api/engine/cover/prefill` |
| Consent  | DPDP `cover_profile` (profile) and `health_conditions` (flags); run receipted as `engine_run`      |

**Never:** add an insurer, product, price or commission input to the engine;
rank named products (IRDAI web-aggregator territory); treat an unknown input
as zero. The Home decision engine can consume `CoverPlan` as one input.

## 3d. Hindi voice read-out (Job 2c)

`POST /api/voice/nudge` `{ nudge: "cash_short", params: { amount_paise, date } }`
→ Bhashini translation + TTS. Template-built text only (`lib/voice/nudges.ts`);
DPDP consent "voice"; a changed number falls back to the reviewed Hindi.
Runbook: `docs/VOICE.md`. **Never** add a free-text or name field to a
voice nudge; add a new template with typed params instead.

## 4. Corrections and recalculation (H07)

|           |                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------- |
| Seam      | `lib/provisional/h07/index.ts` exports `correctionPort` and `demoCorrectionControls`           |
| Interface | `CorrectionPort` in `lib/provisional/h07/port.ts`; shapes in `types.ts`                        |
| Screens   | `/privacy/correct`, the Why sheet ("Correct this"), Home's `PictureGate`                       |
| Today     | `demoCorrectionAdapter`: sessionStorage, keyed to the demo member; the review is **simulated** |

**To swap:** implement `CorrectionPort`, export it from `index.ts` with
`implementation: "h07"`, and set `demoCorrectionControls` to `null` (the
"Simulate accept/reject" buttons and "Reset demo corrections" disappear).

```ts
interface CorrectionPort {
  readonly implementation: "demo" | "h07";
  listCorrections(): Promise<FactCorrection[]>; // own only, newest first
  proposeCorrection(draft: FactCorrectionDraft): Promise<FactCorrection>;
  getPictureStatus(): Promise<PictureStatus>;
}

type ProposedValue =
  | { field: "amount"; amount: MoneyPaise }
  | { field: "effective_on"; effective_on: IsoDate };

interface FactCorrectionDraft {
  fact_id: string; // a fact released to, and owned by, this viewer
  proposed: ProposedValue;
  reason: string;
}

interface FactCorrection {
  correction_id: string;
  fact_id: string;
  proposed: ProposedValue;
  reason: string;
  status: "proposed" | "accepted" | "rejected";
  proposed_at: IsoTimestamp;
  decided_at: IsoTimestamp | null;
  rejection_reason: string | null; // safe text, set when rejected
  is_demo: boolean;
}

type PictureStatus =
  | { status: "current" }
  | {
      status: "recalculating";
      since: IsoTimestamp;
      causes: ("source_revoked" | "correction_accepted")[];
    };
```

The screens show the **original** from the released projection, beside the
proposal. `FactCorrection` deliberately carries no copy of it.

**Recalculation contract.** After a revoke takes effect or a correction is
accepted, **`loadHomeView()` must stop returning the old snapshot.** It
returns either the recomputed snapshot or
`projection: { status: "unavailable", reason: "Your household picture is being recalculated…" }`
(and no decision or Health Card from the old snapshot). `getPictureStatus()`
reports `recalculating` until the new snapshot is released.

**Known demo limitation.** The demo state lives in the browser, and Home is
server-rendered from fixtures, so the server can't see a demo revoke or
acceptance. Home's HTML and RSC payload therefore still contain the
unchanged fixture figures. `PictureGate` removes them from the DOM, and a
demo-only inline script (`components/correction/picture-prepaint.tsx` plus
one rule at the end of `app/globals.css`) hides them before first paint on a
full load. Once the real `loadHomeView()` honours the contract above, delete
that script and the CSS rule.

**Never:**

- Return a correction as `accepted` from `proposeCorrection`. It is always
  `proposed` first.
- Overwrite the original fact in the projection before acceptance.
- Keep serving the old snapshot (or a decision computed from it) after a
  revoke or an accepted correction.
- Put another member's figures in `rejection_reason`, or accept corrections
  to facts the viewer doesn't own.

## 5. Owner-only private view

|           |                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Seam      | `lib/provisional/h03/index.ts` exports `privateViewPort`                                                                                   |
| Interface | `PrivateViewPort` in `lib/provisional/h03/private-view.ts`                                                                                 |
| Screen    | `/privacy/private` ("Only you can see this")                                                                                               |
| Today     | `demoPrivateViewAdapter`: one fixture per demo role (created / invited), each a separate `import()` chunk loaded only in that member's tab |

```ts
interface PrivateViewPort {
  readonly implementation: "demo" | "h03";
  getOwnPrivateView(): Promise<OwnPrivateView>;
}

type OwnPrivateView =
  | {
      status: "released";
      holdings: PrivateHolding[]; // label, amount | null, as_of, source
      nudges: PrivateNudge[]; // title, body, due_on, is_ui_preview
      is_demo: boolean;
    }
  | { status: "no_household" }
  | { status: "unavailable"; reason: string };
```

**Never:**

- Release a member's private items to anyone but that member's own session.
  They must be absent from every other payload, not hidden by the UI.
- Include private items in any household figure a relative can see (totals,
  safe-to-spend, Health Card). Otherwise they can be worked out by
  subtraction.
- Send private nudges to anyone but the owner, or reveal that private items
  exist (no counts or "hidden items" hints).

`tests/e2e/private-view.spec.ts` checks this with two members: each one's
DOM and every network response their browser received.

## 6. Capability flags (`lib/capabilities.ts`)

| Flag                         | Today                                                                                       | Flip to `true` only when                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `CONFIRMATION_CONNECTED`     | `false`: next step is "Preview only"; confirm button disabled                               | The action service (Y08/H09/L08) confirms, records and reports outcomes end to end                |
| `AA_CONNECTED`               | `NEXT_PUBLIC_AA_LIVE === "true"`; off by default (simulated, labelled)                      | Set on a deployment once Anumati credentials + Redis are configured and `/api/aa/status` is ready |
| `STATEMENT_UPLOAD_CONNECTED` | `false`: "Upload a bank statement" says "Not available in this build"; no file input exists | An authorised server-side upload route keeps files private and reports processing/failed states   |

## 7. Open contract requests

1. **E03 daily closing cash.** The Home cash strip needs
   `daily: { date: IsoDate; closing_cash: MoneyPaise }[]` in `CashFlowFindings`
   before it can draw a balance line. Owned by the financial engines (Amma).
2. **Simple-language variants of released text.** Need titles, summaries and
   reasons are released in one wording. The UI's "Simple words" mode can only
   reword its own labels. Either release `{ standard, simple }` variants or
   accept the viewer's presentation mode on the request.
3. **Action confirmation (Y08/H09/L08).** A confirm route, the proposed →
   confirmed → handed-off → completed/failed states with evidence, and version
   checks. Until then `CONFIRMATION_CONNECTED` stays `false`.

## 8. Provider access (as of 28 Sep 2026)

- The **Perfios Hub sandbox has no AA/Anumati APIs**. The AA flow goes
  through the separate **Anumati FIU module**
  (`https://fiu-module-uat.anumati.co.in`), per Anumati's Integration Guide
  v1.1. Credentials and webhook registration arrived on 28 Sep, and the
  **live flow is verified end to end on Anumati UAT** (consent → ACTIVE →
  fetch → decrypt → accounts; revoke from the Anumati portal). See
  `docs/AA_INTEGRATION.md`.
- The **BSA (bank statement analysis) endpoints currently return 403**.
- Describe it as live on Anumati's UAT sandbox (test banks, not real
  money). The local mock is labelled "LOCAL MOCK" and is never demoed as
  the sandbox.
- Fetched account data is available server-side through
  `readAccountData()` in `lib/server/aa/links.ts` for the engines (E01/E03);
  Home still uses labelled fixtures until they consume it.
