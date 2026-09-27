# Family cover engine (health, life, accident)

DhanYukti's insurance decision engine. It works out what cover each part of
a family needs, what it already has, and the gap, then writes a **cover
specification** the family takes to IRDAI's Bima Sugam marketplace or any
insurer. It never names, ranks or prices a product.

## Why it stops at a specification

IRDAI defines an insurance web aggregator as an intermediary that "maintains
a website for providing interface to the insurance prospects for price
comparison and information of products of different insurers", and that
needs IRDAI registration. So showing and ranking named plans from different
insurers is regulated distribution. DhanYukti stays on the needs side of
that line: it decides _what to insist on_, the market (Bima Sugam, insurers)
supplies _who offers it_.

## The firewall

- The engine's inputs have **no insurer names, products, prices or
  commissions**. Policy and member ids must be opaque (`c1`, `m1`); the
  profile store rejects anything else. A fixture asserts the output never
  contains an insurer name.
- **Deterministic and versioned** (`RULESET_VERSION`): the same inputs give
  the same result. Each run's input is hashed (sha256) and receipted in the
  Value Ledger (`engine_run`), so any result can be reproduced and audited.
- Every line names the rules that produced it ("Why this?"), and the rule
  values are shown as assumptions.
- Public schemes (PMSBY, PMJJBY, Ayushman Vay Vandana for 70+) always come
  first. DhanYukti earns nothing from anything it shows.

## Rules (`lib/server/engines/cover/engine.ts`)

DhanYukti defaults from common planning practice, not IRDAI rules; shown to
the family as assumptions and easy to change in one place.

| Rule  | What it does                                                                                                            |
| ----- | ----------------------------------------------------------------------------------------------------------------------- |
| H1    | Family floater (self, spouse, children) base: metro ₹10L, tier-2 ₹7L, smaller town ₹5L                                  |
| H2    | +₹2.5L per person above 4 in the floater                                                                                |
| H3/H4 | Parents get their own policy (not the family floater), same base by city                                                |
| H5    | A policy closes a gap only if it covers everyone in the unit; the unit has what its least-covered member has            |
| H6    | Employer group cover is shown, not counted (ends with the job)                                                          |
| L1    | Life need = spending × years until the youngest child is 25 (min 10) + loans − savings, split between earners by income |
| L2    | Spending not told → 10 × income + share of loans                                                                        |
| L3    | No dependants and no loans → life cover not needed now                                                                  |
| L4    | Term cover runs to at least 60, at most 70                                                                              |
| A1    | Accident cover ≈ 5 × yearly income (PMSBY counts; motor PA doesn't)                                                     |
| P1/P2 | Public schemes first; then family health, parents' health, earners' life, accident                                      |
| S1    | Spec sum insured = gap rounded up (health/accident ₹1L, life ₹5L)                                                       |

Unknown stays unknown: a missing city, age, income or sum insured makes that
line "Can't tell yet" and lists what to add. Nothing is guessed as zero.

Health conditions (optional, own DPDP consent) add "disclose every
condition" and the 5-year moratorium note, and the family's filter for the
longest pre-existing-disease wait (IRDAI's maximum is 36 months since 2024).

## Consent and data

| DPDP purpose        | Data                                                                                             | On withdraw                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `cover_profile`     | relations, ages, incomes, city, spending, loans, savings, cover held (no insurer names), filters | profile and conditions deleted; conditions consent withdrawn with its own receipt |
| `health_conditions` | yes/no flags per member                                                                          | conditions deleted                                                                |

Policies found in linked bank data (Job 2a) can be added with one tap; only
the kind, who it covers and the sum insured go into the profile.

## Files

- Contract: `lib/contracts/cover-engine.ts`
- Engine (pure): `lib/server/engines/cover/engine.ts`
- Store + validation + input hash: `lib/server/engines/cover/store.ts`
- Routes: `GET/PUT /api/engine/cover/profile`, `POST /api/engine/cover/run`,
  `GET /api/engine/cover/prefill`
- Screens: `/plan`, `/plan/insurance` (`components/plan/*`, wording in
  `lib/plan/copy.ts`)
- Golden fixtures: `npm run test:engine` (15 checks, incl. the team's
  example household worked out by hand). Browser: `tests/e2e/cover.spec.ts`.

## Next steps (not built)

1. **Insurance data over AA**: insurers share policy data as AA FI types
   (Insurance Policies, Life_Insurance, General_Insurance; 59 insurers on the
   network per Sahamati, May 2026). That gives sum insured and insured members
   directly instead of asking. Needs Anumati sandbox support.
2. **Bima Sugam handoff API** when IRDAI opens one (transactions expected from
   late September 2026, motor first).
3. **Explanations in Hindi** via Bhashini; an LLM may reword explanations but
   never changes a number or a rule.
4. Amma's decision engine can read the same `CoverPlan` to rank insurance
   against other household priorities on Home.
