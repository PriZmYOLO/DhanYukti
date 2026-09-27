# DhanYukti API (FastAPI)

Hindi/English money companion for Tier 2/3 families. Implements `docs/API_CONTRACT.md` exactly.
Rules calculate; copy (and optionally Claude) explains.

## Run

```bash
cd api
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/uvicorn app.main:app --reload --port 8000
```

Tests: `.venv/bin/pytest -q`

Copy `.env.example` to `.env` and fill in the sandbox credentials. A sponsor runs **live** only when *all*
of its variables are set. Otherwise it runs **replay**, and so does any live call that fails.
Responses always say which one served them (`mode`).

## Layout

- `app/engines/`: pure functions, money in integer paise.
  - E01 normalise
  - E03 the one shared cash-flow simulator (used by both the dashboard and `simulate`)
  - E04 debt + Lender Shield
  - E05 resilience
  - E06 protection
  - E13 priority
  - E14 NBA copy
  - E16 confidence
- `app/pipeline.py`: fixture + user overlays → engines → `Dashboard`.
- `app/fixtures/households.py`: golden households A, B and C. `replay_aa_fetch.json` is a redacted ReBIT FI sample for A.
- `app/connectors/`: interfaces in `base.py`. Anumati (`anumati/client.py` live, `anumati/replay.py`). Perfios (`perfios/analytics.py`, `perfios/bsa.py`, `perfios/hub.py` live, `perfios/replay.py`). The factory and fallback live in `__init__.py`. All route and header constants are marked `TODO(confirm with sandbox docs)`.
- `app/game/service.py`: points, streaks, levels, badges, mission, habit leaderboard and value ledger.
- `app/store.py`: in-memory state. `POST /api/admin/reset` resets it (a demo helper that is not in the contract).

## Finishing live integrations

1. Anumati: confirm the paths in `anumati/client.py`. Then implement `build_key_material()`, `decrypt_fi_payload()` and `verify_jws()` using the provider's documented library. These raise `NotImplementedError` on purpose (we do not hand-roll crypto), so live FI fetch falls back to replay until they are done.
2. Perfios: confirm the header names in `perfios/_http.py` and the paths in `analytics.py`, `bsa.py` and `hub.py`. Then map the real analytics fields in `map_analytics()`.
3. BSA is **blocked**. Its initiate call asks for loan fields, so it needs Perfios to approve a non-lending configuration.
4. Logs carry only request ids and status codes. No endpoint ever returns keys.

## Contract notes (ambiguities resolved)

- **`River.gap`**: this is the shortfall on the **first deficit day**, not `max(0, -min_balance)`. For household A that is ₹3,000 on 28 Sep, which matches the hero card and `gap_before`. `min_balance` and `min_date` still report the true lowest point (−₹3,500 on 29 Sep), because essentials keep running after the deficit starts. `simulate.gap_before` and `gap_after` use the same definition.
- **River window**: 30 points, from `as_of` (day 0, the closing balance) to as_of+29 (23 Sep → 22 Oct).
- **Order of money within a day**: essentials first, then scheduled debits, then credits (salary lands at end of day), then any debit the user **moved** onto that day. A fee moved onto salary day is therefore paid after the credit.
- **Safe to spend**: lowest projected balance before the next salary, minus the safety floor, never below 0. Gig households have no payday, so they use a 14-day window.
- **Resilience days**: (operational balance + idle savings accounts + emergency jar) ÷ (essentials/day + (EMIs + rent + bills)/30), rounded. School fees are not counted as survival spend.
- **Protection metric**: `value` is `null` (unit `"status"`). "Unknown" health (Ayushman eligibility not checked) is shown as `health: false` with an explanatory `note`.
- **Tier 2 "protected obligation on deficit day"**: when the deficit is within 14 days, this is folded into the tier-1 deficit card rather than shown as a duplicate.
- **`POST /api/consent/dpdp`** returns `grants` as a map of every DPDP key to a boolean. `GET /passport` returns the full `DpdpGrant[]` list.
- **Replay consent**: `redirect_url` is a placeholder (`https://sandbox.anumati.replay/...`). The UI should call `approve-sandbox`, or poll status twice, which auto-approves on the second poll.
- **Revoke**: marks the consent REVOKED and wipes derived analytics, open actions and correction overlays for that household. The dashboard keeps working from the fixture so the demo can continue. If no ACTIVE consent remains for the household, `data_source.mode` becomes `"fixture"`. Before any revoke, households start in `"replay"` with a seeded ACTIVE consent.
- **`/correct`** supports these fields: `monthly_income`, `essentials_per_day`, `safety_floor`, `closing_balance`, `salary_date`, `event:<id>.date`, `event:<id>.amount`, `member:<id>.life`, `member:<id>.health`. Anything else returns 422. Corrections are overlays, and the fixture is never rewritten. `/correct` does **not** award points; the UI should also send a `correction` game event.
- **Game**: `task_done` does not remove the NBA card; it records an open action. Badge rules:
  - `task_done` with a ref containing `lender`/`loan` unlocks Karz Mukti.
  - `protection_check` unlocks Suraksha Kavach.
  - An emergency jar of at least 30 days of essentials unlocks 30 Din ka Bachav.
  - 75 family habits unlock Parivaar Champion.
  - Checkin gives points once per real calendar day, and the streak continues from "yesterday".
- **Ask**: `tag` is always `"jaankari"`. If `ANTHROPIC_API_KEY` is set, Claude (`ANTHROPIC_MODEL`, default `claude-sonnet-5`) only rephrases the answer. Any rephrase that drops or changes a number is thrown away.
- **Scheme facts** (PMJJBY ₹436/yr for ₹2 lakh, PMSBY ₹20/yr) must be re-checked on jansuraksha.gov.in before the demo. The RBI DLA list in `e04_debt.py` is a small local snapshot.
