# Content & copy system

Every word the family sees or hears: voice and tone, fixed terms, and bilingual copy tables. Strings marked **(code)** are copied from the current source so the doc and the app agree. Where the copy should change, a **Suggested:** note sits next to it. Change the code and this doc in the same PR. Strings marked **(new)** are not built yet.

Owners: engines / Hindi copy (strings in `api/app/engines/*.py`), screens (strings in `web/src/**`). Visual rules: [Design.md](Design.md). Term definitions: [Glossary.md](Glossary.md).

**Placeholders:** `{name}`, `{amt}` (formatted `₹3,000`), `{day}` (a number such as `28`), `{date}` (such as `28 Sep`), `{n}`. Values always come from the API (Rules §2). Copy never computes them.

---

## 1. Voice and tone

We sound like **a trusted elder sister who is good with money**: warm, direct and never preachy.

| Principle | Do | Don't |
|---|---|---|
| Warm, not clinical | "Chalo, agle mahine ₹500 bachate hain" | "You overspent by ₹500" |
| No shame | "Fee salary se 2 din pehle hai" (the calendar is the problem) | "Aapne planning nahi ki" |
| No fear | "Agar nahi kiya: app loan lena pad sakta hai" (a fact plus a cost) | "Danger! You will default!" |
| Rupees, not percentages | "₹3,000 par 15 din mein ₹340 byaaj" | "276% APR" |
| Days, not ratios | "Bina aamdani 12 din chal payenge" | "Liquidity ratio 0.4" |
| One ask | "Aaj ka kaam: ek message bhejein" | Three tasks in one card |
| Credit the family | "Shabaash! Gullak mein paisa gaya" | "Task completed" |
| Honest about certainty | "Andaaza" / "Pata nahi" | Show ₹0 when data is missing |
| We explain, the rules count | "Niyam ginte hain, AI sirf samjhata hai" | "Our AI thinks you should…" |
| Respectful address | "{name} ji" in Hindi. First name in English | "Dear customer" |

**Banned words and phrases:** overspent, fail/failed (for a person), default (as a threat), bad, irresponsible, "you must", galti, bekaar kharch (for a person's spending), "last chance", ALL-CAPS warnings. Also banned: any fund, stock or policy *name* offered as a recommendation.

**Allowed urgency:** "Abhi karein" (Act now) appears only as a tier label with its icon. The urgency comes from a **date** ("28 tareekh ko"), not from adjectives.

## 2. Language rules

| Rule | Detail |
|---|---|
| Primary language | Romanised Hinglish, the way people type on WhatsApp ("Aaj kharch kar sakte hain"). Devanagari is not used in body copy for v1. |
| Secondary language | English sub-line under the Hinglish line (`Bi` component), 12 px, muted. Hidden in Pro mode. When the user picks EN, English becomes primary and Hinglish becomes the sub-line. |
| Devanagari | Tab labels (घर लक्ष्य पूछो इनाम परिवार), language names (हिंदी, मराठी), the wordmark धनयुक्ति, and the toggle label "हिं". |
| Numbers | `₹` + Indian grouping: `₹30,000`, `₹1,00,000`. Say "₹2 lakh" for round lakhs. Never "Rs." or "INR". Negative amounts use the true minus sign: `−₹3,000`. |
| Dates | Hinglish: "28 tareekh ko", "28 Sep". English: "on the 28th", "28 Sep". Month names are always short English (Sep, Oct), even in Hindi. |
| Rates | Loans: rupees charged over days. Debt load: "₹14/₹100" (debt per ₹100 earned). Never "%". |
| Honorific | Hinglish: "{name} ji" in greetings, the reveal step and protection cards. |
| Speech | TTS replaces `₹` with "rupaye" / "rupees". Write numbers so they read aloud cleanly: no ranges with "/", say "150 se 300" in speech. |
| Length | Card title ≤ 40 characters. Body ≤ 90. Task ≤ 120. Button ≤ 3 words. |
| Sentence case | Always sentence case. Uppercase is used only for eyebrow labels (AAJ KA KAAM) and tags. |

## 3. Glossary of fixed product terms

These terms are fixed. Use them exactly and don't translate them in Hinglish copy.

| Term | English meaning | Use it for | Never say |
|---|---|---|---|
| **DhanYukti** (धनयुक्ति) | Product name | — | Dhan Yukti, Dhanyukti |
| **Aaj ka kaam** | Today's task | The top NBA card and its task block | "Recommendation" |
| **Karo** / **Baad mein** | Do it / Later | The two buttons on an NBA card | "Accept / Dismiss" |
| **Kyon?** | Why? | The explanation sheet | "Details" |
| **Agar…?** | What if? | The scenario simulator | "Simulator" in Hinglish copy |
| **Sirf andaaza** | Scenario only | Every what-if result | "Prediction" |
| **Asli plan** | Real plan | The reset from a scenario | — |
| **Pakka / Andaaza / Pata nahi** | Confirmed / Estimate / Unknown | Confidence labels | "High/Low confidence" |
| **Surakshit / Dhyaan dein / Abhi karein** | Safe / Watch / Act now | Status words | "OK / Warning / Critical" |
| **Gullak** | Clay piggy-bank jar | A user's savings goal (money stays in their own bank) | "Wallet", "account" |
| **Paise ki nadi** | Cash river | The 30-day projected balance chart | "Graph" |
| **Safety floor** | Minimum balance to keep | The dashed line on the river | Suggested: "Suraksha rekha" in Hinglish |
| **Bachav ke din** / **Bina aamdani kitne din** | Resilience Days | Days that essentials are covered with no income | "Emergency ratio" |
| **Aaj kharch kar sakte hain** | Safe to spend today | Safe-to-Spend metric | "Disposable income" |
| **₹100 kamai par karz** | Debt per ₹100 earned | Debt load metric | "DTI" |
| **Suraksha (bima)** | Protection (insurance) | Protection metric | — |
| **Paisa Points** | Habit points (no cash value) | The game | "Coins", "cashback" |
| **Beej → Ankur → Paudha → Ped → Bargad** | Seed → Sprout → Sapling → Tree → Banyan | Levels | — |
| **Parivaar mission** | Family mission | Shared weekly or monthly goal | — |
| **Consent Passport** | — | The AA + DPDP consent screen and the Parivaar section | "Permissions" |
| **Anumati** | Our AA (Perfios AA Pvt Ltd) | Always "Anumati (RBI-licensed Account Aggregator)" on first mention | "our partner app" |
| **Jaankari** / **Referral** | Information / referred to a licensed professional | The advice label | "Advice" for Jaankari |
| **Madad chahiye?** | Need help? | Human help route | "Support" |
| **Bank mitra** | Bank correspondent / helper | Human helper | "Agent" |
| **Value Ledger** / **Asli bachat** | Evidenced savings | The Inaam section | — |
| **Poora / Sirf total / Sirf mere liye** | Full / Totals / Private | Sharing levels | — |
| **Aasaan / Saathi / Pro** | Literacy modes | Parivaar settings | — |

**Suggested:** the English for level 3 is "Plant" in `rewards/page.tsx` and "Sapling" in `api/app/game/service.py`. Use **Sapling** everywhere.

---

## 4. Global chrome

| Hinglish | English | Where used |
|---|---|---|
| घर · लक्ष्य · पूछो · इनाम · परिवार | Home · Goals · Ask · Rewards · Family | `TabBar` labels (code). Devanagari when lang = hi |
| Suprabhat 🙏 / Namaste 🙏 / Shubh sandhya 🙏 | Good morning / Hello / Good evening | `TopBar` greeting before 12, before 17, and after 17 (code) |
| हिं / EN | — | `LangToggle` (code) |
| Sunein | Listen | `SpeakBtn` aria-label "Sunein / Listen" (code) |
| Band karein | Close | Sheet close aria-label (code) |
| Madad chahiye? Bank mitra se baat karein · 1800-000-000 | Need help? Talk to a bank mitra | `HelpLink` (code). **Suggested:** replace the placeholder number before the demo |
| Aaj ek kaam — baaki hum sambhaal lenge | One task today — we'll handle the rest | Home sub-header (code) |
| DhanYukti khud paisa nahi bhejta — aap hi confirm karte hain. | DhanYukti never moves money by itself — you confirm every step. | Footer of every ActionSheet (code) |
| Niyam ginte hain, AI sirf samjhata hai | Rules calculate, AI only explains | Kyon? footer, Poocho footer (code) |
| Dobara | Retry | Retry buttons (code) |
| Aage | Next | Onboarding (code) |
| Theek hai | Okay / Done | Sheet close buttons (code) |

---

## 5. Onboarding (`/onboarding`)

| Step | Hinglish | English | Element |
|---|---|---|---|
| 1 splash | Paisa samjho, **parivaar bachao** | Know your money, **protect your family** | H1 (second line in clay) (code) |
| | Mahine ke aakhir ki kami se pehle hi batayenge — aapki bhasha mein. | We warn you before the month-end crunch — in your language. | Sub (code) |
| | Shuru karein → | Get started → | Button (code) |
| | Parivaar ke liye muft · Anumati AA se surakshit | Free for families · secured via Anumati AA | Footnote (code) |
| 2 language | Apni bhasha chunein | Choose your language | Title (code) |
| | Sunne ke liye 🔊 dabayein | Tap 🔊 to hear it | Sub (code) |
| | Namaste! Main DhanYukti hoon, aapka paisa saathi. | Hello! I am DhanYukti, your money companion. | Spoken samples (code). Tamil, Marathi and Bengali samples are in their own scripts, marked "· v1.1" |
| 3 login | Aapka mobile number | Your mobile number | Title (code) |
| | Aadhaar ya PAN ki zaroorat nahi | No Aadhaar or PAN needed | Sub (code) |
| | OTP (demo: koi bhi 6 ank) | OTP (demo: any 6 digits) | Label (code) |
| | Helper (bank mitra) kabhi aapka OTP ya balance nahi dekhte | A helper never sees your OTP or balance | Trust note (code) |
| 4 family | Aapka parivaar | Your family | Title (code) |
| | Bas 5 tap | Just 5 taps | Sub (code) |
| | Ghar mein kitne log? · Kitne kamaate hain? · School jaane wale bachche | People at home · How many earn? · Children in school | Counters (code) |
| | Kaam kya hai? — Naukri · Dukaan · Gig · Mazdoori | Type of work — Job · Shop · Gig · Daily | Chips (code) |
| | Koi loan chal raha hai? — Haan / Nahi | Any running loans? — Yes / No | (code) |
| 5 passport | Consent Passport | Consent Passport | Title (code) |
| | Do alag permission — dono kabhi bhi band kar sakte hain | Two separate permissions — stop either anytime | Sub (code) |
| | Haan — Anumati se jodein | Yes — connect via Anumati | Primary button (code) |
| | Consent Anumati (RBI-licensed Account Aggregator) sambhaalta hai | Consent handled by Anumati, an RBI-licensed Account Aggregator | Footnote (code) |
| 6 connect | Aapka hisaab ban raha hai… | Preparing your account… | Title (code) |
| | Anumati + Perfios · live sandbox / replay (recorded sandbox) | same | Mode line (code) |
| | Sahmati jaanchi gayi → Khate jude → Data aaya (encrypted) → Data khola gaya → Perfios analytics → Household Twin bana → Replay: kachcha data delete (sirf dikhawa, asli data nahi aaya) | Consent verified → Accounts linked → Data fetched (encrypted) → Decrypted → Perfios analytics → Household Twin built → Replay: raw data deleted (simulated, nothing real was fetched) | Step list (code, `routers/consent.py`). **Suggested:** "Household Twin bana" → "Aapke ghar ka hisaab bana" |
| 7 reveal | Yeh raha aapka hisaab | Here's your picture | Title (code) |
| | {name} ji, parivaar ki paisa sehat | {name}, your family's money health | Sub (code) |
| | Pehla kaam | First task | Eyebrow on the first NBA (code) |
| | Badhiya! Aage | Great! Next | Button, which triggers the celebration (code) |
| | Pehla Kadam! +100 Paisa Points | First Step! +100 | Celebration (code) |
| 8 gullak | Pehla Gullak chunein | Pick your first Gullak | Title (code) |
| | Salary ke din thoda khud ko do | On salary day, pay yourself a little first | Sub (code). **Suggested:** for gig households (B), use "Kamai aate hi thoda khud ko do" |
| | Paisa aapke apne bank RD / bachat mein rehta hai. DhanYukti kabhi paisa nahi pakadta. | Money stays in your own bank RD / savings. DhanYukti never holds money. | Trust note (code) |
| | Ghar chalein 🏠 | Go home 🏠 | Button (code) |

---

## 6. Dual-Consent Passport

Every consent card has the same three rows with icons: 👁 **Kya dekhenge** · 🎯 **Kyon** · ⏳ **Kab tak**.

| Card | Row | Hinglish | English |
|---|---|---|---|
| **1. Parivaar ki jaankari** (tag DPDP, rose) | Kya dekhenge | Parivaar, kaam, bhasha, phone ke signal | Family, work, language, phone signals |
| | Kyon | Sahi bhasha aur sahi salah ke liye | To pick the right language and guidance |
| | Kab tak | Jab tak aap mita na dein | Until you delete it |
| | Choices | ✓ Haan / Phone signal nahi | ✓ Yes / No phone signals |
| **2. Bank ka len-den** (tag AA · Anumati, ink) | Kya dekhenge | Aapke bank ka 6 mahine ka len-den, RD, bima | 6 months of bank transactions, RD, insurance |
| | Kyon | Taaki mahine ke aakhir mein paise kam na padein | So you don't run short at month-end |
| | Kab tak | 3 mahine. Kabhi bhi band kar sakte hain | 3 months. Stop anytime |

All rows above are (code) from `onboarding/page.tsx`. **Suggested:** the DPDP card says "salah" (advice) in "sahi salah ke liye". Use "sahi jaankari ke liye" so the card never implies advice.

**Parivaar → Consent Passport (code, `routers/consent.py`):**

| Hinglish | English | Where |
|---|---|---|
| Ghar ke paise ka hisaab (Personal finance management) | Personal finance management | AA purpose |
| 1 din — hisaab ke baad kachcha data delete | 1 day — raw data deleted after compute | AA data life |
| Tak {date} | Until {date} | AA expiry |
| Consent band karein | Revoke consent | AA card button |
| + Bank jodein (Anumati AA) | + Link bank (Anumati AA) | Empty state |
| DhanYukti data fiduciary | DhanYukti as data fiduciary | DPDP card header |
| Ghar ka profile — Aapke parivaar ke hisaab se salah dene ke liye | Household profile — To tailor advice to your family | DPDP row. **Suggested:** "…sahi jaankari dene ke liye" |
| Phone ke signal (SMS) — Bill aur EMI ki tareekh pakadne ke liye | Device signals (SMS) — To catch bill and EMI dates | DPDP row |
| Ration card — Sarkari yojana ki patrata dekhne ke liye | Ration card — To check scheme eligibility | DPDP row |
| Bijli bill — Bill ki tareekh aur rakam jaanne ke liye | Electricity bill — To know bill dates and amounts | DPDP row |
| Gaadi ka RC — Gaadi loan aur bima check karne ke liye | Vehicle RC — To check vehicle loan and insurance | DPDP row |
| EPF passbook — PF bachat ko suraksha mein ginne ke liye | EPF passbook — To count PF savings in your safety net | DPDP row |
| Jab tak aap band na karein / Band | Until you turn it off / Off | DPDP "until" |
| Har jaankari ke liye alag permission. Sirf tab poochte hain jab isse faisla badle. | Separate consent for each. We only ask when it changes a decision. | Enrich footnote (code) |
| Haan, jodo | Yes, add | Enrich button (code) |

**Sharing levels (code):** Poora / Sirf total / Sirf mere liye → Full / Totals / Private.

---

## 7. Anumati approval screen (`/anumati`, replay stand-in)

This screen is intentionally mostly English, because it mirrors the AA's own UI. It is never DhanYukti-branded.

| Hinglish | English | Element |
|---|---|---|
| SANDBOX SIMULATION · replay mode | same | Chip (code) |
| Anumati — Account Aggregator | same | Header (code) |
| RBI-licensed consent manager · +91 98xxxxxx10 | same | Sub (code) |
| DhanYukti aapke data ke liye consent maang raha hai | DhanYukti is requesting consent for your data | Request line (code) |
| Purpose: Personal finance management · FI types: DEPOSIT, RECURRING_DEPOSIT, INSURANCE_POLICIES · Range: Last 6 months · Frequency: Monthly (periodic) · Valid till: 90 days · Data life: 1 day | same | Definition list (code) |
| Mile khaate | Accounts discovered | (code) |
| OTP (sandbox: any 6 digits) | same | (code) |
| Aadhaar se khaate nahi dhoondhe jaate | Accounts are never discovered using Aadhaar | Trust line (code) |
| Mana karein / Manzoor karein | Reject / Approve | Buttons (code) |
| **(new)** Koi baat nahi. Bank jode bina bhi aap Gullak aur Poocho use kar sakte hain. | No problem. You can still use Gullak and Poocho without linking a bank. | Passport step after Reject. **Suggested:** today Reject silently returns to the passport step |

---

## 8. Home widgets

| Hinglish | English | Where |
|---|---|---|
| AAJ KA KAAM | TODAY'S TASK | Eyebrow on the first card (code) |
| ✅ Aaj ka kaam | ✅ Today's task | Task block label (code) |
| Agar nahi kiya: | If you wait: | Consequence line (code) |
| Kyon? · Karo → · Baad mein | Kyon? · Do it → · Later | Card buttons (code) |
| +{n} Paisa Points | same | Card footer (code) |
| Paise ki nadi | Cash river | Section (code) |
| Agle 30 din ka paisa | Your money, next 30 days | River card title (code) |
| −{amt} · {date} / Kami nahi | −{amt} · {date} / No shortfall | Gap pill (code) |
| Peela bill khiskao aur dekho kya hota hai | Drag the yellow bill and see what happens | Hint (code) |
| {date} par | Move to {date} | Shortcut button (code) |
| 🔮 SIRF ANDAAZA — asli plan nahi badla | 🔮 SCENARIO ONLY — real plan unchanged | Scenario banner (code) |
| Asli plan | Real plan | Reset chip (code) |
| Kami khatam | Gap closed | Scenario result (code) |
| Safety floor ₹{amt} | Safety floor ₹{amt} | River line label (code). **Suggested:** Hinglish "Suraksha rekha ₹4,000" |
| Surakshit · Floor se neeche · Kami | Safe · Below floor · Short | River legend (code). **Suggested:** "Rekha se neeche" to match the line label above |
| Gullak | Savings jars | Section (code) |
| {jar} mein {amt} hain, lakshya {goal} | {jar} has {amt} of {goal} | Spoken when the jar is tapped (code) |
| Paisa daalo | Add money | Jar + aria-label (code) |
| Parivaar ki sehat | Family money health | Section (code) |
| Agar…? (What if?) · 🔮 SIRF ANDAAZA | What if? · 🔮 SCENARIO ONLY | WhatIf header (code) |
| 🏥 Hospital ka bill aaye | A hospital bill comes | Slider (code) |
| ⏳ Salary late ho — {n} din | Salary is late by — {n} days | Slider (code). **Suggested:** for B use "Kamai late ho" |
| Bachav ke din · Sabse badi kami | Resilience days · Biggest shortfall | Result tiles (code) |
| Parivaar mission · {amt} / {target} bacha liye · {n}% | Family mission · saved | Mission (code). **Suggested:** drop "· {n}%", because the bar already shows it (rule 4) |
| Kahaan gaya paisa · Pichhla mahina | Where did the money go · Last month | Donut (code) |
| Ghar (kiraya, bill, fee) · Khana-peena · EMI / karz · Bachat / bima · Baaki (cash, dawai, anya) | Home (rent, bills, fees) · Food & groceries · EMIs / loans · Savings / insurance · Other (cash, medicine, misc) | Donut slices (code, `pipeline.py`) |
| Hamara hisaab vs Perfios analytics | Our E01 vs Perfios analytics | DataSource (code) |
| Live sandbox · Replay (recorded sandbox) · Demo fixture | same | DataSource mode (code) |

**Scenario messages** come from `/simulate` (code, `pipeline.py`). Examples:
- "School fee 30 tareekh ko dene se ₹3,000 ki kami khatam. Par 29 Sep tak ₹{fg} safety floor se kam rahega — 5 din ₹200 kam kharch karein ya Gullak use karein."
- "₹20,000 ke achanak kharch se {day} tareekh ko {amt} kam padenge. Bina aamdani {n} din chal payenge."

---

## 9. The four metrics, confidence and status words

| Metric (engine) | Label (hi / en) | Value format | Sub-line (hi / en) |
|---|---|---|---|
| Safe to Spend (E03) | Aaj kharch kar sakte hain / Safe to spend today | `₹{amt}` | Salary ({date}) tak, zaroori kharch ke baad / Until salary on {date}, after essentials · *(no salary)* Agle 14 din, zaroori kharch ke baad / Next 14 days, after essentials · *(₹0)* Sirf zaroori kharch (₹{amt}/din) / Essentials only (₹{amt}/day) |
| Resilience Days (E05) | Bina aamdani kitne din / Days covered without income | `{n} din` / `{n} days`. On Home: "din ka bachav" / "days of safety" | Bachat ₹{a} ÷ roz ₹{b} / Savings ₹{a} ÷ ₹{b}/day. **Suggested:** "Bachat ₹{a}, roz ka zaroori kharch ₹{b}", with no ÷ sign |
| Debt load (E04) | ₹100 kamai par karz / Debt per ₹100 earned | `₹{n}/₹100` | EMI ₹{amt}/mahina · {n} app loan (3 mahine) / EMIs ₹{amt}/month · {n} app loans (3 months) |
| Protection (E06) | Suraksha (bima) / Protection (insurance) | Poora / Aadha / Nahi → Covered / Partial / None | "{name}: jeevan bima nahi · Ayushman: pata nahi" / "{name}: no life cover · Ayushman: unknown" · Sabka bima hai / Everyone is covered |

All rows are (code) from `pipeline.py`, `e04_debt.py`, `e06_protection.py` and `HealthTiles.tsx`. When a value is missing, show **Pata nahi / Unknown**. Never show ₹0.

| Confidence | Hinglish | English | Dot | Meaning |
|---|---|---|---|---|
| `pakka` | Pakka | Confirmed | leaf | Seen in AA data |
| `andaaza` | Andaaza | Estimate | amber | Inferred from a pattern |
| `pata_nahi` | Pata nahi | Unknown | muted | No data. Ask the family or leave it blank |

| Status | Hinglish | English | Icon |
|---|---|---|---|
| green | Surakshit | Safe | CircleCheck |
| amber | Dhyaan dein | Watch | CircleAlert |
| red | Abhi karein | Act now | OctagonAlert |

| NBA tier | Hinglish | English |
|---|---|---|
| 1 | Abhi karein | Act now |
| 2 | Suraksha | Protect |
| 3 | Majboot banayein | Build |
| 4 | Badhayein | Grow |

Other status words (code): Bima hai / Bima nahi (Covered / No cover) · RBI list mein / RBI list mein nahi · KAMAANE WALE (EARNER) · ACTIVE / REVOKED · PAKKA / BATAYA (EVIDENCED / REPORTED) in the Value Ledger. **Suggested:** in the Value Ledger, use **SABOOT** instead of PAKKA so it doesn't clash with the confidence label "Pakka".

---

## 10. Hero NBA cards (E14, `api/app/engines/e14_nba.py`)

Card fields: **title** · **body** · **task** (Aaj ka kaam) · **if_not** (Agar nahi kiya) · **second_step** (↳) · **action label** · Kyon? **rule** · label (jaankari/referral) · points.

### Household A — Sunita & Ramesh Yadav, Panipat

**A1. Month-End Radar (tier 1, red, icon `school`, E03, +25)**

| Field | Hinglish | English |
|---|---|---|
| title | 28 tareekh ko ₹3,000 kam padenge | You'll be ₹3,000 short on the 28th |
| body | School fee (₹5,000) salary se 2 din pehle hai. | The school fee comes 2 days before salary. |
| task | School se fee 30 tareekh tak badhane ki request bhejein. Hum message likh denge. | Ask the school to move the fee to the 30th. We'll write the message. |
| if_not | App loan lena pad sakta hai, lagbhag ₹150–₹300 kharcha. | You may need an app loan, costing about ₹150–₹300. |
| second_step | Fee badhne ke baad bhi ₹{fg} kam — 5 din ₹200 kam kharch, ya Gullak se. | Even after moving the fee, you're ₹{fg} below your safety floor — spend ₹200 less for 5 days, or use the Gullak. |
| action | Message taiyaar hai — bhejein | Message ready — send it |
| rule | Salary 30 ko aati hai, fee 28 ko hai | Salary arrives on the 30th, the fee is due on the 28th |
| label / confidence | Jaankari · from engine | |

**Suggested:** the Hinglish second_step is missing "safety floor se". Use "Fee badhne ke baad bhi ₹{fg} suraksha rekha se kam — …".

**A2. Lender Shield (tier 1, red, icon `loan`, E04, +25)**

| Field | Hinglish | English |
|---|---|---|
| title (code) | QuickRupee RBI list mein nahi — saal ka ~276% kharcha | QuickRupee isn't on RBI's list — ~276% a year |
| **Suggested title** | QuickRupee RBI list mein nahi — ₹3,000 par 15 din mein ₹340 byaaj | QuickRupee isn't on RBI's list — ₹340 for 15 days on ₹3,000 |
| body | 3 mahine mein 2 app loan. QuickRupee ne ₹3,000 par 15 din mein ₹340 liye. | 2 app loans in 3 months. QuickRupee charged ₹340 on ₹3,000 for 15 days. |
| task | Agli baar app loan se pehle bank se overdraft ya chhota loan poochhein. App RBI list mein hai ya nahi, check karein. | Before the next app loan, ask your bank for an overdraft or small loan. Check whether the app is on RBI's list. |
| if_not | Har baar ~₹300 extra, aur galat app se dhamki aur data ka khatra. | About ₹300 extra each time, plus risk of harassment and data misuse from unregistered apps. |
| second_step | Dhamki ya galat vasooli ho to sachet.rbi.org.in par shikayat karein. | If you face threats or unfair recovery, complain at sachet.rbi.org.in. |
| action | Sasta vikalp dekhein | See a cheaper option |
| rule (code) | RBI list mein nahi, ya saal ka kharcha 36% se zyada = khatra | Not on RBI's list, or costing over 36% a year = danger |
| **Suggested rule** | RBI list mein nahi, ya ₹100 par saal ka ₹36 se zyada kharcha = khatra | Not on RBI's list, or over ₹36 a year per ₹100 = danger |
| **Shipped rule** | DhanYukti ka niyam (RBI ka nahi): ₹100 par saal ka ₹36 se zyada = mehenga. Live data: hamari RBI list ki copy mein nahi = pata nahi, RBI site par check karein | DhanYukti's rule (not RBI's): more than ₹36 a year per ₹100 = expensive. Live data: not in our copy of RBI's list = unknown, check RBI's site |
| Lender row verdict (code) | RBI ki list mein nahi — saal ka ~276% kharcha. Isse bachein. | Not on RBI's list — costs ~276% a year. Avoid. |
| Lender row line (code) | ₹3,000 liye, 15 din mein ₹340 byaaj gaya | Borrowed ₹3,000, paid ₹340 in 15 days |

**A3. Penalty saver (tier 3, amber, icon `bolt`, E01, +25)**

| Field | Hinglish | English |
|---|---|---|
| title | 6 mahine mein ₹590 bank charges kate | ₹590 lost to bank charges in 6 months |
| body | Min balance na rakhne aur EMI bounce ke charges. | Charges for low minimum balance and a bounced EMI. |
| task | EMI (₹4,200) se ek din pehle khate mein paisa rakhein; SMS alert chalu karein. | Keep money in the account a day before the EMI (₹4,200); turn on SMS alerts. |
| if_not | Har mahine ~₹100 aise hi katenge. | About ₹100 will keep getting cut every month. |
| action | Yaad dilayein → reminder "Kal EMI hai — khate mein paisa rakhein" | Set reminder → "EMI tomorrow — keep money in the account" |
| rule | CHRG / RTN wali entries = bank charges | Entries marked CHRG / RTN = bank charges |
| label / confidence | Jaankari · Pakka | |

The EMI amount is the engine's monthly EMI total (Bajaj ₹2,100 + HDFC ₹2,100 in the fixture). **Suggested:** the "Yaad dilayein" action currently opens the generic 5-day plan sheet. Give it its own reminder confirmation: "Har mahine 4 tareekh ko yaad dilayenge ✓".

### Household B — Farida Sheikh, Indore

**B1. Protection check (tier 2, red because she is the sole earner, icon `shield`, E06, +50)**

| Field | Hinglish | English |
|---|---|---|
| title | Ghar ki akeli kamane wali — ₹436 saal mein ₹2 lakh ka jeevan bima (PMJJBY) | Only earner at home — ₹2 lakh life cover for ₹436 a year (PMJJBY) |
| body | Saath mein PMSBY: ₹20/saal mein ₹2 lakh durghatna bima. Ayushman card ki patrata bhi dekhein. | Also PMSBY: ₹2 lakh accident cover for ₹20/year. And check Ayushman eligibility. |
| task | Bank mein PMJJBY + PMSBY form bharein (auto-debit). Ayushman patrata online check karein. | Fill the PMJJBY + PMSBY form at your bank (auto-debit). Check Ayushman eligibility online. |
| if_not | Kuch ho gaya to parivaar ke paas koi sahara nahi rahega. | If something happens, the family has no safety net. |
| action | Bima kaise lein → links: jansuraksha.gov.in, beneficiary.nha.gov.in ("Sarkari site") | How to enrol → "Official site" |
| note | Premium official site par dobara check karein. | Re-check the premium on the official site. |
| rule | 6 mahine mein koi bima premium nahi kata; ghar ki aamdani is vyakti par tiki hai | No insurance premium debited in 6 months; household income depends on this person |
| label | Jaankari | |

> ⚠️ **₹436 PMJJBY premium: re-check on the official site (jansuraksha.gov.in) before the demo.** It lives in `e06_protection.PMJJBY_PREMIUM` and is also hard-coded in `routers/ask.py`. **Suggested:** make `ask.py` read the constant. Also re-check PMSBY ₹20.

**Suggested:** "if_not" leans on fear. Use "Kuch ho jaaye to Ayaan aur Sana ke liye ₹2 lakh ka sahara rahega — sirf ₹436 saal mein." ("If anything happens, Ayaan and Sana would have ₹2 lakh — for just ₹436 a year.")

**B2. Ayushman check (inside the protect sheet)**

| Hinglish | English |
|---|---|
| Ayushman patrata pata nahi — beneficiary.nha.gov.in par mobile number se dekhein | Ayushman eligibility unknown — check with your mobile number at beneficiary.nha.gov.in |
| Hum koi policy nahi bechte. Enrolment bank ya licensed intermediary se hoga. (code) | We don't sell policies. Enrolment is via your bank or a licensed intermediary. |

Per-member notes (code, fixtures): Farida "Koi bima nahi · Ayushman patrata pata nahi". Zubeda "Ayushman (70+ nahi) — patrata check karein". Children "Health cover nahi".

### Household C — Arjun & Meena Nair, Coimbatore

**C1. Idle money → education Gullak (tier 4, green, icon `grow`, E13, +50, Referral)**

| Field | Hinglish | English |
|---|---|---|
| title | ₹52,000 bekaar pade hain | ₹52,000 is sitting idle |
| body | {bank} khate mein {n} din se bina istemal ke pade hain. | Unused in your {bank} account for {n} days. |
| task | ₹34,000 Kavya ke padhai Gullak mein rakhein; baaki ₹18,000 emergency ke liye. RD / recurring SIP ke baare mein SEBI-registered salahkar se samjhein. | Move ₹34,000 into Kavya's education jar; keep ₹18,000 for emergencies. Learn about RDs / recurring SIPs from a SEBI-registered adviser. |
| if_not | Mehngai se paisa har saal thoda ghat-ta hai. | Inflation quietly shrinks idle money every year. |
| second_step | Hum koi fund nahi batate — sirf jaankari. Nivesh ki salah SEBI RIA se lein. | We never name a fund — information only. Take investment advice from a SEBI RIA. |
| action | Padhai Gullak mein daalein | Move to education jar |
| learn chips | RD: har mahine tay rakam, tay byaaj · Recurring SIP: bazaar se juda, jokhim hai | RD: fixed amount monthly, fixed interest · Recurring SIP: market-linked, carries risk |
| rule | 90+ din se khate se koi nikasi nahi = bekaar paisa | No withdrawal for 90+ days = idle money |
| label / confidence | **Referral** · Pakka | |

₹34,000 = ₹52,000 − 30 days × ₹600 essentials, rounded down to ₹1,000 (the engine's value). **Suggested:** "bekaar" can sound like a judgement. Use "₹52,000 khaali baithe hain" ("₹52,000 is sitting unused").

**Suggested (new) referral line under the action:** "SEBI RIA se baat karein · DhanYukti ko is referral se ₹0 milta hai" (see §17).

### Other cards the engines can produce

| Card | Title (hi / en) | Task (hi / en) |
|---|---|---|
| Resilience (E05, tier 3) | Bina aamdani ke sirf {n} din chal payenge / Without income you'd last only {n} days | Roz {amt} Emergency Gullak mein daalein. / Put {amt} a day into the emergency jar. |
| Deficit with no movable bill (E03) | {day} tareekh ko {amt} kam padenge | Gullak ya parivaar se chhota intezaam karein; app loan se bachein. / Arrange a small amount from the Gullak or family; avoid app loans. |

---

## 11. Nudge library (new — scheduler not built)

**Rules:** quiet hours **9 pm – 8 am** (queue and send at 8:00 or later) · **max 1 nudge per day** per household, chosen by E13 tier order, with Streak saver always last · **lock-screen text never contains amounts, lender names, scheme names or balances** · tapping opens the app to the matching card · every nudge can be turned off in Parivaar.

| Nudge | Trigger | Send at | Lock-screen (no amounts) hi / en | In-app card / banner hi / en |
|---|---|---|---|---|
| **Month-End Radar** | E03 first deficit ≤ 7 days away and no action taken | 10:00 | Aaj ka kaam taiyaar hai 🙏 / Today's task is ready 🙏 | 28 tareekh ko ₹3,000 kam padenge. Ek message se hal ho sakta hai. / You'll be ₹3,000 short on the 28th. One message can fix it. |
| **Salary-day Gullak** | Salary / main income credit seen, or expected date (+1 day) | 09:00 (or first slot after the credit, outside quiet hours) | Kamai aa gayi? Pehle khud ko do 🪙 / Payday? Pay yourself first 🪙 | Salary aa gayi. ₹{amt} Gullak mein daalein? Aap confirm karenge tabhi jayega. / Salary is in. Put ₹{amt} in the Gullak? It moves only when you confirm. |
| **Lender Shield** | New app-loan disbursal in AA data or SMS (device-signal consent only) | Next 08:00+ slot | Loan lene se pehle ek baar dekh lein / Check once before you borrow | Naya app loan dikha. ₹{amt} par {n} din mein ₹{c} byaaj. Bank overdraft sasta pad sakta hai. / We saw a new app loan: ₹{c} for {n} days on ₹{amt}. A bank overdraft may be cheaper. |
| **Penalty saver** | EMI or auto-debit tomorrow and projected balance < amount | 18:00 the day before | Kal ek zaroori tareekh hai / An important date tomorrow | Kal EMI (₹{amt}) hai — aaj khate mein paisa rakh dein, bounce charge bachega. / EMI (₹{amt}) is due tomorrow — keep money in the account today to avoid a bounce charge. |
| **Protection check** | Earner with no life cover; not in a deficit week; at most monthly | 11:00, 2 days after an income credit | Parivaar ki suraksha — 2 minute ka kaam / Family protection — a 2-minute task | {name} ji, ₹436 saal mein ₹2 lakh jeevan bima (PMJJBY). Bank mein ek form. / {name}, ₹2 lakh life cover for ₹436 a year (PMJJBY). One form at your bank. |
| **Streak saver** | No check-in today by 19:00, streak ≥ 3, and no other nudge sent today | 19:30 | Aapka streak bacha lein 🔥 / Keep your streak 🔥 | Aaj ka hisaab dekh lein — {n} din ka streak bana rahega. Streak shield: {s} bache. / Check today's account — keep your {n}-day streak. Shields left: {s}. |

Nudge cards must follow the Home card rules: one task, Kyon? available, no shame. **Aasaan mode:** the in-app banner auto-plays its audio once.

---

## 12. Kyon? card labels (code, `KyonSheet.tsx`)

| Hinglish | English | Block |
|---|---|---|
| Kyon? — Humne yeh kyon kaha | Why? — Why we said this | Sheet title |
| 👁 Kya dekha | What we saw | Dated transactions with source tag (AA) |
| 🧠 Kya socha | The rule | E14 `why.rule` + 🔊 |
| Kitna pakka | How sure | ConfTag |
| Jaankari — Yeh salah nahi, jaankari hai | Jaankari — This is guidance, not advice | Label block (jaankari) |
| Referral — Registered salahkaar ke paas bhejenge | Referral — We route you to a registered adviser | Label block (referral) |
| {engine} · Niyam ginte hain, AI sirf samjhata hai | {engine} · Rules calculate, AI only explains | Footer |

**Suggested:** Kya dekha shows raw narrations such as "ACH RTN CHRG BAJAJ FINANCE INCL GST". Add a friendly line above each one, for example "Bajaj EMI bounce charge", and keep the raw narration small underneath as proof.

---

## 13. Action sheets (code, `ActionSheet.tsx`)

### 13.1 WhatsApp school message (Household A, `fixtures/households.py`)

| | Text |
|---|---|
| Kisko | School (St. Mary's, Panipat) |
| **Hindi (Hinglish)** | Namaste Sir/Madam, main Sunita Yadav, Pooja (Class 7) aur Rohan (Class 4) ki maa. Hamare ghar ki salary har mahine 30 tareekh ko aati hai. Kya is mahine ki fee ₹5,000 28 ki jagah 30 September tak jama karne ki anumati mil sakti hai? Hum 30 ko zaroor jama kar denge. Aapki madad ke liye bahut dhanyavaad. |
| **English** | Namaste Sir/Madam, I am Sunita Yadav, mother of Pooja (Class 7) and Rohan (Class 4). Our salary comes on the 30th of every month. Could we please pay this month's fee of ₹5,000 by 30 September instead of the 28th? We will surely pay on the 30th. Thank you very much for your help. |
| **Suggested Devanagari** (for schools that prefer it) | नमस्ते सर/मैडम, मैं सुनीता यादव, पूजा (कक्षा 7) और रोहन (कक्षा 4) की माँ। हमारे घर की सैलरी हर महीने 30 तारीख को आती है। क्या इस महीने की फीस ₹5,000, 28 की जगह 30 सितंबर तक जमा करने की अनुमति मिल सकती है? हम 30 को ज़रूर जमा कर देंगे। आपकी मदद के लिए बहुत धन्यवाद। |
| Buttons / labels | Kisko: / To: · Hindi / English toggle · 🔊 · **WhatsApp par bhejo** / Send on WhatsApp |
| On send | Message bhej diya! Shabaash / Message sent! Well done (+25) |

Generic fallback (code, E14): "Namaste, kya {bill} ({amt}) {day} tareekh tak jama karne ki anumati mil sakti hai? Dhanyavaad." / "Hello, could we please pay {bill} ({amt}) by the {nth}? Thank you."

### 13.2 Gullak (High Stakes Gate read-back)

| Hinglish | English | Element |
|---|---|---|
| Kitna daalein? | How much? | Amount grid ₹50–₹2,000 |
| {amt} Gullak mein daalo | Put {amt} in Gullak | Step-1 button (clay) |
| PAKKA KAREIN | PLEASE CONFIRM | Eyebrow |
| **{amt} {jar} mein, aapke apne khaate se. Sahi hai?** | **{amt} into {jar}, from your own account. Correct?** | Read-back, spoken automatically |
| Nahi, badlo / Haan, daalo | No, change / Yes, add | Buttons |
| UPI AutoPay · aapke RD / bachat khaate mein | UPI AutoPay · into your own RD / savings pocket | Footnote |
| Gullak mein paisa gaya! | Money is in the Gullak! | Celebration (+50) |
| Pehle ek Gullak banayein | Create a Gullak first | Empty state |

**Suggested:** add the date to the read-back to match the High Stakes Gate spec (amount + date + destination): "₹800 aaj Emergency Gullak mein, aapke apne SBI khaate se. Sahi hai?"

### 13.3 Other flows

| Flow | Hinglish | English |
|---|---|---|
| Protect | Bima hai / Bima nahi · Sarkari site · Hum koi policy nahi bechte… · Theek hai | Covered / No cover · Official site · We don't sell policies… · Okay |
| Protect done | Suraksha check ho gaya (+50, badge Suraksha Kavach) | Protection checked |
| Cheaper option | RBI ki lending app list dekhein · SACHET par shikayat karein · SASTA VIKALP: Bank overdraft / chhota loan · Referral · sirf RBI-registered lender · Samajh gaya | Check RBI's lending app list · Complain on SACHET · CHEAPER OPTION: Bank overdraft / small loan · Referral · RBI-registered lenders only · Got it |
| Cheaper done | Lender check ho gaya | Lender checked |
| 5-day plan | Din 1…5 ₹300 · 5 din roz ₹200 kam kharch — ₹500 ki jagah ₹300. · Plan shuru karo | Day 1…5 · 5 days, ₹200 less each day — ₹300 instead of ₹500. · Start plan |
| Plan done | Plan shuru! | Plan started! |
| Help | Callback maangein | Request a callback |

### 13.4 Revoke confirmation (code, `family/page.tsx`)

| Hinglish | English | Element |
|---|---|---|
| Consent band karein? | Revoke consent? | Sheet title |
| Recorded sandbox (replay) — Anumati ko kuch nahi bheja jaata | Recorded sandbox (replay) — nothing is sent to Anumati | Chip (demo/replay households only) |
| DhanYukti ab yeh data istemaal nahi karega aur apni copy mita dega. Consent poori tarah band karne ke liye Anumati app mein bhi band karein. | DhanYukti stops using this data now and deletes its copy. To end the consent itself, close it in the Anumati app. | Body |
| Parivaar ki permission ki zaroorat nahi — yeh aapka haq hai. | No household vote needed — this is your right. | Note |
| Haan, band karo | Yes, revoke | Danger button |
| Anumati kholein (sandbox) | Open Anumati (sandbox) | Link button → https://uat-web.anumati.co.in (new tab) |
| ✓ DhanYukti ne yeh data istemaal karna band kiya · ✓ DhanYukti dobara fetch nahi karega · ✓ Mita diya: {item} | ✓ DhanYukti stopped using this data · ✓ DhanYukti won't fetch it again · ✓ Deleted: {item} | Receipt rows |
| Consent poori tarah band karne ke liye Anumati app mein bhi band karein. | To end the consent itself, close it in the Anumati app. | Reminder after revoke |
| Theek hai | Done | Close |

**Suggested:** add a secondary "Nahi, rehne do" (No, keep it) button so the sheet is not the only way out besides swipe-down.

---

## 14. Game

### 14.1 Points (code, `game/service.py`)

| Event | Points | Hinglish celebration | English |
|---|---|---|---|
| `setup` (onboarding done) | 100 | Pehla Kadam! | First Step! |
| `checkin` (once a day) | 5 | Aaj ka hisaab dekha! | Checked today's account! |
| `task_done` | 25 | Message bhej diya! Shabaash / Plan shuru! / Lender check ho gaya | … |
| `gullak_deposit` | 50 | Gullak mein paisa gaya! | Money is in the Gullak! |
| `protection_check` | 50 | Suraksha check ho gaya | Protection checked |
| `lesson` | 15 | Naya sabak seekha! | Lesson learned! |
| `correction` | 10 | **(new)** Shukriya! Hisaab theek kar diya | Thanks! We fixed the record |

Paisa Points have **no cash value**. Copy must never say "earn", "cashback" or "reward money".

### 14.2 Levels

| # | Hinglish | English | From |
|---|---|---|---|
| 1 | Beej | Seed | 0 |
| 2 | Ankur | Sprout | 200 |
| 3 | Paudha | Sapling | 500 |
| 4 | Ped | Tree | 1,000 |
| 5 | Bargad | Banyan | 2,000 |

Hero copy (code): "Level {n}" · "{n} points aur — phir {next}" / "{n} more to {next}" · "Level aadaton se badhta hai, paison se nahi" / "Levels reflect habits, never how much money you have".

### 14.3 Badges

| id | Name (hi / en) | Description (hi / en) | Unlocks on |
|---|---|---|---|
| `pehla_kadam` | Pehla Kadam / First Step | Pehla kaam poora kiya / Completed your first task | setup, first task, deposit or protection check |
| `karz_mukti` | Karz Mukti / Debt Free | Mehenga app loan chhoda / Stepped away from a costly app loan | task_done on a lender card |
| `suraksha_kavach` | Suraksha Kavach / Protection Shield | Parivaar ka bima check kiya / Checked the family's insurance | protection_check |
| `bachav_30` | 30 Din ka Bachav / 30-Day Cushion | 30 din ka zaroori kharch Emergency Gullak mein / 30 days of essentials in the emergency jar | Emergency jar ≥ 30 × essentials |
| `parivaar_champion` | Parivaar Champion / Family Champion | Parivaar ne milkar 75 aadatein poori ki / The family completed 75 habits together | Family habits ≥ 75 |

Unlock toast (code): "Naya badge!" / "New badge!".

**Suggested:** "Karz Mukti" (debt-free) over-promises after one card. Use the description "Mehenga app loan se ek kadam door" ("One step away from a costly app loan"), or rename the badge "Karz Kavach".

### 14.4 Streak and shield

| Hinglish | English | Where |
|---|---|---|
| {n} din ka streak | {n} day streak | Inaam card (code) |
| Aaj ka hisaab dekha ✓ (+5) | I checked today ✓ (+5) | Check-in button (code) |
| **(new)** Streak shield ne aapka streak bachaya 🛡️ — kal ka din maaf. | Your streak shield saved your streak 🛡️ — yesterday is forgiven. | Toast when a shield is used (1-day gap) |
| **(new)** 7 din poore! Ek naya streak shield mila (max 3). | 7 days done! You got a new streak shield (max 3). | Toast every 7th day |
| **(new)** Koi baat nahi, aaj se naya streak shuru. | No worries — a new streak starts today. | Streak reset. No shame |

Other copy (code): "Parivaar leaderboard · Sirf aadatein" / "Family leaderboard · Habits only" · "{n} kaam" / "{n} habits" · "Asli bachat (Value Ledger)" · "Points aur asli paisa alag rakhe jaate hain" / "Points and real money are tracked separately".

---

## 15. 60-second micro-lessons

At TTS rate 0.95, about 140–150 words is roughly 60 s. One idea per lesson, one story, rupees only, and one action at the end. Tapping a lesson awards +15 ("Naya sabak seekha!").

### L1 — App loan ka asli kharcha (Hinglish; code has a shorter version)

**Card label (code):** Ramesh ne app se ₹3,000 liye… / Ramesh borrowed ₹3,000 from an app…

**Suggested script (replaces the code version, which says "sau pratishat se bhi zyada"; that breaks rule 4):**

> Ramesh ji ko mahine ke aakhir mein teen hazaar rupaye chahiye the. Phone par ek app ne do minute mein paisa de diya. Pandrah din baad unhe teen hazaar teen sau chaalis rupaye lautane pade. Yaani teen sau chaalis rupaye sirf pandrah din ka kharcha. Agar aise hi saal bhar udhaar chalta rahe, toh teen hazaar par aath hazaar rupaye se zyada sirf byaaj mein chale jaate. Bank ka overdraft ya chhota loan isse kaafi sasta padta hai. Loan lene se pehle teen baatein dekhein. Ek: kya app RBI ki list mein hai? Do: kul kitne rupaye lautane honge — sirf EMI nahi, poora jod. Teen: kya app aapke contacts aur photos maang raha hai? Agar haan, toh ruk jaayein. Aur agar koi app dhamki de, toh sachet dot rbi dot org dot in par shikayat karein. Yaad rakhein: jaldi ka paisa, sabse mehenga paisa.

> *EN:* Ramesh needed three thousand rupees at month-end. An app gave it in two minutes. Fifteen days later he repaid three thousand three hundred and forty. That's three hundred and forty rupees for just fifteen days. Borrow like that all year and more than eight thousand rupees goes to interest on three thousand. A bank overdraft or small loan is much cheaper. Before borrowing, check three things. One: is the app on RBI's list? Two: how much will you repay in total — not just the instalment. Three: is the app asking for your contacts and photos? If yes, stop. If an app threatens you, complain at sachet.rbi.org.in. Remember: fast money is the most expensive money.

(₹340 × 365 ÷ 15 ≈ ₹8,270. This comes from the E04 inputs, not from copy maths. Engines/copy: confirm before recording.)

### L2 — Emergency Gullak: bachav ke din

> Farida ji ki silai ki kamai kabhi zyada, kabhi kam. Ek mahine bachche ko bukhaar hua, teen din kaam band raha, aur ghar ka kharch chalta raha. Isliye ek alag Emergency Gullak zaroori hai. Pehle apna roz ka zaroori kharch jaaniye — khaana, kiraya, bijli, EMI. Maan lijiye roz ka zaroori kharch paanch sau rupaye hai. Toh tees din ka bachav banane ke liye pandrah hazaar rupaye chahiye. Ek saath nahi — roz pachaas rupaye se shuru kariye. Kamai aate hi pehle Gullak mein daaliye, phir baaki kharch. Yeh paisa sirf musibat ke liye hai — tyohaar ya shopping ke liye nahi. Jitne din ka bachav, utni kam chinta, aur utna kam udhaar. DhanYukti aapko roz batayega ki aap kitne din surakshit hain.

> *EN:* Farida's tailoring income goes up and down. One month her child had a fever, work stopped for three days, and the household still had to run. That's why a separate emergency Gullak matters. First, know your daily essentials — food, rent, electricity, EMI. Say that's five hundred rupees a day. Thirty days of safety means fifteen thousand rupees. Not all at once — start with fifty rupees a day. When income arrives, put money in the Gullak first, then spend. This money is only for emergencies — not festivals or shopping. The more days of safety, the less worry and the less borrowing. DhanYukti will show you every day how many days you're covered.

### L3 — PMJJBY: ₹436 mein ₹2 lakh ka jeevan bima

> ⚠️ Re-check ₹436 (PMJJBY), ₹20 (PMSBY), the age limits and the renewal window on jansuraksha.gov.in before the demo.

> Ghar ki kamai ek insaan par tiki ho, toh unka jeevan bima sabse zaroori suraksha hai. Sarkar ki Pradhan Mantri Jeevan Jyoti Bima Yojana — PMJJBY — mein saal ke chaar sau chhattis rupaye mein do lakh rupaye ka jeevan bima milta hai. Yaani mahine ke lagbhag chhattis rupaye. Atthaarah se pachaas saal ki umar wale, jinka bank khata hai, jud sakte hain. Premium saal mein ek baar khate se apne aap katta hai. Saath mein PMSBY — sirf bees rupaye saal mein do lakh ka durghatna bima. Bank ya post office mein ek form bhariye, aur nominee ka naam zaroor likhiye. Premium katne ki tareekh par khate mein paisa rakhiye, warna bima ruk sakta hai. DhanYukti koi policy nahi bechta — hum sirf batate hain. Form aapka bank bharega.

> *EN:* When a home depends on one person's income, their life cover is the most important protection. The government's PMJJBY gives two lakh rupees of life cover for four hundred and thirty-six rupees a year — about thirty-six rupees a month. Anyone aged eighteen to fifty with a bank account can join. The premium is auto-debited once a year. Add PMSBY — just twenty rupees a year for two lakh of accident cover. Fill one form at your bank or post office, and always name a nominee. Keep money in the account on the premium date, or the cover can lapse. DhanYukti sells no policy — we only explain. Your bank does the enrolment.

---

## 16. Voice and IVR scripts (new)

Voice rules: warm, slow (TTS rate 0.9–0.95), one question per turn, confirm by repeating. **Never speak OTPs.** Speak balances or amounts only after the caller confirms they are the account holder, and never in assisted/helper mode.

### 16.1 Onboarding by voice / IVR

| Turn | Hinglish (spoken) | English | Input |
|---|---|---|---|
| 1 | Namaste! Main DhanYukti hoon, aapka paisa saathi. Hindi ke liye 1 dabayein. English ke liye 2. | Hello! I'm DhanYukti, your money companion. Press 1 for Hindi, 2 for English. | 1/2 |
| 2 | Aapka mobile number yahi hai na? Haan ke liye 1, badalne ke liye 2. | Is this your mobile number? 1 for yes, 2 to change. | 1/2 |
| 3 | Ek OTP aapke phone par aaya hai. Usse kisi ko mat bataiye — bank mitra ko bhi nahi. Ab OTP dabaiye. | An OTP has been sent to your phone. Don't share it with anyone — not even a bank mitra. Enter it now. | 6 digits |
| 4 | Ghar mein kitne log rehte hain? Number dabaiye. | How many people live at home? Enter a number. | digit |
| 5 | Kitne log kamaate hain? | How many people earn? | digit |
| 6 | Kya koi loan chal raha hai? Haan ke liye 1, nahi ke liye 2. | Any running loans? 1 yes, 2 no. | 1/2 |
| 7 | Ab do permission. Pehli: parivaar ki jaankari, taaki hum sahi bhasha mein samjhayein. Aap kabhi bhi mita sakte hain. Haan ke liye 1. | Two permissions now. First: your family details, so we explain in the right language. Delete anytime. Press 1 for yes. | 1 |
| 8 | Doosri: Anumati, jo RBI se licensed hai, aapke bank ka 6 mahine ka len-den humein dikhayega — taaki mahine ke aakhir mein paise kam na padein. 3 mahine ke liye, kabhi bhi band kar sakte hain. Hum aapko ek SMS link bhej rahe hain — wahan manzoor karein. | Second: Anumati, licensed by RBI, will share 6 months of bank transactions — so you don't run short at month-end. For 3 months, stop anytime. We're sending an SMS link — approve it there. | SMS |
| 9 | Shukriya! Aapka hisaab ban raha hai. Do minute mein hum aapko aaj ka kaam batayenge. | Thank you! We're preparing your account. In two minutes we'll tell you today's task. | — |

### 16.2 Daily loop (IVR call-back or in-app auto-play in Aasaan)

| Turn | Hinglish | English |
|---|---|---|
| Greet | Namaste {name} ji. Aaj ka kaam taiyaar hai. Sunne ke liye 1 dabayein. | Hello {name}. Today's task is ready. Press 1 to hear it. |
| Task | {title}. {task}. | {title}. {task}. |
| Menu | Kyon — yeh jaanne ke liye 2. Karne ke liye 3. Baad mein ke liye 4. Madad ke liye 0. | Press 2 to hear why. 3 to do it. 4 for later. 0 for help. |
| Why (2) | Humne dekha: {rule}. Yeh {pakka / andaaza} hai. Yeh salah nahi, jaankari hai. | We saw: {rule}. This is {confirmed / an estimate}. This is guidance, not advice. |
| Do (3), message | Hum school ke liye message aapke WhatsApp par bhej rahe hain. Aap padh kar khud bhejiye. | We're sending the school message to your WhatsApp. Read it and send it yourself. |
| Do (3), money | {amt} {jar} mein, aapke apne khaate se. Sahi hai? Haan ke liye 1, badalne ke liye 2. | {amt} into {jar}, from your own account. Correct? 1 yes, 2 change. |
| Done | Shabaash! Aapko {n} Paisa Points mile. Aapka streak {s} din ka ho gaya. | Well done! You got {n} Paisa Points. Your streak is now {s} days. |
| Later (4) | Theek hai, kal yaad dilayenge. | Okay, we'll remind you tomorrow. |
| Help (0) | Aapko bank mitra se jod rahe hain. Woh aapka OTP ya balance kabhi nahi poochhenge. | Connecting you to a bank mitra. They will never ask for your OTP or balance. |

### 16.3 Poocho (code, `ask/page.tsx`)

| Hinglish | English | Element |
|---|---|---|
| Poocho — Apni bhasha mein kuch bhi poochhein | Ask anything in your language | Header |
| Namaste {name}! Bolkar poochhiye | Hi {name}! Tap and speak | Empty state |
| Mic dabaiye aur Hindi mein bolein | Tap the mic and speak | Empty sub |
| Sun rahe hain… | Listening… | Listening |
| Yahan likhein… | Type here… | Input |
| Jaankari · salah nahi | Jaankari · not advice | Answer tag |
| 28 ko paise kyon kam padenge? · Agar salary 10 din late ho? · Kya QuickRupee app safe hai? · Gullak mein kitna daalun? · Bima ke baare mein batao | Why will I be short on the 28th? · What if salary is 10 days late? · Is the QuickRupee app safe? · How much should I put in Gullak? · Tell me about insurance | Chips. **Suggested:** make the chips household-aware; "28 ko" and "QuickRupee" only fit A |

**Suggested:** the Poocho "loan" answer (code, `ask.py`) reads "~276%/saal". Replace it with "₹3,000 par 15 din mein ₹340".

---

## 17. Error, empty, offline and compliance

### 17.1 Error / empty / offline

| State | Hinglish | English | Where |
|---|---|---|---|
| Network down (no data) | 📡 Network kamzor hai · API se jud nahi paaye. Thodi der mein dobara koshish karein. · Dobara | Network is weak · Couldn't reach the API. Please try again. · Retry | Home (code). **Suggested:** drop "API": "Abhi jud nahi paaye. Thodi der mein dobara koshish karein." |
| Consent error | {err} — API chal raha hai? | {err} — Is the API running? | Onboarding passport (code, dev-facing). **Suggested:** "Anumati se abhi jud nahi paaye. Dobara koshish karein ya Madad chahiye? dabayein." |
| Poocho failed | Maaf kijiye, abhi jawab nahi mil paaya. | Sorry, couldn't get an answer right now. | (code) |
| No speech API | Is phone par awaaz nahi chalti — neeche likh kar poochhein. | Voice isn't supported here — please type below. | (code) |
| No jar | Pehle ek Gullak banayein | Create a Gullak first | (code) |
| No AA consent | + Bank jodein (Anumati AA) | + Link bank (Anumati AA) | Parivaar (code) |
| No NBA **(new)** | Sab theek hai 🌿 Aaj koi zaroori kaam nahi. Chaahein toh Gullak mein ₹50 daalein. | All good 🌿 Nothing urgent today. Want to add ₹50 to a Gullak? | Home |
| No app loans | Pichhle 3 mahine mein koi app loan nahi dikha. Zaroorat ho to pehle bank se poochhein. | No app loans in the last 3 months. If you need credit, ask your bank first. | Poocho (code) |
| Everyone covered | Kamane walon ka jeevan bima hai. Saal mein ek baar nominee aur premium check kar lein. | Earners have life cover. Check nominee and premium once a year. | Poocho (code) |
| Offline **(new)** | Aap offline hain. Internet aate hi naya hisaab dikhayenge. Aapki suraksha ke liye paise ki jaankari phone mein save nahi hoti. | You're offline. We'll show your latest account when you're back online. For your safety, money data isn't stored on the phone. | Banner (the SW never caches `/api`) |
| Consent expired **(new)** | Bank ki permission khatam ho gayi. Naya hisaab dekhne ke liye dobara jodein. | Bank permission has expired. Reconnect to see a fresh picture. | Home banner + Parivaar |
| Consent revoked **(new)** | Bank judaa nahi hai. Gullak aur Poocho chalte rahenge. | No bank linked. Gullak and Poocho still work. | Home after revoke |
| Stale data **(new)** | Yeh hisaab {date} ka hai. | This picture is from {date}. | Under TopBar if the fetch is older than 35 days |

### 17.2 Compliance labels

| Label | Hinglish | English | Rule |
|---|---|---|---|
| **Jaankari** | Jaankari · salah nahi / Yeh salah nahi, jaankari hai | Information · not advice / This is guidance, not advice | Default tag on every output (Rules §8) |
| **Referral** | Referral · Registered salahkaar ke paas bhejenge | Referral · We route you to a registered adviser | Investment → SEBI RIA; insurance sale → IRDAI intermediary; credit → RBI-registered lender only |
| Referral sub-types | SEBI RIA se salah lein · Licensed bima intermediary · Sirf RBI-registered lender | Take advice from a SEBI RIA · Licensed insurance intermediary · RBI-registered lenders only | Shown on the referral hand-off |
| **Incentive disclosure (new)** | DhanYukti ko is referral se ₹{x} milega. Isse humari ranking nahi badalti. | DhanYukti earns ₹{x} from this referral. It doesn't change our ranking. | Inline next to every referral CTA, **before** hand-off (Recommendation Firewall, Security.md) |
| Disclosure when x = 0 **(new)** | DhanYukti ko is se koi paisa nahi milta. | DhanYukti earns nothing from this. | Same place |
| **Scenario only** | 🔮 SIRF ANDAAZA — asli plan nahi badla | 🔮 SCENARIO ONLY — real plan unchanged | Every what-if (Rules §6) |
| No money movement | DhanYukti khud paisa nahi bhejta — aap hi confirm karte hain. | DhanYukti never moves money by itself — you confirm every step. | Every action sheet |
| We don't sell | Hum koi policy nahi bechte. Enrolment bank ya licensed intermediary se hoga. | We don't sell policies. Enrolment is via your bank or a licensed intermediary. | Protect sheet |
| No fund names | Hum koi fund nahi batate — sirf jaankari. | We never name a fund — information only. | Grow card |
| Official links | Sarkari site | Official site | Government URLs |
| AA identity | Anumati (RBI-licensed Account Aggregator) | same | First mention per screen |
| Sandbox | SANDBOX SIMULATION · replay mode / Replay (recorded sandbox) / Demo fixture | same | Anumati sim, DataSource, connect step |
| Points ≠ money | Points aur asli paisa alag rakhe jaate hain | Points and real money are tracked separately | Inaam |
| Mode ≠ numbers | Mode badalne se paison ka hisaab nahi badalta | Switching mode never changes a financial result | Parivaar |

---

## 18. Suggested copy changes — summary

| # | Where | Now | Suggested | Why |
|---|---|---|---|---|
| 1 | E14 lender title, E04 verdict, `ask.py` loan answer | "saal ka ~276% kharcha" | "₹3,000 par 15 din mein ₹340 byaaj" | Rule 4: rupees, not % |
| 2 | E14 lender rule | "36% se zyada" | "₹100 par saal ka ₹36 se zyada" | Rule 4 |
| 3 | Rewards L1 lesson | "sau pratishat se bhi zyada" | "₹8,000 se zyada sirf byaaj mein" | Rule 4 |
| 4 | Level 3 English | Plant / Sapling | Sapling | Consistency |
| 5 | E06 `if_not` | "koi sahara nahi rahega" | "₹2 lakh ka sahara rahega — sirf ₹436 saal mein" | No fear |
| 6 | E13 grow title | "bekaar pade hain" | "khaali baithe hain" | No judgement |
| 7 | DPDP copy | "sahi salah ke liye" | "sahi jaankari ke liye" | Not advice |
| 8 | Value Ledger tag | PAKKA | SABOOT | Clashes with the confidence label |
| 9 | Deficit second_step (hi) | "…bhi ₹X kam" | "…bhi ₹X suraksha rekha se kam" | Missing the "floor" meaning |
| 10 | River label | "Safety floor" | "Suraksha rekha" (hi) | Hinglish-first |
| 11 | Home error | "API se jud nahi paaye" | "Abhi jud nahi paaye" | No jargon |
| 12 | Passport error | "API chal raha hai?" | "Anumati se abhi jud nahi paaye…" | No jargon |
| 13 | Gullak read-back | no date | add "aaj" + bank name | High Stakes Gate = amount + date + destination |
| 14 | Karz Mukti badge | "Mehenga app loan chhoda" | "Mehenga app loan se ek kadam door" | Don't over-promise |
| 15 | Gig households | "Salary ke din…", "Salary late ho" | "Kamai aate hi…", "Kamai late ho" | Fits Farida |
| 16 | Poocho chips | Household A only | Per-household chips | Relevance |
| 17 | `ask.py` bima answer | hard-coded ₹436 / ₹20 | read E06 constants | One source of truth (re-check before demo) |
| 18 | HelpLink | 1800-000-000 | real number or "Callback maangein" | Placeholder |
