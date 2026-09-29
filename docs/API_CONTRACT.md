# DhanYukti API contract (v1)

Backend: FastAPI at `http://localhost:8000`. All money values are **integer rupees** in JSON
(engines compute in integer paise internally and round). Dates are ISO `YYYY-MM-DD`.
Every user-facing string is bilingual: `{ "hi": "...", "en": "..." }` (type `L`).
CORS: allow `http://localhost:3000` and `*.vercel.app`.

Household ids: `A` (Sunita & Ramesh Yadav, Panipat), `B` (Farida Sheikh, Indore), `C` (Arjun & Meena Nair, Coimbatore).
As-of date for all fixtures: `2026-09-23`.

## Types

```ts
type L = { hi: string; en: string };
type Confidence = "pakka" | "andaaza" | "pata_nahi";   // confirmed / estimate / unknown
type Status = "green" | "amber" | "red";

type Member = { id: string; name: string; role: L; earner: boolean; age?: number;
                sharing: "poora" | "sirf_total" | "private"; avatar: "woman"|"man"|"girl"|"boy"|"elder_woman"|"elder_man" };

type Metric = { value: number | null; unit: "inr" | "days" | "per100" | "status";
                status: Status; confidence: Confidence; label: L; sub: L; engine: string };

type RiverEvent = { id: string; type: "salary"|"bill"|"fee"|"emi"|"rent"|"premium"|"gig";
                    label: L; amount: number;            // + credit, - debit
                    movable: boolean };
type RiverDay = { date: string; balance: number; events: RiverEvent[] };
type River = { floor: number; days: RiverDay[];            // 30 days starting as_of
               min_balance: number; min_date: string; gap: number };   // gap = max(0, -min_balance)

type Txn = { date: string; narration: string; amount: number; source: "aa"|"perfios"|"declared" };

type Why = { saw: Txn[]; rule: L; confidence: Confidence; tag: "jaankari" | "referral" };

type Action = { type: "message"|"gullak"|"protect"|"cheaper_option"|"plan"|"help";
                label: L; payload: Record<string, any> };   // e.g. message: {to, text: L}, protect: {url}

type NBA = { id: string; tier: 1|2|3|4; tier_label: L; severity: Status; engine: string;
             icon: "school"|"shield"|"loan"|"jar"|"bolt"|"heart"|"grow"|"alert";
             title: L;         // "28 tareekh ko ₹3,000 kam padenge"
             body: L;          // reason in one line
             task: L;          // Aaj ka kaam
             if_not: L;        // consequence of waiting
             second_step?: L;  // honest residual
             action: Action; why: Why; points: number };

type Jar = { id: string; name: L; goal: number; saved: number; kind: "emergency"|"school"|"festival"|"education"; daily_suggest: number };

type Badge = { id: string; name: L; desc: L; earned: boolean; icon: string };
type Game = { points: number; streak: number; streak_shield: number;
              level: 1|2|3|4|5; level_name: L; next_level_at: number;
              badges: Badge[];
              mission: { title: L; progress: number; target: number };
              leaderboard: { member_id: string; name: string; habits: number; streak: number }[];  // habits only, never money
              ledger: { date: string; what: L; amount: number; evidenced: boolean }[] };        // Value Ledger

// on_rbi_list: true = in our copy of RBI's DLA list; false = demo fixtures only ("not on the list" in the story);
// null = live data, not in our (partial) copy -> unknown, confidence "pata_nahi", never shown as "not on RBI's list".
// above_our_cost_line: over DhanYukti's own ₹36-a-year-per-₹100 line (our rule, not RBI's).
type LenderCheck = { app: string; on_rbi_list: boolean | null;
                     rbi_list_status: "in_our_copy" | "not_on_list" | "not_in_our_copy";
                     confidence: "pakka" | "pata_nahi"; borrowed: number; charges: number;
                     days: number; effective_annual_pct: number; above_our_cost_line: boolean; verdict: L };

type Dashboard = {
  household: { id: string; family_name: L; primary_user: string; city: L; income_type: "salary"|"gig"|"dual";
               monthly_income: number; members: Member[]; literacy_mode: "aasaan"|"saathi"|"pro"; language: "hi"|"ta"|"en" };
  as_of: string;
  data_source: { mode: "live"|"replay"|"fixture"; aa: string; analytics: string; fetched_at: string };
  metrics: { safe_to_spend: Metric; resilience_days: Metric; debt_load: Metric; protection: Metric };
  protection_detail: { member_id: string; name: string; life: boolean; health: boolean; note: L }[];
  river: River;
  nba: NBA[];                       // ranked by E13; nba[0] is Aaj ka kaam
  jars: Jar[];
  spend: { key: "ghar"|"khana"|"emi"|"bachat"|"baaki"; label: L; amount: number; top: Txn[] }[];  // last month
  lender_shield: LenderCheck[];
  crosscheck: { field: L; ours: string; perfios: string; agree: boolean }[];   // E01 vs Perfios analytics
  game: Game;
};
```

## Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/health` | | `{ok, mode:{anumati:"live"|"replay", perfios:"live"|"replay"}}` |
| GET | `/api/households` | | `[{id, family_name:L, city:L, income:number, members:number, problem:L, hero:L}]` |
| GET | `/api/households/{id}/dashboard` | | `Dashboard` |
| POST | `/api/households/{id}/simulate` | `{moves?:[{event_id, new_date}], shock_amount?:number, salary_delay_days?:number, cut_per_day?:number}` | `{river: River, resilience_days:number, gap_before:number, gap_after:number, message: L, scenario: true}` |
| POST | `/api/households/{id}/correct` | `{field, value}` | `{ok, dashboard: Dashboard}` (overlay, never rewrites source) |
| GET | `/api/consent/passport/{hid}` | | `{aa: ConsentArtefact[], dpdp: DpdpGrant[]}` |
| POST | `/api/consent/dpdp` | `{household_id, grants:{profile:boolean, device_signals:boolean}}` | `{ok, grants}` |
| POST | `/api/consent/aa/start` | `{household_id, member_id, mobile}` | `{consent_handle, redirect_url, status:"PENDING", mode}` |
| GET | `/api/consent/aa/{handle}/status` | | `{status:"PENDING"|"ACTIVE"|"REJECTED"|"REVOKED"|"EXPIRED", mode}` |
| POST | `/api/consent/aa/{handle}/approve-sandbox` | | replay-mode only helper to simulate approval `{status:"ACTIVE"}` |
| POST | `/api/consent/aa/{handle}/fetch` | | `{ok, accounts:number, transactions:number, steps:[{key, label:L, done:boolean}], mode}` |
| POST | `/api/consent/aa/{handle}/revoke` | | `{status:"REVOKED", deleted:["derived_profile","open_actions"], mode}` |
| POST | `/api/consent/aa/callback` | Anumati notification | `{ok}` (then confirm by status poll) |
| POST | `/api/game/{hid}/event` | `{type:"checkin"|"task_done"|"gullak_deposit"|"protection_check"|"correction"|"lesson", ref?:string, amount?:number}` | `{points, delta, streak, level, badge_unlocked?: Badge, jars?: Jar[]}` |
| POST | `/api/ask` | `{household_id, question, lang:"hi"|"en"}` | `{answer: L, tools_used: string[], tag:"jaankari"}` |
| GET | `/api/capabilities` | | capability register `[{sponsor, api, status:"live"|"replay"|"blocked"|"untested", note}]` |

```ts
type ConsentArtefact = { handle: string; member_id: string; member_name: string; aa: "Anumati";
  status: string; purpose: L; fi_types: string[]; range_months: number; fetch: "PERIODIC_MONTHLY";
  expiry: string; data_life: L; created_at: string };
type DpdpGrant = { key: "profile"|"device_signals"|"ration"|"electricity"|"rc"|"epf";
  label: L; why: L; granted: boolean; until: L };
```

## Sponsor enrichment (v1.1 — additive; nothing above changes)

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/enrich/{hid}/{kind}` | `{consent: true, input?: {...}}` | `{kind, mode:"live"\|"replay", result: {...}, used_for: L}` |
| POST | `/api/bsa/upload` | multipart: `file` (PDF, required), `household_id` (default `"A"`), `password?` | `{mode:"live"\|"replay", status:"COMPLETED"\|"PROCESSING"\|"FAILED", report_id: string}` |

- `kind` ∈ `electricity | rc | ration | epf` (Perfios Hub). `digilocker` is also accepted (Hub DigiLocker pull; not in the DPDP grant list).
- `consent` must be exactly `true`, else **403**: each Hub lookup needs its own DPDP consent line. A successful call also sets the matching `DpdpGrant.granted = true` in `/api/consent/passport/{hid}`.
- `input` keys (all optional; demo defaults are used when missing): electricity `{consumer_no, board}`, rc `{reg_no}`, ration `{card_no, state}`, epf `{uan}`, digilocker `{doc_type, consent_ref}`.
- `result` is redacted (identifiers masked like `XXXXXX9821`). Example (electricity, replay):
  `{board:"UHBVN", consumer_no:"XXXXXX9821", last_bill_amount:1500, last_bill_date:"2026-08-20", due_date:"2026-09-27", units_consumed:214, paid_on_time_6m:6, connection:"Domestic"}`
- `/api/bsa/upload`: non-PDF → **415**. The PDF is never stored (compute-then-delete). Live BSA is `blocked` until Perfios approves a non-lending configuration, so it currently serves replay.
- On any live sponsor failure the backend falls back to replay and returns `mode: "replay"`.
- `/api/capabilities` lists every sponsor API individually (Anumati: consent create/status/artefact, FI request, FI fetch, revoke, notification+signature; Perfios: analytics categorisation, salary/EMI/bounce, BSA initiate/upload/status/report, Hub electricity/RC Advanced/ration/EPF/DigiLocker).

## What-if (v1.2 — additive; nothing above changes)

Engine: E17 (`api/app/engines/e17_whatif.py`) on top of E03. All fields below are optional for clients; an
older backend that omits them still renders (screens fall back to "after only").

`POST /api/households/{id}/simulate` also accepts
`purchase?: {amount:number, pay:"cash"|"loan", loan?:{annual_rate_pct?:number, months?:number, processing_fee?:number}}`
and returns, in addition to the fields above:

```ts
{
  // before, on the same baseline and 30-day horizon
  resilience_before: number; min_balance_before: number; min_date_before: string;
  first_deficit_date_before: string | null; first_deficit_date: string | null;
  conditional: RiverEvent[];          // bills the scenario moved: payee has NOT agreed (moved, original_date, needs)
  responses?: {id, kind:"move"|"cut"|"gullak"|"all", label:L, gap_after, fixes:boolean, conditional:boolean, needs?:L, jar_id?}[];
  feasible?: boolean;                 // present when there is a shortfall; false = nothing permitted closes it
  goal_impact?: {jar_id, name:L, goal, target_date, used, saved_before, saved_after, gap_before, gap_after, daily_before, daily_after};
  loan?: {principal, complete:boolean, missing:string[], missing_labels:L[],
          // only when complete:
          annual_rate_pct, months, processing_fee, emi, total_repay, total_cost, extra_over_price, extra_per_100,
          debt_per100_before, debt_per100_after, debt_status_after, first_emi};
  purchase?: {amount, pay};
}
```

Rules:
- `gap` is the shortfall on the FIRST deficit day. A shock can make it arrive earlier but smaller
  (A + ₹4,000 → ₹1,500 on 27 Sep vs ₹3,000 on 28 Sep), so screens always show the lowest point too.
- A loan with any term missing returns `complete:false` and no EMI, total or cash-flow change. Never guess a total.
- Responses never include new credit. Moving a bill is always `conditional` until the payee agrees.
- `RiverEvent.certainty`: `pakka` when bank data shows the payment on the same day (±1), amount within 10%,
  in 3+ months; otherwise `andaaza` (with `basis:L`). A date the user corrected is `andaaza`.
- `Jar` gains `remaining` and `target_date`.
- Demo fallback (`web/src/lib/mock.ts`) mirrors these; refresh its data with `python api/scripts/refresh_demo_whatif.py`.

## My household (v1.3 — linked member, additive)

A member who links a bank account through Anumati gets their own household, id `"me"`. No demo
household data is used for them. Demo households (A/B/C) open only when someone picks one.

Browser → Next.js (same paths as A/B/C, served by route handlers, never proxied to FastAPI):
`GET /api/households/me/dashboard`, `POST /api/households/me/simulate`, `POST /api/households/me/correct`,
`POST /api/game/me/event`, `POST /api/ask/me` (`{question, lang}`), `GET /api/consent/passport/me`,
`GET /api/households/me/status` → `{linked, ready}`.
Errors: `{error: {code, safe_message, retryable, missing?: L[]}}` with `code` one of `not_linked` (404),
`data_pending` (409), `twin_insufficient` (409, `missing` lists what the bank didn't send), `data_expired` (410),
`engine_unreachable` / `engine_error` (503).

Next.js server → FastAPI (stateless; header `x-twin-secret` when `TWIN_SHARED_SECRET` is set on both):
`POST /api/twin/build {as_of, fetched_at, sandbox, accounts:[{id, masked, fip, type, fi_type, balance, transactions:[{date, narration, amount}]}], profile:{first_name, age, answers}}`
→ `{status: "ready"|"insufficient", missing, twin?, state?}`; then `/api/twin/{dashboard,simulate,correct,game-event,ask}`
with `{twin, state, …}`. `correct` and `game-event` return the new `state`, which Next.js saves.

Twin rules (E02): upcoming dates are projected from the member's own recurring payments (per payee and account;
monthly/quarterly/yearly cadence, or the typical gap for payouts), each `pakka` only with 3+ months on the same
day; essentials per day = the middle month of everyday spend; safety floor = 7 days of essentials; income and EMIs
average over the complete months the data covers (none → `monthly_income: null`). Everyday rows are dropped after
the build; the twin keeps E01's figures, the income/obligation rows that evidence them, and last month's spend
buckets, for at most 30 days (deleted on revoke or "delete everything"). Family members come from the onboarding
answers only with DPDP "profile" consent. Suggested tasks (NBA) are always shown.

### What the member told us (v1.4 — additive)
Onboarding answers v2 add `own_income` (fixed | varies | none), a fuller work list (homemaker, student, retired)
and optional `money` (cash at home, income amount + frequency + next pay date, one bill). With DPDP "profile"
consent, the Next.js server sends them as `declared` on every `/api/twin/*` call; E02 `apply_declared` layers
them on at load time (edits and withdrawals show at once). Bank facts always win: declared income only when the
bank shows none in the next 30 days (and fills monthly income only when no complete month is covered); a declared
bill only when no bank-projected payment of about that amount is within 3 days; "income varies" makes pay dates
estimates; "no income of my own" only when the bank shows none; cash at home counts toward days without income.
Everything added is `certainty: "andaaza"` with basis "You told us".
