# Governance layer in the app (28 Sep)

Ported from Lohit's repo (PriZmYOLO/dhanyukti, `web/lib/server`, `web/app/api`)
and wired into this app's screens. Server code runs as Next route handlers in
`web/src/app/api`; anything they don't handle is proxied to FastAPI
(`next.config.ts` uses a **fallback** rewrite so dynamic routes like
`/api/aa/links/[linkId]` aren't sent to FastAPI).

## What's on screen

| Feature | Where | Server |
|---|---|---|
| Live Anumati AA link (4 separate choices, new-tab approval, live trail, revoke) | Onboarding → Consent Passport → connect; Parivaar → Consent | `/api/aa/*` |
| Government insurance check (PMJJBY/PMSBY) + private cover seen in bank data, with "who does it cover" tags | Lakshya → Parivaar ki suraksha | `/api/aa/links/{id}/scheme-check`, `…/policies/{key}` |
| DPDP notice per purpose, grant/withdraw in one tap, receipts, hash-chained Value Ledger | Onboarding → Consent Passport; Parivaar → Consent | `/api/dpdp/*` |
| Family cover engine: needs → have → gap → cover spec → Bima Sugam handoff (replaces the old "PMJJBY ₹2 lakh" card) | Home card (E06 slot) → Lakshya → Parivaar ki suraksha | `/api/engine/cover/*` |
| Bhashini read-outs in 22 Indian languages + English for every 🔊 button: English card text → Bhashini translation → Bhashini speech, native-script caption on screen, consent prompt on first tap; phone voice only as a labelled fallback | Everywhere via `useApp().speak`; language picker in onboarding and Parivaar → Settings | `/api/voice/speak` (`lang`), `/api/voice/languages` |
| Report a recommendation (receipt in the Value Ledger; shown as received, not resolved) | Every Kyon? sheet; list in Parivaar → Consent | `/api/report` |
| Onboarding answers: skipped = "not answered", "Pata nahi", dependents, goal; saved server-side only under DPDP "member_profile"; invite a member | Onboarding family + invite steps; Parivaar → Family | `/api/onboarding`, `/api/onboarding/invites`, `/api/invite/{code}`, `/join/{code}` |

## Environment

See `web/.env.example`. Live AA needs the app on the domain whose webhooks
Anumati registered (`dhan-yukti.vercel.app`) plus Upstash Redis. Without
credentials the onboarding falls back to the FastAPI replay flow.

## Local rehearsal (no real credentials)

```
cd web
node scripts/mock-fiu-module.mjs          # mock FIU module on :4010 (NOT Anumati)
ANUMATI_BASE_URL=http://localhost:4010 ANUMATI_CLIENT_ID=mock-id \
ANUMATI_CLIENT_SECRET=mock-secret NEXT_PUBLIC_AA_LIVE=true npm run dev
```
Mobile ending 5 → PMJJBY + PMSBY premiums seen; ending 7 → five private insurers.

## Languages (Bhashini)

`src/lib/voice/languages.ts` lists the read-out languages (Bhashini/ULCA codes):
hi, en, bn, mr, te, ta, gu, ur, kn, or, ml, pa, as, mai, sat, ks, ne, gom, sd,
doi, mni, brx, sa. The server asks Bhashini's pipeline for a translation and a
speech service per language (cached 30 min). A language with no service that
day returns `language_unavailable`, and the app says so and uses the phone's
voice. Numbers are checked in every script's digits (Devanagari, Bengali,
Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam, Arabic-Indic,
Ol Chiki, Meetei Mayek); a translation that changes a number is not played.
Screen text stays Hindi/English; only the read-out (and its caption) is in the
chosen language. Rehearse with `node scripts/mock-bhashini.mjs`
(`BHASHINI_CONFIG_URL=http://localhost:4020/config BHASHINI_USER_ID=mock-user BHASHINI_ULCA_API_KEY=mock-key`).

## Known gaps

- Live AA data feeds the government check, the cover-engine hints and the link
  card. The Home engines (cash-flow, priority) still read FastAPI's demo
  households; the ingest from decrypted AA data into FastAPI isn't built.
- Micro-lessons (Lessons) and the IVR/voice-channel simulations still use the
  phone's voice; they're long scripts outside the 400-character read-out.
- Speech input (Poocho mic) still uses the browser's recogniser, not Bhashini ASR.
- `manual_entries` DPDP withdrawal isn't enforced server-side (data is on the
  phone only); the notice says so.
- Reports are stored and logged for the team; there is no review queue UI.
