# PRD — DhanYukti (धनयुक्ति)

**One line:** a phone-first, voice-first money companion for Tier 2/3 families earning ~₹30,000/month. It uses consented AA data (Anumati) and Perfios analytics to warn the family about a cash crunch, debt trap or protection gap *before* it happens, and gives one simple next step in their language — as a game the whole family plays.

**Pitch line:** India built open finance so lenders can assess families. DhanYukti uses the same consented data to protect families before they need a loan.

## Users
| Persona | Where | Income | Main problem | Hero feature |
|---|---|---|---|---|
| A. Sunita & Ramesh Yadav | Panipat | ₹30,000 salary | ₹3,000 short on 28 Sep (school fee before salary); 2 app loans | Month-End Radar + Lender Shield |
| B. Farida Sheikh | Indore | ₹26,000 irregular (tailoring + gig) | Sole earner, no cover | Shock Simulator + Protection Check |
| C. Arjun & Meena Nair | Coimbatore | ₹38,000 dual | ₹52k idle surplus; child's education in 8 yrs | Gullak jar + RD/SIP education |

Primary user is usually the woman running the household budget. Shared ₹8–12k Android, patchy 4G, WhatsApp-native, Hindi/regional first, low reading comfort.

**Design test for every screen:** Sunita can finish it in < 60 s by voice or taps, without reading an English word.

## Goals (mapped to rubric)
| Rubric (weight) | Must show |
|---|---|
| Customer problem (20%) | Voice Hindi onboarding, 3 households, inclusion table |
| DPI/AA use (25%) | Live Anumati consent → fetch → Perfios analytics → Twin → live revoke |
| Insight quality (15%) | Deficit found 5 days early; Kyon? card; honest residual gap; what-if sliders |
| Trust & regulation (15%) | Dual-Consent Passport, compute-then-delete, advice labels, Firewall |
| Business model (15%) | ₹0 for families, sponsor pays ₹50–70/household/month, break-even ~16,700 |
| Feasibility (5%) / Demo (5%) | Architecture with trust boundaries; drag-the-bill moment |

## Features (v1 scope)
1. **Onboarding** (< 3 min, 8 steps): language by spoken sample → Consent Passport with the bank-registered mobile (no Aadhaar/PAN, no DhanYukti OTP) → Anumati approval (Anumati's OTP is the identity step) → first reveal from their own bank + confirm repeating bills → only what the bank can't tell (family, cash at home, a bill paid in cash, goal) → invite → first Gullak.
2. **Home**: Aaj ka kaam, Safe-to-Spend dial, 30-day cash river (drag a bill), Gullak jars, Family Health tiles, Agar…? sliders, mission bar, spend donut.
3. **Four numbers**: Safe to Spend (E03), Resilience Days (E05), Debt Load per ₹100 (E04), Protection (E06), each with pakka/andaaza/pata nahi.
4. **Needs + Priority**: E13 picks one; E14 writes the card; every card has Kyon? / Karo / Baad mein.
5. **Act**: WhatsApp draft, UPI AutoPay to Gullak, official PMJJBY/PMSBY/Ayushman links, cheaper-option + SACHET, 5-day plan, correction, help.
6. **Game**: Gullak jars, Paisa Points, streaks + shield, family missions, levels Beej → Bargad, badges, micro-lessons.
7. **Consent**: AA per member via Anumati, DPDP grants, sharing levels (Poora / Sirf total / Private), one-tap revoke, receipt.
8. **Poocho**: voice companion that explains only; numbers come from engines.

## Success metrics (pilot)
- 40% of families active at 3 months · measurable drop in EMI bounces within 6 months · ≥ 1 evidenced saving in the Value Ledger per active household per month.

See [NonGoals.md](NonGoals.md) for what we are *not* building.
