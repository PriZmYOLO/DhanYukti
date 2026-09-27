# Changelog

## 2026-09-26
- Added `docs/` planning set: PRD, API contract, app flow, design system, tech spec, schema, security, setup, deployment, test plan, tracker, decisions, open questions, glossary, submission, contributing, non-goals, rules.
- Scaffolded `web/` (Next.js 16 PWA) and `api/` (FastAPI) against API_CONTRACT v1.
- Backend: engines E01–E16, golden fixtures A/B/C, Anumati (ReBIT v2/v1.1 switchable) + Perfios analytics/BSA/Hub connectors with replay fallback, `/api/enrich`, `/api/bsa/upload`, capability register. 14 tests.
- Frontend: onboarding (8 steps), Anumati sandbox screen, Home, Lakshya, Poocho, Inaam, Parivaar, Perfios Hub enrichment card.
- Docs: SponsorAPIs.md (researched endpoints, VERIFIED/INFERRED/UNVERIFIED), Design.md rewrite, Content.md.
- Copy: lender costs now shown in rupees, not percentages. Contrast + 44px tap-target fixes; reduced-motion respected. Consent purpose code 102 (CT008).
- Frontend completion: "Yeh galat hai" correction overlays on every metric (+ Kyon? per metric), nudge inbox with lock-screen preview + quiet hours, affordability check (Lakshya; Home in Pro), consent receipt share, assisted mode, offline banner, PWA install button, done-state on task cards, Aasaan auto-read, household-aware Poocho chips, error/404 pages. Production build: 332 KB gzip JS+CSS.

## 2026-09-28
- Governance layer wired into the app (see `docs/GovernanceLayer.md`): live Anumati AA links, Jan Suraksha check + private cover card, DPDP per-purpose consent with hash-chained Value Ledger (replaces the old profile/device-signal toggles), family cover engine screen with Bima Sugam handoff (replaces the PMJJBY ₹2 lakh card), Bhashini Hindi voice, "Report a recommendation" in every Kyon? sheet, onboarding answers saved with "not answered" / dependents / goal, household invites.
- `next.config.ts`: API proxy to FastAPI is now a fallback rewrite so Next's dynamic API routes win.
- Merged onto Lohit's repo (after "Adopt Anish's app"): kept the live Anumati connect screen (resume after reload, popup-safe tab) and made its three grants the member's own choices (default off, were hard-coded on); Consent Passport shows live links with their trail and an honest revoke (DhanYukti's copy is deleted; the consent is ended in the Anumati app); DPDP rows now read and write the ledger only (old on/off flags removed).
- Bhashini read-outs in every language Bhashini offers (22 + English) with a picker, native-script caption, per-script number guard, `/api/voice/languages`; mock Bhashini answers per language.
- CashRiver: fixed "undefined" SVG attribute errors on first render.
