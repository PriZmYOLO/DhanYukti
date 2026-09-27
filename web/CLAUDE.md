@AGENTS.md

# DhanYukti — Project Instructions

## Product

DhanYukti (धनयुक्ति) is a Household Financial OS.
Tagline: “Plan your money. Know your next step.”

It helps aspiring middle-class households understand their financial
position, identify their most important financial priority, and take a
timely, feasible next step.

Built for the CDPG Annual Conclave 2026 National Student Case Challenge —
National Finals, IIM Bangalore, 30 September 2026.

## Required customer journey

1. Consent
2. Connect
3. Understand
4. Identify
5. Intervene
6. Act
7. Trust
8. Sustain

## Team ownership

- Lohit: frontend screens and browser integration
- Harshal: backend state, permissions, and deployment
- Anish: evidence adapters, data connections, and related data work
- Amma: financial engines and financial companion
- Yashraj: acceptance, delivery, and related services

Respect these boundaries. Do not modify backend work owned by other
teammates unless explicitly asked.

## Frontend

The frontend lives in `web/` (this directory): Next.js 16 App Router,
TypeScript, Tailwind CSS v4, shadcn/ui (base-nova style, built on Base UI —
not Radix). This Next.js version has breaking changes: check
`node_modules/next/dist/docs/` before using a Next API (see AGENTS.md).

Inspect the current code before changing it. Follow existing patterns unless
there is a clear reason to improve them. Reuse the shared components
(`components/finance/*`: Money, DateDisplay, SourceBadge, AvailabilityState)
and brand strings (`lib/brand.ts`).

## Product and financial-data principles

- Unknown is not zero.
- Unavailable data is not proof that something does not exist.
- Pending, failed, stale, and revoked are distinct states.
- A draft, recommendation, or opened link is not a completed action.
- Never invent financial balances, dates, evidence, API responses, or
  successful outcomes.
- Clearly label demo data, fixtures, and UI previews.
- Explain the evidence, assumptions, confidence, and missing information
  behind financial outputs.
- Respect household-member permissions and data visibility.
- Consent is purpose-specific; joining a household does not grant access to
  another member's private financial information.
- Do not expose secrets, tokens, or private financial data in client code,
  logs, URLs, or browser-visible payloads.
- Rules and backend services own financial calculations and decisions. AI
  may explain results but must not fabricate them.

## Architecture and integration

Integrate through explicit, documented contracts. Do not invent backend
endpoints or assume a provider API is available.

Home decision view (paths relative to `web/`):

- Integration seam: `lib/data/home.ts` → `loadHomeView()`. It also
  normalises unknown values and enforces one snapshot per page; keep that
  when connecting the real backend.
- Provisional contract: `lib/contracts/decision-packet.ts`.
- Current Home scenarios use labelled demo data (`lib/fixtures/*`, imported
  only by `lib/data/*`); they are not real backend decisions.

Onboarding (L02) goes through the provisional `OnboardingPort` in
`lib/provisional/h01/`, currently backed by a sessionStorage demo adapter
(`demoOnboardingAdapter`) — not real authentication or authorisation.
Setup steps use `SetupFrame`: one column below 1280px; at ≥1280 the form
(≤680px) aligns with the header and a sticky side panel shows progress,
"Why we ask this" for the focused field (`data-why` → `SetupPanel`), the
privacy promise and a live summary. Money inputs group en-IN on blur with
an Indian-unit helper ("5 lakh"; display only, stored as exact paise), and
"As of which date?" defaults to today (IST), saved as an explicit date.

Permissions and imports (L04) go through the provisional `ConsentPort` in
`lib/provisional/h03/`. By default it is the sessionStorage demo adapter
(simulated approval, labelled, nothing fetched). With
`NEXT_PUBLIC_AA_LIVE=true` it is the live adapter: `/api/aa/*` routes call
the Anumati FIU module server-side (consent, webhooks, fetch, Node
decryption verified against Anumati's jar). Runbook:
`docs/AA_INTEGRATION.md`. Display states come from `lib/consent/status.ts`.
Screens live under `/privacy`.

Corrections and recalculation (L05) go through the provisional
`CorrectionPort` in `lib/provisional/h07/` (sessionStorage demo adapter; the
review is simulated). The owner-only view goes through `PrivateViewPort` in
`lib/provisional/h03/`; each member's private fixture is a separate
`import()` chunk loaded only in that member's tab. After a revoke or an
accepted correction, `PictureGate` (`components/correction/picture-status.tsx`)
replaces every Home/Why figure with "Your household picture will be
recalculated" until session end or the labelled demo Reset.

What-if (L06/L07, `/plan/what-if`) goes through the provisional
`ScenarioPort` in `lib/provisional/h08/`. Its demo adapter returns
written-out releases (`demo-releases.ts`) that mirror the Guide §30 golden
fixtures; it is stateless, so a preview never touches Home or the plan. The
screen computes nothing: it draws released daily closing cash and shows
released findings side by side, and shows the L05 recalculation notice
instead of any figure while the picture is recalculating.

Keep adapters replaceable so real backend responses can be connected without
rewriting the UI. Never describe a fixture as a live API integration. The
seams, interfaces and never-do rules for the backend are in
`docs/BACKEND_HANDOFF.md` (repository root); keep it current.

What this build can do lives in `lib/capabilities.ts`. `CONFIRMATION_CONNECTED`
is false until the action service (Y08/H09/L08) exists: the next step stays
"Preview only" and its confirm button stays disabled. `AA_CONNECTED` follows
`NEXT_PUBLIC_AA_LIVE` (off by default). `STATEMENT_UPLOAD_CONNECTED` is
false: statement upload shows "Not available in this build".

## Current implementation status

- L01: complete
- L02: complete
- L03: PASS
- L04: complete against the demo adapter; live Anumati AA adapter built
  and tested against a local mock (awaiting Anumati credentials)
- L05: complete against the demo adapters (awaiting real backend)
- Job 2a (government insurance check, PMJJBY/PMSBY on AA data):
  complete on live links; consent-gated by "Alerts and suggested actions"
- Job 2a upgrade: private premiums detected by insurer/IRDAI licence;
  member tags who each policy covers under DPDP consent
- Job 2b: DPDP notice (`/privacy/notice`), hash-chained Value Ledger,
  Consent Passport (`/privacy/passport`) with one-tap revoke/withdraw
- L06 (light) + L07: complete against the h08 demo adapter (awaiting the
  scenario service)

L03 covers the Home priority, the Why view, consequence of waiting, next
step, confidence, missing-information states, and demo scenarios. L03
browser checks and L01/L02 regression checks passed in the last
verification run.

L04 covers the pre-consent explainer with four separate choices, the Account
Aggregator handoff with a simulated approval, nine import/consent states with
source dates, the Privacy dashboard with Revoke, and entry points for
"Correct a fact" and "Report a recommendation". `tests/e2e/consent.spec.ts`
covers states, revoke, Simple words, storage and axe at 375 and 1280.

L05 covers the fact-correction flow (`/privacy/correct`, also from each own
fact in the Why sheet): pick a fact → current value and source → proposed
value and reason → text-only "what would change" → proposal. Proposed,
accepted and rejected (with reason) states sit beside the unchanged original.
Revoke or acceptance hides stale Home/Why figures. `/privacy/private` ("Only
you can see this") shows the member's own private holdings and nudges.
`tests/e2e/correction.spec.ts` and `tests/e2e/private-view.spec.ts` cover
these, including a two-member DOM and network-payload leak check.

L06/L07 (`/plan/what-if`, entry on `/plan`, link under Home's cash strip):
bounded preset chips (emergency, conditional school-fee move, purchase by
cash or loan, locked/private asset, provider timeout); a "Preview, your plan
is unchanged" banner; a before/after step chart of daily closing cash with
the floor, plus key figures side by side; a no-feasible-option state; a
loan case that says "Total cost needs full loan terms" and never shows a
total; a dates list with confirmed/inferred badges and the fee extension as
"Conditional, not accepted"; the goal gap before/after with an "Approve"
that opens a draft only (L08 owns confirmation). `tests/e2e/what-if.spec.ts`
asserts every §30 value, Home unchanged after previewing, the recalculation
gate, Simple words and axe at 375 and 1280.

Known follow-ups:

- Home and an onboarding smoke test now have Playwright coverage in
  `tests/e2e/`; the rest of the scratch L02 checks (invite flows, session
  isolation, storage safety) still need converting.
- Add browser coverage for unusual/unknown backend states and invite
  failure paths.
- Cash strip: a balance line needs the backend to release E03 daily closing
  cash (`daily: {date, closing_cash}[]` in CashFlowFindings; ask Amma).
- Fix the simple-language first-load wording flash.
- Ensure setup pages use uncached/dynamic rendering once real authenticated
  backend data is introduced.
- Continue privacy, accessibility, and regression testing.
- Shared button hover (`bg-primary/80`) and `text-destructive` error text on
  the page background are just under 4.5:1 contrast; L04 uses
  `text-negative` for errors, L02 forms still use `text-destructive`.
- Revoke only works on active consents; a pending request can't be
  withdrawn from the app yet. Grants can't be edited after linking.
- Wrap brand/product names (DhanYukti, Anumati) in `translate="no"`.
- L05 demo limitation: Home is server-rendered from fixtures, so after a demo
  revoke/acceptance its HTML and RSC payload still carry the old figures;
  only the DOM is cleaned (a demo-only pre-paint script,
  `components/correction/picture-prepaint.tsx`, hides them before first
  paint). The real fix is `loadHomeView()` returning the recalculating
  release; delete the pre-paint script and its CSS rule then.
- Pending corrections are shown in the Why sheet and on `/privacy/correct`,
  not yet on Home's own Money now / Coming up rows.
- What-if: the step chart has no hover tooltip yet (the day-by-day table
  gives the values). Only the §30 presets can be previewed; free amounts
  need the scenario service. Figures not printed in §30 (each day's closing,
  the purchase's first deficit, shock-case floor gaps) were worked out by
  hand from the §30 inputs; replace them with engine output.

Backend & integrations (Anish, provisional):

- L04 needs the real grants and consent routes (four grants, default deny),
  provider state mapping onto `ConsentStatus`/`ImportStatus`, the approval
  handoff mechanism, revoke with invalidation and recompute, and report
  intake. AA partner: Anumati (Perfios AA).
- L05 needs H07 correction intake and review (proposed → accepted/rejected
  with a safe reason), a picture status or recalculating Home release after
  revoke/acceptance, and owner-only release of private items
  (`docs/BACKEND_HANDOFF.md` §4–5). Until then a revoke (demo or live)
  flips the h07 demo picture status in the browser.
- L06/L07 need the scenario service (H06 routes, H08 policy, E03/E08/E09/
  E10 from Amma) behind `ScenarioPort` (`docs/BACKEND_HANDOFF.md` §5a).
- The Home projection's `ConnectionStatus` lacks `awaiting_approval` and
  `expired`; agree how they map.
- Real AA access: the Anumati FIU module (not the Perfios Hub, which has
  no AA APIs; BSA returns 403). Credentials, webhook registration and a
  test user are pending from Anumati.

## Development workflow

Before editing:

1. Inspect relevant files and current project state.
2. Check existing contracts and team ownership.
3. Identify the smallest coherent implementation.

After editing, run the relevant checks (from `web/`):

- Prettier: `npx prettier --check .`
- ESLint: `npx eslint .`
- TypeScript/build: `npx next build`
- Browser tests: `npm run test:e2e` (Playwright on the installed Chrome,
  against a production build; screenshot baselines are Windows-specific —
  regenerate with `--update-snapshots` only for intended visual changes)
- Locally Playwright uses 2 workers; stop any servers you start when a task
  ends.

Do not claim a check passed unless it actually ran and passed. Do not delete
unrelated files or make broad configuration changes without a clear reason.

When reporting completion, state:

- What changed
- Files changed
- Checks actually run and their results
- Remaining risks or untested cases
- Any backend contract or teammate dependency

## GitHub status

- Repository: https://github.com/PriZmYOLO/DhanYukti (**public**, owner
  `PriZmYOLO`). Never commit secrets, `.env` files or real customer data.
- The Git root is the project folder (`DhanYukti/`), not `web/`. Root
  `.gitignore` excludes `.claude/settings.local.json`; root `.gitattributes`
  enforces LF line endings to match Prettier.
- `main` tracks `origin/main`. No collaborators have been added yet.

Do not commit, push, force-push, change visibility, add collaborators, or
create branches or pull requests without explicit instruction. Do not claim
something was pushed unless the push actually succeeded.

Keep this document concise and update it as the project evolves.
