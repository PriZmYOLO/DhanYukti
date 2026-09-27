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

## 3b. DPDP consent and Value Ledger (Job 2b)

|          |                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Notice   | `lib/dpdp/notice.ts` (`NOTICE_PURPOSES`, `NOTICE_VERSION`; bump the version on any change)                                                     |
| Ledger   | `lib/server/dpdp/ledger.ts` (append-only, hash-chained; `hasConsent(sid, purpose)`)                                                            |
| Routes   | `GET /api/dpdp/state`, `POST /api/dpdp/consents/{purpose}` `{ action: "grant" \| "withdraw" }`                                                 |
| Enforced | `insurance_tags` (withdraw deletes tags). `manual_entries` / `member_profile` recorded only: wire deletion when H01/H03 store them server-side |

Any new processing purpose must be added to the notice and checked with
`hasConsent` before use. AA link events are written to the same ledger.

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

## 5a. What-if scenarios (H08)

|           |                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| Seam      | `lib/provisional/h08/index.ts` exports `scenarioPort`                                                            |
| Interface | `ScenarioPort` in `lib/provisional/h08/port.ts`; shapes in `types.ts`                                            |
| Screen    | `/plan/what-if` (L06 dates and goal, L07 shock and affordability); entry on `/plan`, link from Home              |
| Today     | `demoScenarioAdapter`: stateless, returns written-out releases (`demo-releases.ts`) mirroring Guide §30 fixtures |
| Owners    | H06 routes and H08 policy (Harshal); E03/E08/E09/E10 (Amma); N06 calendar (Anish)                                |

**To swap:** implement `ScenarioPort` against the scenario routes and export
it from `index.ts` with `implementation: "h08"`. Map each preset onto your
change set inside the adapter; the screen only knows the preset ids.

```ts
interface ScenarioPort {
  readonly implementation: "demo" | "h08";
  listPresets(): Promise<ScenarioPreset[]>; // the bounded inputs offered
  getBaseline(): Promise<ScenarioRelease>; // the live plan's own run
  preview(presetId: ScenarioPresetId): Promise<ScenarioRelease>; // read-only
  getPlanDates(): Promise<PlanDatesRelease>; // confirmed / inferred dates
}

type ScenarioPresetId =
  | "emergency" // +₹4,000 on 26 Sep
  | "emergency_fee_delay" // emergency + fee moved to 30 Sep (conditional)
  | "cash_purchase" // ₹2,000 on 24 Sep from cash
  | "loan_purchase" // ₹2,000 on 24 Sep on a loan with incomplete terms
  | "goal_funding" // 15,000 target, 5,000 earmark, 2 × 3,000
  | "hidden_asset" // a locked or private asset
  | "no_provider"; // a source timeout

type ScenarioRelease =
  | {
      status: "feasible" | "no_feasible_option";
      baseline_snapshot_id: string; // same for every compared release
      horizon: Horizon; // same for every compared release
      changes: ScenarioChange[]; // applied | conditional
      cash_flow: {
        horizon: Horizon;
        daily: { date: IsoDate; closing_cash: MoneyPaise }[]; // every day
        first_deficit: DatedAmount | null;
        minimum_cash: DatedAmount;
        floor: MoneyPaise;
        gap_to_floor: MoneyPaise;
      };
      residual_shortfall: { amount: MoneyPaise; before: IsoDate } | null;
      finding: string; // plain words, no amounts
      assumptions: string[];
      goal: GoalFunding | null; // target, earmarked, gap_before,
      // contribution { each, count, total, timing }, gap_after
      is_demo: boolean;
    }
  | {
      status: "pending";
      cash_flow: null;
      reason: string;
      error: ErrorEnvelope | null;
      loan: { borrowed; total_cost: MoneyPaise | null; missing_terms } | null;
      // …plus the same baseline_snapshot_id, horizon, changes, is_demo
    };
```

`feasible` means at least one permitted, reversible response (or none) keeps
closing cash at or above zero until payday; `no_feasible_option` means none
does (E08). `PlanDate` carries `certainty: "confirmed" | "inferred"`, a
plain-words `basis`, and an optional `suggestion` with
`status: "conditional"` (the school fee extension).

**Expected values** (Guide §30; `tests/e2e/what-if.spec.ts` asserts each):
baseline first deficit ₹3,000 on 28, minimum −₹3,500 on 29, gap ₹5,500;
emergency first deficit ₹1,500 on 27, minimum −₹7,500 on 29; fee delay
residual ₹2,500 before 30; purchase minimum −₹5,500; goal gap ₹4,000;
hidden asset leaves shared cash unchanged; no provider is `pending`.

**The screen checks** that every release shares the baseline's snapshot and
horizon and that `daily` has one valid amount per horizon date; otherwise it
shows "can't be compared" instead of figures. While the H07 picture status
is `recalculating` it loads and shows no scenario figure.

**Never:**

- Let `preview` change accepted state, Home's snapshot or a due date.
  Scenarios are copy-on-write branches of one snapshot.
- Return a scenario from a different snapshot or horizon than the baseline.
- Put `0` or `[]` where a result is pending or a timeout happened.
- Release a loan `total_cost` while any term is missing, or fill a
  shortfall with borrowing.
- Release a conditional date (the school extension) as an accepted due date.
- Count a hidden, locked or another member's private asset in shared cash,
  or reveal it through a changed figure.
- Treat "Approve" as done. The screen only opens a draft; confirmation is
  the action service's (§7.3).

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
   The What-if screen (§5a) already consumes this shape in scenario
   releases.
2. **Simple-language variants of released text.** Need titles, summaries and
   reasons are released in one wording. The UI's "Simple words" mode can only
   reword its own labels. Either release `{ standard, simple }` variants or
   accept the viewer's presentation mode on the request.
3. **Action confirmation (Y08/H09/L08).** A confirm route, the proposed →
   confirmed → handed-off → completed/failed states with evidence, and version
   checks. Until then `CONFIRMATION_CONNECTED` stays `false`.

## 8. Provider access (as of 27 Sep 2026)

- The **Perfios Hub sandbox has no AA/Anumati APIs**. The AA flow goes
  through the separate **Anumati FIU module**
  (`https://fiu-module-uat.anumati.co.in`), per Anumati's Integration Guide
  v1.1. The integration is built and tested against a local mock and
  against Anumati's crypto jar; **credentials, webhook registration and a
  test user are pending from Anumati** (requested 27 Sep).
- The **BSA (bank statement analysis) endpoints currently return 403**.
- Until the credentials arrive and a real sandbox run succeeds, don't
  describe the flow as live. The local mock is labelled "LOCAL MOCK".
- Fetched account data is available server-side through
  `readAccountData()` in `lib/server/aa/links.ts` for the engines (E01/E03);
  Home still uses labelled fixtures until they consume it.
