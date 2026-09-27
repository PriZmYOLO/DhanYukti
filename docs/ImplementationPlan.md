# Implementation plan

Feature freeze **Tue 29 Sep 2026, 12:00**. Present **Wed 30 Sep 2026**.
Order: thin vertical slice first (manual fact → snapshot → E03 → E13 → E14 → Home), then real sandbox, then the game.

| Owner | Sat 26 Sep | Sun 27 Sep | Mon 28 Sep | Tue 29 Sep |
|---|---|---|---|---|
| **Anish** (data, connectors) | Open sandbox email; one Anumati consent + fetch working; confirm FI types & fees | Normalise sandbox data into Twin; BSA fallback config | Ration / electricity / RC adapters; record redacted replay | Lender Shield list; demo data check |
| **Amma** (engines, companion) | Golden fixtures; E03 + Safe to Spend | E13 + E14 for A, B, C | Shock sliders (E07/E08); Kyon? packets; companion tools | Hindi copy check; companion test prompts |
| **Harshal** (backend, permissions) | Repo, auth, consent tables | Consent Passport API; revoke; compute-then-delete job | Game service; nudge scheduler | Deploy; backup environment |
| **Lohit** (screens) | PWA shell, tabs, Hindi strings, onboarding | Home: Aaj ka kaam, dial, cash river | Jars, Rewards, animations, what-if | Polish on real ₹10k Android; record video |
| **Yashraj** (acceptance, delivery) | Deck outline; architecture diagram | Risk 1-pager; business model 1-pager | Test with 2 real users; fix list | Final deck; rehearse ×2; Q&A drill |

## Build status (prototype scaffold)
- [x] Docs folder and API contract
- [x] FastAPI: engines, fixtures A/B/C, replay connectors, live-client skeletons, game, companion
- [x] Next.js PWA: design system, onboarding, 5 tabs, Anumati sandbox screen
- [ ] Live Anumati/Perfios credentials wired (waiting on sandbox email)
- [ ] Bhashini voice (Web Speech API used meanwhile)
- [ ] Supabase persistence (in-memory for now)
- [ ] WhatsApp Business API (wa.me click-to-chat for now)

Live progress: [Tracker.md](Tracker.md).
