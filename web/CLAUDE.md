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

Keep adapters replaceable so real backend responses can be connected without
rewriting the UI. Never describe a fixture as a live API integration.

## Current implementation status
- L01: complete
- L02: complete
- L03: PASS
- L04: not started

L03 covers the Home priority, the Why view, consequence of waiting, next
step, confidence, missing-information states, and demo scenarios. L03
browser checks and L01/L02 regression checks passed in the last
verification run.

Known follow-ups:
- Convert the scratch browser tests (kept outside the repo) into proper
  repository tests.
- Add browser coverage for unusual/unknown backend states and invite
  failure paths.
- Fix the simple-language first-load wording flash.
- Ensure setup pages use uncached/dynamic rendering once real authenticated
  backend data is introduced.
- Continue privacy, accessibility, and regression testing.

Do not start L04 unless explicitly asked.

## Development workflow
Before editing:
1. Inspect relevant files and current project state.
2. Check existing contracts and team ownership.
3. Identify the smallest coherent implementation.

After editing, run the relevant checks (from `web/`):
- Prettier: `npx prettier --check .`
- ESLint: `npx eslint .`
- TypeScript/build: `npx next build`
- Relevant browser tests

Do not claim a check passed unless it actually ran and passed. Do not delete
unrelated files or make broad configuration changes without a clear reason.

When reporting completion, state:
- What changed
- Files changed
- Checks actually run and their results
- Remaining risks or untested cases
- Any backend contract or teammate dependency

## GitHub status
- Repository: https://github.com/PriZmYOLO/DhanYukti (private, owner
  `PriZmYOLO`).
- The Git root is the project folder (`DhanYukti/`), not `web/`. Root
  `.gitignore` excludes `.claude/settings.local.json`; root `.gitattributes`
  enforces LF line endings to match Prettier.
- `main` tracks `origin/main`. No collaborators have been added yet.

Do not commit, push, force-push, change visibility, add collaborators, or
create branches or pull requests without explicit instruction. Do not claim
something was pushed unless the push actually succeeded.

Keep this document concise and update it as the project evolves.
