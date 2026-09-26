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

|                 |                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Seam            | `lib/provisional/h03/index.ts` exports `consentPort` and `demoConsentControls`                                |
| Interface       | `ConsentPort` in `lib/provisional/h03/port.ts`; shapes in `types.ts`                                          |
| Display mapping | `lib/consent/status.ts` (`linkState`, `LINK_STATE_INFO`, `grantCounts`)                                       |
| Today           | `demoConsentAdapter`: sessionStorage, keyed to the demo member; approval is **simulated**; nothing is fetched |

**To swap:** implement `ConsentPort`, export it from `index.ts` with
`implementation: "h03"`, and set `demoConsentControls` to `null`. The
simulated-approval panel and the "Show every state" examples then disappear.
Also add your real approval handoff to the `ApprovalHandoff` union, for
example a redirect to the Account Aggregator's hosted flow. Only the
`"simulated"` and `"unavailable"` variants exist today, because we don't know
the provider's mechanism yet.

```ts
interface ConsentPort {
  readonly implementation: "demo" | "h03";
  getRequestTerms(): Promise<ConsentRequestTerms>;
  listLinks(): Promise<SourceLink[]>; // this member's own links only
  getLink(linkId: string): Promise<SourceLink | null>;
  requestConsent(choices: ConsentChoices): Promise<RequestConsentResult>;
  startApproval(linkId: string): Promise<ApprovalHandoff>;
  revoke(linkId: string): Promise<SourceLink>;
  proposeCorrection(draft: FactCorrectionDraft): Promise<FeedbackReceipt>;
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
- Treat `proposeCorrection` / `reportRecommendation` as done. They return a
  receipt for a proposal, not an accepted change.
- Put consent handles, FIU/AA tokens or statement files in `SourceLink`.
- Return another member's links.

**Known gap:** `ConnectionStatus` in the Home projection
(`household-projection.ts`) has no `awaiting_approval` or `expired`. Either
add them or tell the frontend how they collapse.

## 4. Capability flags (`lib/capabilities.ts`)

| Flag                         | Today                                                                                       | Flip to `true` only when                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `CONFIRMATION_CONNECTED`     | `false`: next step is "Preview only"; confirm button disabled                               | The action service (Y08/H09/L08) confirms, records and reports outcomes end to end                 |
| `AA_CONNECTED`               | `false`: bank approval is simulated and labelled                                            | A real `ConsentPort` adapter (request, approval handoff, fetch status, revoke) is wired and tested |
| `STATEMENT_UPLOAD_CONNECTED` | `false`: "Upload a bank statement" says "Not available in this build"; no file input exists | An authorised server-side upload route keeps files private and reports processing/failed states    |

## 5. Open contract requests

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

## 6. Provider access (as of 26 Sep 2026)

- The **Perfios Hub sandbox has no AA/Anumati APIs**, so real Account
  Aggregator consent can't be built against it.
- The **BSA (bank statement analysis) endpoints currently return 403**.
- Real AA access is **pending from Perfios/Anumati**. Until it arrives, the
  consent screens stay on the labelled demo adapter, and nothing may be
  described as a live integration.
