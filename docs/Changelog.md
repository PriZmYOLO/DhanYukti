# Changelog

## 2026-09-26
- Added `docs/` planning set: PRD, API contract, app flow, design system, tech spec, schema, security, setup, deployment, test plan, tracker, decisions, open questions, glossary, submission, contributing, non-goals, rules.
- Scaffolded `web/` (Next.js 16 PWA) and `api/` (FastAPI) against API_CONTRACT v1.
- Backend: engines E01–E16, golden fixtures A/B/C, Anumati (ReBIT v2/v1.1 switchable) + Perfios analytics/BSA/Hub connectors with replay fallback, `/api/enrich`, `/api/bsa/upload`, capability register. 14 tests.
- Frontend: onboarding (8 steps), Anumati sandbox screen, Home, Lakshya, Poocho, Inaam, Parivaar, Perfios Hub enrichment card.
- Docs: SponsorAPIs.md (researched endpoints, VERIFIED/INFERRED/UNVERIFIED), Design.md rewrite, Content.md.
- Copy: lender costs now shown in rupees, not percentages. Contrast + 44px tap-target fixes; reduced-motion respected. Consent purpose code 102 (CT008).
- Frontend completion: "Yeh galat hai" correction overlays on every metric (+ Kyon? per metric), nudge inbox with lock-screen preview + quiet hours, affordability check (Lakshya; Home in Pro), consent receipt share, assisted mode, offline banner, PWA install button, done-state on task cards, Aasaan auto-read, household-aware Poocho chips, error/404 pages. Production build: 332 KB gzip JS+CSS.
