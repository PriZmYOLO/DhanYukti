# Design system — "Haldi & Neel"

Rooted in Indian household colour (turmeric, indigo, clay) with the colour-block cards and soft gradients of our references. This spec describes **what is built** in `web/src` and marks anything not yet built as **Spec** (to build) or **Fix** (built, but breaks a rule). Copy lives in [Content.md](Content.md). Owner: Lohit (screens); tester: Yashraj.

**Design test for every screen:** Sunita can finish it in < 60 s by voice or taps, without reading an English word.

---

## 1. Design principles (the 10 low-literacy rules)

From [Rules.md](Rules.md) → how each shows up in the UI.

| # | Rule | What it means on screen | Where it's built |
|---|---|---|---|
| 1 | **Voice first** | Every screen has a 🔊 `SpeakBtn`; primary flows work by voice (Poocho mic, read-back on confirm). | NBA cards, Kyon?, onboarding titles, Safe-to-Spend, Gullak read-back, Poocho answers. **Fix:** no screen-level speaker on Lakshya, Inaam, Parivaar. |
| 2 | **One screen, one decision** | One primary (haldi/ink/clay) button per view. Secondary actions are ghost/white. | Onboarding: one "Aage" per step. Home card: `Karo` is the only haldi button. |
| 3 | **Colour + icon + word** | Status never colour alone: `StatusPill` = colour + lucide icon + word. Cash river legend has dot + word. | `StatusPill`, `ConfTag` (dot + word), river legend. |
| 4 | **Rupees, not percentages. Days, not ratios.** | "₹340 gaya byaaj mein", "12 din ka bachav", "₹14/₹100". | Metrics, river, WhatIf. **Fix:** Lender Shield title + lesson still show "%". See Content.md §8. |
| 5 | **Thumb zone** | Primary buttons in bottom third; targets ≥ 48×48 px; bottom tab bar; no hamburger. | `Btn` is `min-h-13` (52 px). **Fix:** several targets < 48 px — see §10. |
| 6 | **Cheap phones** | First load < 1.5 MB, skeletons not spinners, animations < 200 KB, inline SVG art (no images). | `Skeleton` shimmer; all art is inline SVG; one font pair. |
| 7 | **Three literacy modes** | Aasaan / Saathi / Pro change *how much* is shown, never the numbers. | `mode` in store; see §9. |
| 8 | **Assisted mode** | Helper sees step status only — never OTPs, balances or advice. | Copy on login step. **Spec:** helper view not built. |
| 9 | **"Madad chahiye?" on every screen** | `HelpLink` at the bottom of every scrolling screen. | Home, Lakshya, Inaam, Parivaar. **Fix:** missing on Poocho, Onboarding, Anumati. |
| 10 | **No shame, no fear** | Warm verbs, "chalo" framing, `If you wait` instead of "warning". Red is for *act now*, not for blame. | All copy — see Content.md §1. |

---

## 2. Colour

### 2.1 Palette tokens (source: `web/src/app/globals.css` `@theme`)

The first 13 rows are the canonical "Haldi & Neel" tokens — **do not change hex values**. The last two are implementation additions.

| Token | Hex | Use | Pair it with |
|---|---|---|---|
| `ink` (neel) | `#17153B` | Primary text, hero cards (red NBA, WhatIf, Rewards hero, AA consent card), tab bar, ink buttons | white / `haldi` text |
| `ink-2` | `#2E2A6B` | Secondary indigo surfaces; EMI marker; Donut "ghar" slice; man avatar shirt | white |
| `haldi` | `#F7C548` | Primary CTA ("Karo"), highlights, active tab pill, slider thumb, Safe-to-Spend tile | `ink` text only |
| `haldi-soft` | `#FFF1C2` | Warm card background: Kyon? rule block, river hint, plan message | `ink` |
| `clay` | `#D96C3F` | Gullak jars, savings, Lakshya hero, clay button, active Poocho mic | white (large text only), `ink` |
| `clay-soft` | `#F9D9C7` | Jar card background | `ink` |
| `rose` | `#F7C6D6` | Resilience / family cards (Resilience Days, Mission, DPDP card) | `ink` |
| `mint` / `leaf` | `#BFE8D2` / `#1F8A5B` | Safe / green status; protection tile; Value Ledger | `ink` on mint; white on leaf |
| `amber` | `#E89B1C` | Watch status; "below floor" river segment | `ink` (never white text) |
| `danger` / `danger-soft` | `#E0473E` / `#FDE0DC` | Act-now status, river below zero, danger button | white on danger; `ink` on danger-soft |
| `lav` | `#ECE7FB` | Page gradient top; neutral chips; selected Donut row | `ink` |
| `cream` | `#FBF7F0` | Page background, sheets, celebration card | `ink` |
| `muted` | `#6B6887` | Secondary text, English sub-line | on cream/white only |
| `rose-deep` *(added)* | `#D6457A` | Mission label, DPDP tag text, woman avatar sari | on white only |
| `amber-soft` *(added)* | `#FDEBC8` | "Dhyaan dein" pill background, alert scene | `#9A5F00` text |

Non-token colours in code (keep, but don't spread): card-amber `#FBE3A6` (amber NBA card), WhatsApp green `#25D366`, bubble `#E7F8E9`, Anumati sim grey `#F4F6FA`, river-dark red text `#FF8A80` / `#FFB4AB`, desktop backdrop `#E9E5F5`.

Page background: `.app-bg` = `linear-gradient(180deg, #ECE7FB 0%, #F6F1FB 22%, #FBF7F0 55%)`.

### 2.2 Status colour system

| Status | Word (hi / en) | Icon (lucide) | Pill | Card skin (NBA) | River |
|---|---|---|---|---|---|
| green | Surakshit / Safe | `CircleCheck` | `bg-mint text-leaf` | `bg-mint` + `bg-leaf` tier pill + 🟢 | line `#1F8A5B` above floor |
| amber | Dhyaan dein / Watch | `CircleAlert` | `bg-amber-soft text-[#9a5f00]` | `bg-[#FBE3A6]` + `bg-amber` pill + 🟠 | line `#E89B1C` between floor and ₹0 |
| red | Abhi karein / Act now | `OctagonAlert` | `bg-danger-soft text-danger` | `bg-ink text-white` + `bg-danger` pill + 🔴 | line `#E0473E` below ₹0, pulsing dip dot |

Red NBA cards are **ink**, not red — urgency without alarm (Rule 10). Red is reserved for the pill, the river dip and the "Agar nahi kiya" line.

### 2.3 Contrast (WCAG 2.1, measured)

| Pair | Ratio | Verdict | Action |
|---|---|---|---|
| ink on cream | 16.3 | AAA | — |
| ink on haldi | 10.8 | AAA | Always use ink on haldi, never white |
| white on ink / haldi on ink | 17.4 / 10.8 | AAA | — |
| muted on cream / white | 5.0 / 5.3 | AA | OK for 12 px+ |
| muted on clay-soft | 4.0 | Fails AA small | **Fix:** jar card sub-text (`₹1,200 / ₹5,000`) → `ink/70` |
| leaf on mint (green pill) | 3.2 | Fails AA small | **Fix:** pill text → `#146B45` (≈4.6) |
| `#9A5F00` on amber-soft | 4.5 | AA (borderline) | — |
| danger on danger-soft (red pill) | 3.3 | Fails AA small | **Fix:** pill text → `#B3261E` |
| white on amber (amber NBA tier pill) | 2.3 | Fails | **Fix:** ink text on amber |
| white on clay (clay `Btn`, 15 px bold) | 3.4 | Fails AA small | **Fix:** ink text, or darken to `#B9552C` (≈4.6) for buttons only |
| white on danger (danger `Btn`) | 4.1 | Fails AA small | Acceptable at 15 px bold only with icon; prefer `#C9362D` |
| white on `#25D366` (WhatsApp button) | 2.0 | Fails | **Fix:** use `#128C7E` background or ink text |
| rose-deep on rose (Mission label) | 2.8 | Fails | **Fix:** `ink` label |
| clay on cream (splash headline 44 px) | 3.2 | AA large | OK because ≥ 24 px |

---

## 3. Typography

Fonts load in `app/layout.tsx` via `next/font`: **Plus Jakarta Sans** (`--font-jakarta`, 400–800) and **Mukta** (`--font-mukta`, Devanagari + Latin, 400–800). `font-sans` = Jakarta → Mukta → system; `font-deva` = Mukta first (tab labels, language names, "धनयुक्ति").

| Role | Size / weight | Where | Notes |
|---|---|---|---|
| Hero number | 52–64 px / 800, `.num` | Resilience Days (Home 52, reveal 64) | `.num` = tabular figures, −0.02em |
| Display | 44 px / 800 | Splash headline, Lakshya total | Line height 1.02–1.05 |
| Big number | 34–40 px / 800 | Rewards points, level name, WhatIf results (30) | |
| Screen title | 30 px / 800 | Onboarding `Title` | Always paired with `SpeakBtn` |
| Page title | 24 px / 800 | `TopBar title`, Poocho | |
| Card title | 23 px / 800 | NBA card title | `Bi` with sub-line |
| Metric value | 22–28 px / 800 | Health tiles (22), Safe-to-Spend (28) | |
| Section title | 19 px / 800 | `SectionTitle` | Bilingual via `Bi` |
| Sub-title | 17 px / 800 | River card, consent cards, Kyon? rule (17/600) | |
| Body / button | 15 px / 600–700 | `Btn`, task text, chat bubbles | Minimum for any sentence Sunita must act on |
| Secondary | 13–14 px | NBA body, hints | |
| Sub-line (other language) | 12 px, 60% opacity | `Bi` sub | Hidden in Pro |
| Label / pill | 11 px / 700–800, uppercase tracking for eyebrow labels | `StatusPill small`, `ConfTag`, "AAJ KA KAAM" | Only when it repeats an icon/colour |
| Meta | 9–10 px | AA/source tags, handles, sandbox labels | **Fix:** 26 uses of 9–10 px. Rule: nothing a user must read below 12 px; 11 px only for redundant labels; 9–10 px only for audit/debug text (consent handle, engine id). |

Language rules: romanised Hinglish primary, English beneath in `muted` (via `Bi`); tab labels and language names in Devanagari. Details in Content.md §2.

---

## 4. Spacing, radius, shadow, layout tokens

| Token | Value | Use |
|---|---|---|
| Page gutter | 20 px (`px-5` / `mx-5`) | Every screen |
| Section rhythm | 28 px above `SectionTitle` (`mt-7`), 12 px below | Home, Lakshya, Inaam, Parivaar |
| Card padding | 16 px (`p-4`) standard; 20 px (`p-5`) hero cards | |
| Grid gap | 12 px (`gap-3`); 8 px for chip grids | |
| Tab-bar clearance | 112 px (`pb-28`) on `<main>` | Hidden on `/onboarding`, `/anumati` |
| Radius — hero / section | 32 px | NBA card, River card, WhatIf, Mission, heroes, sheets (top) |
| Radius — card | 28 px | Tiles, jars, consent cards, skeleton |
| Radius — inner card | 24 px | Rows inside sheets, language rows, badges |
| Radius — button | 20 px (`Btn`); 18 px (NBA buttons); 16 px (consent yes/no) | |
| Radius — chip | 999 px | Pills, tab pill, LangToggle, chat chips |
| `shadow-soft` | `0 10px 30px -12px rgb(23 21 59 / .18)` | White cards on cream |
| `shadow-lift` | `0 18px 40px -16px rgb(23 21 59 / .35)` | NBA cards, tab bar, active mic, celebration |
| Borders | None, except `border-white` on translucent cards and dashed "add" states | Soft shadows, no hard borders |
| Viewport | 360–430 px mobile-first | |
| Desktop demo frame | 400 × 860 px, 10 px ink border, 52 px radius, fake status bar; left pitch panel ≥ `lg` | `PhoneShell`; `transform: translateZ(0)` so fixed sheets stay inside |

---

## 5. Iconography and illustration

### 5.1 Icons
- **lucide-react**, stroke 2.2–2.6, sizes 14 (pill), 18–22 (UI), 28 (centre mic tab), 52 (Poocho hero mic).
- Emoji only as *friendly redundancy* next to a word (🔴 tier dot, 🔥 streak, 🏥 hospital slider, work-type chips, Donut legend). Never the only carrier of meaning.

| Concept | Icon |
|---|---|
| Tabs | `House`, `Target`, `Mic`, `Trophy`, `Users` |
| Listen | `Volume2` / `VolumeX` while speaking |
| Status | `CircleCheck` / `CircleAlert` / `OctagonAlert` |
| Consent rows | `Eye` (kya dekhenge) · `Target` (kyon) · `Hourglass` (kab tak) · `ShieldOff` (revoke) |
| Kyon? blocks | `Eye` (kya dekha) · `Brain` (kya socha) · `Gauge` (kitna pakka) · `BookOpen` (jaankari/referral) |
| Health tiles | `Wallet` · `CalendarHeart` · `Landmark` · `ShieldCheck` |
| Help | `LifeBuoy` |
| Streak | `Flame` (clay stroke, haldi fill) |

### 5.2 Illustration set (`components/art/*`, inline SVG, `aria-hidden`)

| Component | Props | Variants | Use when | Don't |
|---|---|---|---|---|
| **Gullak** | `fill 0..1`, `size`, `tone` | `clay` (emergency), `haldi` (school, education), `rose` (festival) | Any savings goal: jar cards, Gullak sheet, onboarding step 8, Lakshya hero | Use for debt or bank balance — Gullak is *only* user goals |
| **Avatar** | `kind`, `size`, `ring` | `woman` (bindi, earrings), `man` (moustache), `girl` (plaits), `boy`, `elder_woman` (glasses, dupatta), `elder_man` (glasses, grey moustache) | TopBar, member lists, leaderboard, Mission stack (32 px, ringed) | Show photos; infer religion/caste from avatar (users pick) |
| **Scene** | `kind`, `size` | `school`, `shield`, `loan`, `jar`, `bolt`, `heart`, `grow`, `alert`, `phone`, `lock`, `bank` | NBA card art (70 px), reveal "Pehla kaam" (56 px), connect step (`bank`, 96 px) | Mix two scenes in one card |
| **LevelTree** | `level 1–5`, `size` | Beej (seed) → Ankur → Paudha → Ped (with fruit) → Bargad (aerial roots) | Inaam hero only | Tie to money amount (levels = habits) |
| **HomeScene** | `size` | House with toran, flickering diya, gullak with falling ₹ coins | Onboarding splash only | Reuse elsewhere — it's the "welcome" moment |

**NBA → Scene mapping (E14):** deficit on a fee → `school`; other deficit → `alert`; Lender Shield → `loan`; protection → `shield`; penalties → `bolt`; resilience → `jar`; idle surplus → `grow`. `heart`, `phone`, `lock` are reserved (health cover, UPI AutoPay, consent). **Fix:** `API_CONTRACT.md` lists only 8 icon kinds; add `phone`, `lock`, `bank`.

---

## 6. Component library

| Component | File | Anatomy | Rules |
|---|---|---|---|
| **PhoneShell** | `components/PhoneShell.tsx` | Frame → status bar (desktop) → scrolling `<main>` → `TabBar` → `Celebration` | Hides tab bar on onboarding + Anumati. Only one shell. |
| **TabBar** | `components/TabBar.tsx` | Ink pill bar, 5 tabs; centre Poocho is a raised 64 px haldi circle (clay when active) | Devanagari labels (`घर लक्ष्य पूछो इनाम परिवार`), English when lang = en. Active = haldi pill + haldi label. |
| **TopBar / LangToggle** | `components/TopBar.tsx` | Avatar 50 → greeting + name (or page title) → streak chip → हिं/EN toggle | Greeting by time of day. |
| **Sheet** | `ui/Sheet.tsx` | Scrim `ink/45` + blur → bottom sheet, 32 px top radius, grab handle, title slot, 44 px close | Spring `damping 28, stiffness 280`; drag down > 120 px closes; max 88% height; `tone="ink"` for dark. All Kyon? and actions open here, never a new page. |
| **Btn** | `ui/bits.tsx` | 52 px min height, 20 px radius, 15 px bold, press scale .97 | Variants: `haldi` (primary), `ink` (primary on light onboarding), `clay` (money into Gullak), `danger` (revoke), `white`, `ghost`. One primary per view. |
| **StatusPill** | `ui/bits.tsx` | Icon + word, 11–12 px bold | Always the word — never a dot alone. |
| **ConfTag** | `ui/bits.tsx` | 8 px dot + word: leaf Pakka · amber Andaaza · muted Pata nahi | Under every metric and in Kyon?. |
| **SpeakBtn** | `ui/bits.tsx` | Round white (or white/15 on dark) button, `Volume2`; toggles to `VolumeX` while speaking | Default 44 px. Reads `hi-IN`/`en-IN` at rate .95; replaces ₹ with "rupaye". `stopPropagation` so it works inside tappable cards. **Fix:** sizes 32–40 used — make 48. |
| **Bi** | `ui/bits.tsx` | Primary-language line + other-language 12 px sub-line at 60% | Sub-line hidden in Pro and via `hideSub`. Use for all titles. |
| **SectionTitle** | `ui/bits.tsx` | `Bi` 19 px + optional right slot | |
| **HelpLink** | `ui/bits.tsx` | LifeBuoy + "Madad chahiye? Bank mitra se baat karein" + number | Last element on every scrolling screen. **Fix:** placeholder `1800-000-000`. |
| **Skeleton** | `ui/bits.tsx` | Shimmer block, 28 px radius, 1.3 s | Never a spinner. Match the real card heights. |
| **Celebration** | `ui/Celebration.tsx` | Scrim + 36 confetti pieces + cream card: badge circle or title + "+N Paisa Points" | Auto-close 2.4 s (4.2 s with badge); tap to dismiss. |
| **CashRiver** | `ui/CashRiver.tsx` | 340×200 SVG: area + 3-colour line split at safety floor and ₹0, dashed floor line with label, event markers row (₹ salary, ✎ fee, E EMI, ⚡ bill), date labels every 5 days, scrub tooltip, legend | Movable bill = 12 px haldi-haloed marker pulsing; drag → `onMove` → `/simulate`. Dip pulses red. Tall values clipped with "↑ ₹X". Never computes money. |
| **SafeDial** | `ui/SafeDial.tsx` | Semicircle red/amber/green, ink needle | `status` only → fixed ratio (.1/.5/.86). Visual only — value comes from API. |
| **Donut** | `ui/Donut.tsx` | 5 slices (ghar ink-2, khana haldi, emi danger, bachat leaf, baaki rose) + emoji legend; tap slice/row → top 3 transactions | Hidden in Aasaan. |
| **TodayCards** | `home/TodayCards.tsx` | Snap carousel of ≤ 3 NBA cards, 90% width, page dots | See wireframe §8.2. `Baad mein` removes card for the session. |
| **KyonSheet** | `home/KyonSheet.tsx` | Kya dekha (dated txns with AA tag) → Kya socha (rule + speak) → Kitna pakka + Jaankari/Referral → engine footer | Every NBA has one. |
| **ActionSheet** | `home/ActionSheet.tsx` | Flows: `message`, `gullak` (2-step with read-back), `protect`, `cheaper_option`, `plan`, `help` | Footer: "DhanYukti khud paisa nahi bhejta". Any money step goes through read-back (High Stakes Gate). |
| **HealthTiles** | `home/HealthTiles.tsx` | 2×2 colour tiles: icon, StatusPill, label, value, sub, ConfTag | Safe (haldi) · Resilience (rose) · Debt (lav) · Protection (mint). Null → "Pata nahi". |
| **RiverCard** | `home/RiverCard.tsx` | Title + gap pill → CashRiver → drag hint with "Move to {salary day}" button → scenario result | In scenario: haldi "🔮 SIRF ANDAAZA" banner + "Asli plan" reset. |
| **WhatIf** | `home/WhatIf.tsx` | Ink card, "SIRF ANDAAZA" badge, 2 sliders (hospital bill ₹0–1,00,000 step 5,000; salary late 0–15 days), 2 result tiles, message; optional compact river | Debounced 180 ms → `/simulate`. Always a scenario. |
| **JarsRow** | `home/JarsRow.tsx` | Horizontal (150 px) or 2-col grid (`big`) jar cards: Gullak (tap = speak), name, saved/goal, bar, %, + button | + opens Gullak ActionSheet with the jar's daily suggestion. |
| **Mission** | `home/Mission.tsx` | Rose card: "Parivaar mission" + avatar stack, title, gradient progress bar, "₹640 / ₹1,000 bacha liye · 64%" | |
| **DataSource** | `home/DataSource.tsx` | Mode dot (live leaf / replay amber / fixture muted) + "Anumati + Perfios"; expands to our-vs-Perfios cross-check rows | Transparency for judges; keep below the fold. |
| **Enrich** | `components/Enrich.tsx` | 4 rows (bijli, RC, ration, EPF), each with its own "Haan, jodo" | One consent per source. |

---

## 7. Motion

Library: `motion/react`. Keep total animation assets < 200 KB (no Lottie). Respect `prefers-reduced-motion` — **Spec:** not yet wired; wrap confetti, pulses and diya flicker.

| Motion | Values (as built) | Purpose |
|---|---|---|
| Sheet open/close | spring `damping 28, stiffness 280`; drag-to-close > 120 px, elastic 0.6 | Calm, fast, no bounce |
| Celebration card | spring `stiffness 260, damping 16`, from `scale .6, y 40` | Playful pop |
| Confetti | 36 pieces, 6 palette colours, radial burst, 1.4 s `easeOut` | Task / badge moment |
| Points pop | `scale [0, 1.3, 1]`, delay 0.2 s | "+25 Paisa Points" |
| Celebration dwell | 2.4 s (points) · 4.2 s (badge) | Enough to read, then gone |
| Gullak fill | spring `stiffness 60, damping 14` on coin layer `y` | Heavy, satisfying settle |
| Safe dial needle | spring `stiffness 60, damping 10` from −90° | Slight overshoot = "alive" |
| Level tree grow | spring `stiffness 120, damping 12`, scale .6 → 1 | On level change |
| Progress bars (mission, level) | width 0 → n%, 1 s | |
| River morph (scenario) | path `d` tween 0.6 s | Shows the dip shrinking when the fee is dragged |
| River dip pulse | ring r 6 → 16, opacity .8 → 0, 1.6 s loop | Draws eye to the date of harm |
| Movable bill pulse | r 13 ↔ 17, 1.8 s loop | Affordance: "drag me" |
| Onboarding step change | x ±30, opacity, 0.22 s, `mode="wait"` | |
| AA fetch steps | reveal one step every 650 ms; bank icon ring pulse 1.5 s | Makes consent → analytics visible |
| Revoke steps | stagger 0.35 s per row | Proof that deletion happened |
| Poocho mic | 2 rings scale 1 → 1.5, 1.4 s, 0.7 s offset; tap scale .92 | Listening state |
| Typing dots | y 0 → −5, 0.8 s, 0.15 s stagger | Waiting for answer |
| Press feedback | `Btn` scale .97; tiles .98 | |
| Diya / coins (splash) | flame scaleY 1 → 1.2, 1.2 s; 3 coins drop 1.4 s staggered 0.7 s | Warm welcome |

**Spec — jar coin drop:** on `gullak_deposit`, drop one ₹ coin into the jar (reuse HomeScene coin), then run the fill spring. **Spec — streak flame:** flame scale 1 → 1.15 → 1 when streak increments.

---

## 8. Screens

Common to every tab screen: `TopBar` (or page header) → content → `HelpLink` → 112 px tab-bar clearance. Loading = `Skeleton` blocks of real card heights. Language toggle always reachable in the top-right.

### 8.1 Onboarding (`/onboarding`, 8 steps, target < 4 min)

Shell: no tab bar. From step 2: back button (44 px) → 7-segment progress bar → LangToggle. Each step title uses `Title` = 30 px heading + muted sub + `SpeakBtn`.

| # | Step | Purpose | Layout (top → bottom) | Primary action | States | A11y / voice |
|---|---|---|---|---|---|---|
| 1 | `splash` | Promise + trust | "// DhanYukti" + LangToggle → 44 px headline (clay second line) → sub → `HomeScene` 300 → ink Btn → "Parivaar ke liye muft · Anumati AA se surakshit" | Shuru karein → | — | **Fix:** add SpeakBtn for headline |
| 2 | `language` | Pick language by *hearing* it | Title → 5 rows: native name (Devanagari/Tamil/Bengali) + English + 🔊 48 px. Selected = ink row + haldi speaker. Tamil/Marathi/Bengali at 60% opacity "· v1.1" | Aage | Unavailable languages disabled but playable | 🔊 plays a spoken sample in that language |
| 3 | `login` | Mobile + OTP, no Aadhaar/PAN | Title → +91 field (24 px number) → OTP field appears after 10 digits (6 dots, wide tracking) → mint note "Helper kabhi aapka OTP ya balance nahi dekhte" | Aage (disabled until 10 + 6 digits) | Demo: any 6 digits | `inputMode=numeric`; **Spec:** voice OTP read-out |
| 4 | `family` | Family in 5 taps | Title → avatar stack 60 px → 3 counters (log / kamaane wale / school) with 44 px −/+ → work type 4-chip grid (🏭 Naukri, 🏪 Dukaan, 🛵 Gig, 🧱 Mazdoori) → loans Haan/Nahi | Aage (disabled until loans answered) | — | **Fix:** −/+ to 48 px |
| 5 | `passport` | Dual-Consent Passport | Title → rose DPDP card (Kya dekhenge / Kyon / Kab tak + "✓ Haan" / "Phone signal nahi") → ink AA card (same 3 rows, tag "AA · Anumati") → error line → haldi Btn → "Consent Anumati … sambhaalta hai" | Haan — Anumati se jodein | Disabled until DPDP choice; error "{err}" | Icon + bold label per row; speaker on title |
| — | *Anumati approval* | See §8.2 | | | | |
| 6 | `connect` | Make AA → Perfios visible | Pulsing ink circle with `bank` scene → "Aapka hisaab ban raha hai…" → mode line → 7 step rows ticking leaf every 650 ms | (auto) → reveal | Error: danger text + "Dobara" back to passport | **Spec:** speak each step in Aasaan |
| 7 | `reveal` | First reveal | Title "{Name} ji, parivaar ki paisa sehat" → ink card: Resilience Days 64 px + sub + 3 mini-metrics → danger-soft "Pehla kaam" card with Scene + title + 🔊 | Badhiya! Aage → Pehla Kadam celebration (+100) | Metric null → "?" / "Pata nahi" | Speak the first task |
| 8 | `gullak` | First Gullak | Title → 3-col jar cards (Gullak 70 + name + goal) → white trust note "Paisa aapke apne bank RD / bachat mein rehta hai…" | Ghar chalein 🏠 (clay) | — | **Spec:** tap a jar to choose it (currently display only) |

### 8.2 Anumati approval (`/anumati`, replay-mode stand-in)

- **Purpose:** show the RBI-licensed AA consent screen the family approves. In live mode the user is redirected to Anumati's real sandbox; this page is only for replay.
- **Layout:** amber "SANDBOX SIMULATION · replay mode" chip → "Anumati — Account Aggregator" + masked mobile → request card (Purpose, FI types, Range 6 months, Frequency monthly, Valid 90 days, Data life 1 day, handle in mono) → discovered accounts with checkboxes (Savings XXXX4821, RD XXXX9034) → OTP → "Aadhaar se khaate nahi dhoondhe jaate" → Mana karein / Manzoor karein.
- **Visual:** deliberately *not* Haldi & Neel (grey `#F4F6FA`, 16 px radius) so it reads as a different party. Never add DhanYukti branding here.
- **Primary:** Manzoor karein (disabled until OTP + ≥ 1 account).
- **States:** Reject → back to passport step. Approve error is swallowed (live mode handles it at Anumati).
- **A11y:** **Fix:** buttons are 52 px ✓; checkboxes are 24 px inside a full-width 48 px row ✓; add HelpLink and SpeakBtn for the request summary.

### 8.3 Home — Ghar (`/`)

**Purpose:** in 30 seconds, tell the family the one thing to do today, and show that the rest is under control.

Widget order (as built):

| # | Block | Component | Hidden in |
|---|---|---|---|
| 1 | TopBar: avatar, greeting, name, 🔥 streak, हिं/EN | `TopBar` | — |
| 2 | "Aaj ek kaam — baaki hum sambhaal lenge" | inline | — |
| 3 | **Aaj ka kaam** carousel (≤ 3 NBA cards) | `TodayCards` | — |
| 4 | Safe-to-Spend dial (white) + Resilience Days (rose), 1.25 : 1 | inline + `SafeDial` | — |
| 5 | Paise ki nadi | `RiverCard` | — |
| 6 | Gullak row | `JarsRow` | — |
| 7 | Parivaar ki sehat 2×2 | `HealthTiles` | — |
| 8 | Agar…? | `WhatIf` | **Spec:** Aasaan |
| 9 | Parivaar mission | `Mission` | — |
| 10 | Kahaan gaya paisa (last month) | `Donut` | Aasaan |
| 11 | Data source (Anumati + Perfios, cross-check) | `DataSource` | **Spec:** Aasaan |
| 12 | Madad chahiye? | `HelpLink` | — |

```
┌──────────────────────────────────────┐
│ (◕) Suprabhat 🙏            🔥6  हिं|EN │  TopBar
│     Sunita                            │
│ Aaj ek kaam — baaki hum sambhaal lenge│
│ ┌──────────────────────────────┐ ┌──┐ │
│ │  AAJ KA KAAM CARD (ink)      │ │nx│ │  TodayCards (swipe)
│ │  … see card wireframe …      │ │  │ │
│ └──────────────────────────────┘ └──┘ │
│               ━━ • •                   │  page dots
│ ┌─────────────────┐ ┌──────────────┐  │
│ │Aaj kharch kar 🔊│ │Bina aamdani  │  │
│ │ sakte hain      │ │ kitne din    │  │
│ │    ╭─────╮      │ │              │  │
│ │   ╱  ↖   ╲     │ │  N           │  │  52 px
│ │     ₹0          │ │ din ka bachav│  │
│ │ Sirf zaroori…   │ │ Bachat ₹…÷…  │  │
│ │   ● Andaaza     │ │              │  │
│ └─────────────────┘ └──────────────┘  │
│ Paise ki nadi                          │
│ ┌──────────────────────────────────┐  │
│ │Agle 30 din ka paisa  −₹3,000·28 Sep│ │
│ │ ₹ ⚡ ✎(drag)  ₹          E E       │  │  markers
│ │ ▔▔▔╲___            ___╱▔▔▔▔▔▔▔▔  │  │  green/amber/red line
│ │ - - - -╲- Safety floor ₹4,000 - - │  │
│ │ ₹0 ─────╲●───────────────────────│  │  dip pulses
│ │ 23 Sep   28 Sep   3 Oct   8 Oct   │  │
│ │ ● Surakshit ● Floor se neeche ● Kami│ │
│ │ [↔ Peela bill khiskao…  (30 Sep par)]│ │
│ └──────────────────────────────────┘  │
│ Gullak                                 │
│ [🏺 Emergency 16%  +] [🏺 School +] [🏺…│  JarsRow (scroll)
│ Parivaar ki sehat                      │
│ [💰 Safe  🔴] [📅 Days  🔴]            │  HealthTiles
│ [🏛 Karz  🟠] [🛡 Bima  🔴]            │
│ ┌ Agar…?            🔮 SIRF ANDAAZA ┐  │  WhatIf (ink)
│ │ 🏥 Hospital ka bill aaye   ₹0     │  │
│ │ ━━━━━━○━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│ │ ⏳ Salary late ho          0 din   │  │
│ │ [Bachav ke din N] [Sabse badi kami]│  │
│ └───────────────────────────────────┘ │
│ ┌ PARIVAAR MISSION        (◕)(◕)(◕) ┐ │  Mission (rose)
│ │ Is mahine ₹1,000 bachao           │ │
│ │ ███████████░░░░░  ₹640/₹1,000 64% │ │
│ └───────────────────────────────────┘ │
│ Kahaan gaya paisa        Pichhla mahina│  Donut (Saathi/Pro)
│ ● Anumati + Perfios · Replay        ⌄ │  DataSource
│ [🛟 Madad chahiye? Bank mitra…]        │  HelpLink
├──────────────────────────────────────┤
│  घर   लक्ष्य   ( 🎤 )   इनाम   परिवार   │  TabBar
└──────────────────────────────────────┘
```

**Aaj ka kaam card** (`TodayCards`, first card = today's task):

```
┌────────────────────────────────────────┐  32 px radius, shadow-lift
│ [🔴 Abhi karein]  AAJ KA KAAM      (🔊) │  tier pill · eyebrow · 38 px speaker
│                                        │
│ 28 tareekh ko ₹3,000        ┌──────┐   │  23 px / 800
│ kam padenge                 │ 🏫   │   │  Scene 70 px
│ You'll be ₹3,000 short…     │school│   │  Bi sub-line (hidden in Pro)
│ School fee (₹5,000) salary  └──────┘   │  body 14 px, 75% opacity
│ se 2 din pehle hai.                    │
│ ┌────────────────────────────────────┐ │
│ │ ✅ AAJ KA KAAM                      │ │  white/10 inset
│ │ School se fee 30 tareekh tak       │ │  15 px / 600
│ │ badhane ki request bhejein. Hum    │ │
│ │ message likh denge.                │ │
│ └────────────────────────────────────┘ │
│ ⏱ Agar nahi kiya: App loan lena pad    │  danger-tint line
│   sakta hai, lagbhag ₹150–₹300 kharcha.│
│ ↳ Fee badhne ke baad bhi ₹… kam — 5 din│  second_step (optional)
│   ₹200 kam kharch, ya Gullak se.       │
│ ┌───────┐ ┌─────────────────┐ ┌──────┐ │
│ │ Kyon? │ │    Karo  →      │ │ Baad │ │  48 px · haldi primary · text
│ └───────┘ └─────────────────┘ │ mein │ │
│                               └──────┘ │
│           +25 Paisa Points             │
└────────────────────────────────────────┘
```

- **Primary action:** `Karo` → ActionSheet for the card's action type.
- **States:**
  - *Loading:* 4 skeletons (56, 320, 160, 220 px).
  - *Error (no data):* 📡 "Network kamzor hai" + "Dobara" (ink, 48 px).
  - *Empty (no NBA):* **Spec:** mint card "Sab theek hai 🌿 Aaj koi zaroori kaam nahi" + check-in button (+5).
  - *Scenario:* River shows haldi "🔮 SIRF ANDAAZA — asli plan nahi badla" banner, struck-through old gap → new gap, "Asli plan" reset chip. WhatIf always carries the badge. **Spec:** add `.hatch` overlay to scenario river area so it's visibly different in greyscale too.
  - *Unknown metric:* "Pata nahi" value + muted ConfTag; never ₹0.
- **A11y:** tier = pill colour + icon/emoji + word; card is announced as one `article`; `SpeakBtn` reads title + body + task. Carousel also operable by page dots (**Spec:** make dots tappable 48 px). **Fix:** "Baad mein" is text-only with no undo — add a 5 s "Wapas laao" toast.

### 8.4 Lakshya — Goals (`/goals`)

- **Purpose:** save for named goals; feel progress; rehearse shocks.
- **Layout:** TopBar "Lakshya" → clay hero (total saved 44 px, goal, "Salary ke din pehle khud ko do!", haldi Gullak 130 px bleeding off the corner) → "Mere Gullak" 2-col `JarsRow big` → Mission → "Musibat ka andaaza" `WhatIf showRiver` → HelpLink.
- **Primary action:** + on a jar → Gullak sheet → read-back → "Haan, daalo".
- **States:** loading skeletons (220, 300); empty (no jars) **Spec:** dashed clay card "Pehla Gullak banayein" with the 3 starter goals; scenario: WhatIf badge + compact river on cream.
- **A11y:** tap the Gullak itself to hear "Emergency Gullak mein ₹2,400 hain, lakshya ₹15,000". **Fix:** + button is 40 px → 48 px.

### 8.5 Poocho — Ask (`/ask`)

- **Purpose:** ask by voice; the companion only explains engine numbers.
- **Layout:** header "Poocho" + sub + LangToggle → (empty state) 160 px ink mic with 112 px haldi core, "Namaste Sunita! Bolkar poochhiye", "Mic dabaiye aur Hindi mein bolein" → chat bubbles (me = ink right; DhanYukti = white left with ✨ label, "Jaankari · salah nahi" chip, tools used, 🔊) → suggestion chips (5) → input pill: mic 48 · text · send 48 → "Niyam ginte hain, AI sirf samjhata hai".
- **Primary action:** the big mic (empty) / small mic (in chat). Answers are auto-spoken.
- **States:** listening (haldi rings, "Sun rahe hain…", mic turns clay); thinking (3 bouncing dots); error bubble "Maaf kijiye…"; no speech API bubble "Is phone par awaaz nahi chalti…".
- **A11y:** voice is primary, typing is fallback; every answer has a speaker. **Fix:** add HelpLink below chips; chips are 44 px → 48 px.

### 8.6 Inaam — Rewards (`/rewards`)

- **Purpose:** make good habits visible — never money size.
- **Layout:** TopBar "Inaam" → ink hero (Level N, level name 34 px, points 40 px, "X points aur — phir {next}", LevelTree 140, haldi progress bar, 5 level names, "Level aadaton se badhta hai, paison se nahi") → haldi streak card (🔥 N din ka streak, shield count, 7-day row, "Aaj ka hisaab dekha ✓ (+5)") → Badges 3-col (earned = white + haldi circle; locked = grey 50%) → "60 second ki kahaani" lav play card (+15) → Parivaar leaderboard ("Sirf aadatein"; 🥇🥈🥉, habits, 🔥) → Value Ledger (mint; PAKKA/BATAYA tags; "Points aur asli paisa alag rakhe jaate hain") → HelpLink.
- **Primary action:** daily check-in.
- **States:** loading (260, 200); private members show no points (**Spec**); checked-in today → button shows "✓ Aaj ho gaya" disabled (**Spec**; API already returns delta 0).
- **A11y:** badge descriptions hidden in Aasaan (icon + name only); lesson is audio-first.

### 8.7 Parivaar — Family (`/family`)

- **Purpose:** who is in, what they share, and full control over consent.
- **Layout:** TopBar "Parivaar" → Demo household switcher (A/B/C cards, 224 px, ink when active) → Members & sharing (avatar, name · age, role, KAMAANE WALE tag; earners get 3-way segmented Poora / Sirf total / Sirf mere liye) → Consent Passport: ink AA card per artefact (tag, status, member, 👁 FI types · months, 🎯 purpose, ⏳ until + data life, handle, "Consent band karein") + white DPDP card with switches → Aur jaankari jodein (`Enrich`) → Literacy mode 3 tiles → "Mode badalne se paison ka hisaab nahi badalta" → Sponsor integration status → "Demo: onboarding dobara" → HelpLink.
- **Primary action:** revoke (danger Btn in sheet) — deliberately *one* tap + one confirm, no family vote.
- **States:** passport loading skeleton 180; empty AA → dashed "+ Bank jodein (Anumati AA)"; revoke done → animated ✓ list (REVOKED, fetches cancelled, "Mita diya: …"); statuses ACTIVE (mint) / REVOKED (danger-soft) / other (white/15).
- **A11y:** DPDP rows are `role="switch"` with `aria-checked`. **Fix:** sharing segments are 36 px → 48 px; Sponsor integration + demo switcher are judge-facing — hide in Aasaan (**Spec**).

---

## 9. Literacy modes

Same numbers in every mode (Rule 7). Stored as `dy.mode`; default **Saathi**.

| | 🎧 Aasaan ("Voice + pictures") | 🤝 Saathi ("Short text + cards") — default | 📊 Pro ("Full dashboard") |
|---|---|---|---|
| Built today | Hides spend Donut; hides badge descriptions | Everything; bilingual sub-lines | Hides the second-language sub-line (`Bi`) |
| Shows | Aaj ka kaam, Safe-to-Spend, Resilience Days, river, jars, health tiles, mission, help | + WhatIf, Donut, DataSource, badge text | + DataSource expanded by default (**Spec**), Kyon? source tags |
| **Spec — to add** | Auto-speak the top card on open (once/day); hide WhatIf, DataSource, Sponsor, demo switcher; health tiles show icon + value + pill only; 64 px buttons | — | Show exact transaction list in Donut; engine ids on cards |
| Voice | Speaker on every block; IVR-first | Speaker on cards | Speaker still present |

---

## 10. Accessibility checklist (known gaps)

| Area | Rule | Current gaps (Fix) |
|---|---|---|
| Targets ≥ 48 px | Rule 5 | `LangToggle` 36 px; `SpeakBtn` 32–44 px; family −/+ 44 px; Sheet close 44 px; jar + 40 px; sharing segments 36 px; "Asli plan" chip 36 px; Poocho chips 44 px |
| Colour + icon + word | Rule 3 | River markers use glyphs (₹ ✎ E ⚡) — add long-press label; Donut slices rely on colour + emoji + label ✓ |
| Speaker on every screen | Rule 1 | Missing screen-level speaker on Lakshya, Inaam, Parivaar, splash, Anumati |
| Help on every screen | Rule 9 | Missing on Poocho, Onboarding, Anumati |
| Text size | §3 | 9–10 px used 26 times |
| Contrast | §2.3 | green/red pills, amber tier pill, clay + WhatsApp buttons, Mission label |
| Screen readers | — | Art is `aria-hidden` ✓; `CashRiver` needs an `aria-label` summary ("28 Sep ko −₹3,000, sabse kam"); TodayCards carousel needs `aria-roledescription="carousel"` |
| Motion | — | No `prefers-reduced-motion` handling |
| `lang` attribute | — | `<html lang="hi">` fixed; set `lang` per toggle (`en` for English) so TTS/screen readers pronounce correctly |

---

## 11. Design QA checklist (run per PR touching `web/`)

**Every screen**
- [ ] Sunita can finish the screen's job in < 60 s, voice or taps, without reading English.
- [ ] Exactly one primary button, in the bottom third.
- [ ] A 🔊 speaker is visible without scrolling and reads the main message.
- [ ] `HelpLink` ("Madad chahiye?") is present.
- [ ] Every tap target ≥ 48 × 48 px (check in devtools at 360 px width).
- [ ] Works at 360 px and 430 px; nothing clipped behind the tab bar.
- [ ] Loading uses `Skeleton` of the real card heights — no spinner.
- [ ] Error state has a plain-language line and a "Dobara" button.

**Numbers and status**
- [ ] Every rupee value comes from the API; no arithmetic in the component (Rule 2).
- [ ] Money shown as ₹ with Indian grouping (`₹30,000`, `₹2 lakh`); no "%", no ratios except "₹X/₹100".
- [ ] Missing data shows "Pata nahi", never `₹0` or blank.
- [ ] Each metric shows a `ConfTag`.
- [ ] Every status = colour + icon + word (`StatusPill`).
- [ ] Any what-if shows "🔮 SIRF ANDAAZA" and a way back to "Asli plan".

**Copy**
- [ ] Hinglish primary + English sub-line via `Bi`; strings match [Content.md](Content.md).
- [ ] No shame / fear words (see Content.md §1 banned list).
- [ ] Every NBA card has Kyon?, Karo, Baad mein and the Jaankari / Referral label in Kyon?.
- [ ] Referral hand-offs show the "DhanYukti ko ₹X milega" line.

**Trust and safety**
- [ ] Money actions go through read-back ("₹800 Emergency Gullak mein, aapke apne khaate se. Sahi hai?").
- [ ] No OTP, balance or advice visible in helper/assisted views.
- [ ] Nothing sensitive in notifications (no amounts on lock screen).

**Visual**
- [ ] Only palette tokens (no new hex) — exceptions listed in §2.1.
- [ ] Radii from §4 (32 / 28 / 24 / 20 / 999).
- [ ] Contrast ≥ 4.5 : 1 for text < 24 px.
- [ ] Text ≥ 12 px for anything a user must read.

**Modes and language**
- [ ] Same numbers in Aasaan / Saathi / Pro (TestPlan "Literacy modes").
- [ ] हिं ⇄ EN toggle changes every string on the screen, including speaker output.

**Performance**
- [ ] First load < 1.5 MB (`next build` output); animations < 200 KB; no raster images added.
- [ ] Service worker still never caches `/api`.
