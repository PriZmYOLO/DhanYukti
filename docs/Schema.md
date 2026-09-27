# Data schema

Prototype uses an in-memory store; production maps 1:1 to Supabase Postgres with row-level security per household and per viewer.

## Financial core (derived features only — raw AA payload deleted < 24 h)
| Table | Key fields |
|---|---|
| `household` | id, family_name, city, language, literacy_mode, safety_floor_paise |
| `member` | id, household_id, name, role, earner, avatar, sharing (`poora` / `sirf_total` / `private`) |
| `account` | id, member_id, fip, masked_no, type, source (`aa` / `declared`) |
| `transaction` | id, account_id, date, narration, amount_paise, category, source, perfios_category |
| `income_source` | id, member_id, kind (`salary` / `gig` / `cash`), payer, amount_paise, day_of_month, range_min/max |
| `obligation` | id, household_id, kind (`fee` / `bill` / `emi` / `rent` / `premium`), amount_paise, due_date, protected, movable |
| `correction` | id, household_id, field, value, created_by, created_at — overlay, never rewrites source |
| `snapshot` | id, household_id, as_of, twin_json, engine_version |

## Consent
| Table | Key fields |
|---|---|
| `source_consent` (AA) | handle, member_id, aa=`Anumati`, status, purpose, fi_types[], range_months, fetch, expiry, created_at, revoked_at |
| `context_version` (DPDP) | household_id, key (`profile` / `device_signals` / `ration` / `electricity` / `rc` / `epf`), granted, granted_at, revoked_at |
| `viewer_grant` | member_id, viewer_id, level |

## Actions & outcomes
| Table | Key fields |
|---|---|
| `action` | id, household_id, nba_id, type, state (`proposed` / `confirmed` / `handed_off` / `done` / `failed`), evidenced |
| `value_ledger` | id, household_id, date, what, amount_paise, evidenced |

## Game (separate — never touches money tables)
| Table | Key fields |
|---|---|
| `points_ledger` | id, member_id, event, delta, created_at |
| `streak` | member_id, current, last_checkin, shields_left |
| `jar` | id, household_id, kind, name, goal_paise, saved_paise |
| `mission` | id, household_id, title, target, progress, month |
| `badge_award` | member_id, badge_id, awarded_at |

Levels: Beej 0 · Ankur 200 · Paudha 500 · Ped 1000 · Bargad 2000 points.
