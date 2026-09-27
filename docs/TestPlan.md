# Test plan

## 1. Engine tests (pytest, `api/tests`)
Golden fixture A (as-of 23 Sep 2026, ₹6,000, ₹500/day, electricity ₹1,500 on 27, fee ₹5,000 on 28, salary ₹30,000 on 30, floor ₹4,000):
| Check | Expected |
|---|---|
| Balances 24–30 Sep | 5,500 · 5,000 · 4,500 · 2,500 · −3,000 · −3,500 · 26,000 |
| First deficit | 28 Sep, gap ₹3,000 |
| Move fee to 30 Sep | gap 0; min before payday ₹1,500 → ₹2,500 below floor |
| nba[0] | tier 1, red, school, "28 tareekh ko ₹3,000 kam padenge" |
| Lender Shield | QuickRupee not on RBI list, ₹340 charges |
| Debt load | 14 per ₹100 |
| Own-account transfer | not income |
| Missing data | `pata_nahi`, never 0 |

## 2. API contract tests
Every endpoint in API_CONTRACT.md returns the documented shape; bilingual fields have both `hi` and `en`.

## 3. Consent tests
start → PENDING → approve → ACTIVE → fetch (steps all done) → revoke → REVOKED; fetch after revoke rejected. Callback alone doesn't activate without status poll.

## 4. UI acceptance (Yashraj, real phone)
| Test | Pass if |
|---|---|
| 60-second rule | Sunita-persona finishes each screen by taps/voice without English |
| Onboarding | < 4 min end-to-end |
| Tap targets | ≥ 48 px; primary CTA in bottom third |
| Status | never colour-only |
| Literacy modes | same numbers in Aasaan / Saathi / Pro |
| Weak network | Chrome "Slow 3G" still usable; skeletons show |
| Scenario | "sirf andaaza" label visible; real plan unchanged until confirm |
| Secrets | no key in bundle |

## 5. Real-user tests (Mon 28 Sep)
Two users, voice onboarding. Record time per step, confusion points, words not understood → fix list in Tracker.

## 6. Demo rehearsal
Full 20-minute run ×2, with each fallback triggered once.
