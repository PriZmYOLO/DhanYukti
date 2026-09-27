# Rules — non-negotiables for every PR

## Product rules
1. **Rules calculate, AI explains.** Engines are pure Python functions. The companion only rephrases numbers it is given.
2. **Client never recalculates money.** The PWA displays values returned by the API. Scenario maths happens in `/simulate` (E03).
3. **One shared simulator.** Dashboard river, what-if sliders and companion all call E03. No second cash-flow implementation.
4. **Money is integer paise internally**, integer rupees on the wire.
5. **Missing data is never zero.** Show `pata_nahi` instead.
6. **Scenario ≠ plan.** Any what-if is labelled "sirf andaaza" and never changes the real plan until confirmed.
7. **Priority:** tier first (1 Act now → 2 Protect → 3 Build → 4 Grow); within a tier earliest date of harm wins. Urgent essential beats bigger opportunity.
8. **Every output is tagged** `jaankari` (education) or `referral` (SEBI RIA / IRDAI intermediary / regulated lender).
9. **Corrections are overlays.** The bank record is never rewritten.
10. **Own-account transfers are never income.**

## Design rules (Lohit owns, Yashraj tests)
1. Voice first: every screen has a speaker button; primary flows work by voice.
2. One screen, one decision.
3. Colour + icon + word, never colour alone (green safe / amber watch / red act now).
4. Rupees, never percentages ("₹340 gaya byaaj mein", not "36% APR"). Days, not ratios.
5. Thumb zone: primary buttons in bottom third, targets ≥ 48×48 px, bottom tab bar, no hamburger.
6. Cheap phones: first load < 1.5 MB, skeletons not spinners, animations < 200 KB.
7. Three literacy modes (Aasaan / Saathi / Pro) — same numbers in all.
8. Assisted mode helper sees step status only — never OTPs, balances or advice.
9. "Madad chahiye?" on every screen.
10. No shame, no fear: "Chalo, agle mahine ₹500 bachate hain", never "You overspent".

## Nudge rules
Quiet hours 9 pm – 8 am · max one nudge per day · lock-screen text shows no amounts.

## Engineering rules
- Keys only in backend env. Never in the PWA, `NEXT_PUBLIC_*`, Git, or docs. See [Security.md](Security.md).
- Log request IDs and status codes only — never payloads, OTPs or keys.
- Never write our own crypto. Decrypt AA payloads only with the provider's library.
- Every connector sits behind the interface in `api/app/connectors/base.py` so replay can swap in.
- Game tables never write financial records.
