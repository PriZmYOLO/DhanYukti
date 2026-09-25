/**
 * ============================================================
 *  DEMO / FIXTURE DATA — NOT A REAL HOUSEHOLD
 * ============================================================
 *
 * Synthetic golden baseline from the Technical Guide §30 and Task Packs p.22:
 * frozen clock 23 Sep 2026, ₹6,000 cash, ₹500/day essentials on 24–29 Sep,
 * ₹1,500 electricity due 27 Sep, ₹5,000 school fee due 28 Sep, ₹30,000
 * salary on 30 Sep, ₹2,000 agreed floor. The need's figures are the Guide's
 * documented expected E03 results for that input, not values computed here.
 *
 * Only lib/data/* may import this file. UI components receive data through
 * props so the fixture can be swapped for the released backend response.
 *
 * Deliberately partial: no bank connection, debt/protection/goals unknown,
 * the second adult's finances not shared with this viewer (and therefore
 * absent), no ranked tier, no released action and no confidence assessment.
 *
 * Explanation fields (reasons, assumptions, formula, missing facts) and the
 * Health Card statuses and summaries restate the Guide's documented fixture
 * and rules in plain words, written by the frontend team. They add no
 * figures: every amount on Home is one of the nine documented values.
 */
import "server-only";

import type { DecisionPacket } from "@/lib/contracts/decision-packet";
import type { HealthCard } from "@/lib/contracts/health-card";
import type { HouseholdProjection } from "@/lib/contracts/household-projection";

export const FIXTURE_LABEL = "DEMO / FIXTURE DATA";

const inr = (rupees: number) => ({
  amount_paise: rupees * 100,
  currency: "INR" as const,
});

const VIEWER = "fixture-member-a";
const DECLARED = "Entered manually (fixture)";

export const householdProjectionFixture: HouseholdProjection = {
  projection_id: "fixture-projection-001",
  household_id: "fixture-household-001",
  snapshot_id: "fixture-snapshot-001",
  viewer_member_id: VIEWER,
  as_of: "2026-09-23",
  members: [
    {
      member_id: VIEWER,
      display_label: "Adult A (fixture)",
      visibility: "self",
    },
    {
      member_id: "fixture-member-b",
      display_label: "Adult B (fixture)",
      visibility: "not_shared",
    },
  ],
  connections: [
    {
      connection_id: "fixture-connection-aa",
      label: "Bank accounts through Account Aggregator",
      status: "not_connected",
      last_updated_at: null,
    },
  ],
  facts: [
    {
      fact_id: "fixture-fact-cash",
      owner_member_id: VIEWER,
      kind: "cash_balance",
      label: "Cash available",
      amount: inr(6_000),
      per: null,
      effective_on: "2026-09-23",
      source_kind: "declared",
      source_label: DECLARED,
      availability: "present",
    },
    {
      fact_id: "fixture-fact-essentials",
      owner_member_id: VIEWER,
      kind: "essential_spending",
      label: "Daily essentials (24–29 Sep)",
      amount: inr(500),
      per: "day",
      effective_on: "2026-09-24",
      source_kind: "declared",
      source_label: DECLARED,
      availability: "present",
    },
    {
      fact_id: "fixture-fact-electricity",
      owner_member_id: VIEWER,
      kind: "obligation",
      label: "Electricity bill",
      amount: inr(1_500),
      per: null,
      effective_on: "2026-09-27",
      source_kind: "declared",
      source_label: DECLARED,
      availability: "present",
    },
    {
      fact_id: "fixture-fact-school-fee",
      owner_member_id: VIEWER,
      kind: "obligation",
      label: "School fee",
      amount: inr(5_000),
      per: null,
      effective_on: "2026-09-28",
      source_kind: "declared",
      source_label: DECLARED,
      availability: "present",
    },
    {
      fact_id: "fixture-fact-salary",
      owner_member_id: VIEWER,
      kind: "income",
      label: "Salary",
      amount: inr(30_000),
      per: null,
      effective_on: "2026-09-30",
      source_kind: "declared",
      source_label: DECLARED,
      availability: "present",
    },
  ],
  coverage: [
    { domain: "cash", availability: "present" },
    { domain: "income", availability: "present" },
    { domain: "bills", availability: "present" },
    { domain: "debt", availability: "missing" },
    { domain: "protection", availability: "unavailable" },
    { domain: "goals", availability: "missing" },
  ],
};

const HORIZON = { start: "2026-09-23", end: "2026-09-30" };

const EVIDENCE = [
  "fixture-fact-cash",
  "fixture-fact-essentials",
  "fixture-fact-electricity",
  "fixture-fact-school-fee",
  "fixture-fact-salary",
];

export const decisionPacketFixture: DecisionPacket = {
  packet_id: "fixture-packet-001",
  snapshot_id: "fixture-snapshot-001",
  as_of: "2026-09-23",
  versions: {
    snapshot_version: "fixture",
    consent_version: "fixture",
    constitution_version: "fixture",
    rule_version: "fixture",
  },
  priority: {
    status: "released",
    need: {
      need_id: "fixture-need-cash-gap",
      tier: null,
      title: "Cash runs short before salary arrives",
      summary:
        "Planned essentials and bills fall due before the salary date, so cash on hand drops below the agreed floor.",
      deadline: "2026-09-28",
      cash_flow: {
        horizon: HORIZON,
        first_deficit: { amount: inr(3_000), on: "2026-09-28" },
        minimum_cash: { amount: inr(-3_500), on: "2026-09-29" },
        floor: inr(2_000),
        gap_to_floor: inr(5_500),
      },
      reasons: [
        {
          code: "fixture_outflows_before_income",
          text: "Daily essentials, the electricity bill and the school fee all fall due before the salary date.",
        },
        {
          code: "fixture_cash_below_floor",
          text: "The cash entered for 23 Sept does not cover them, so cash drops below the agreed floor until salary arrives.",
        },
      ],
      assumptions: [
        "Only the amounts and dates listed under “Information used” are included. No other money comes in or goes out before 30 Sept.",
        "The agreed floor is a cushion the household has chosen not to spend.",
        "Salary arrives on 30 Sept, as entered.",
      ],
      evidence_refs: EVIDENCE,
      confidence: {
        level: "not_assessed",
        basis:
          "Confidence checks are not connected yet. Every amount here was entered by hand; none came from a bank.",
      },
    },
  },
  consequence: {
    kind: "cash_gap",
    horizon: HORIZON,
    amount: inr(3_000),
    on: "2026-09-28",
    description: null,
    formula:
      "Day by day from 23 to 30 Sept: closing cash = opening cash + money in − money out. A negative balance is carried forward; it is not filled with borrowing.",
    evidence_refs: EVIDENCE,
  },
  action: {
    status: "unavailable",
    reason:
      "No next step has been released for this demo household. Next steps come from DhanYukti's decision engine, which is not connected in this build.",
  },
  safe_to_spend: {
    status: "not_released",
    reason:
      "Not included in this demo data. It will come from the cash-flow engine once it is connected.",
  },
  missing_facts: [
    {
      fact_key: "debt.repayments_due",
      question:
        "Are any loan, credit card or informal repayments due before 30 Sept?",
      why: "Repayments due before salary would change the cash picture shown here.",
      decisive: null,
    },
  ],
};

const NOT_ASSESSED = { level: "not_assessed" as const, basis: null };

export const healthCardFixture: HealthCard = {
  snapshot_id: "fixture-snapshot-001",
  as_of: "2026-09-23",
  domains: [
    {
      domain: "liquidity",
      status: "attention",
      summary: "Cash falls below the agreed floor before salary arrives.",
      confidence: NOT_ASSESSED,
    },
    {
      domain: "debt",
      status: "not_known",
      summary:
        "No loans or money owed have been recorded. That is not the same as having none.",
      confidence: NOT_ASSESSED,
    },
    {
      domain: "income",
      status: "not_assessed",
      summary:
        "Salary has been entered, but how steady income is has not been assessed.",
      confidence: NOT_ASSESSED,
    },
    {
      domain: "protection",
      status: "not_known",
      summary:
        "No insurance source is connected. This does not mean the household has no cover.",
      confidence: NOT_ASSESSED,
    },
    {
      domain: "goals",
      status: "not_known",
      summary: "No goals have been recorded yet.",
      confidence: NOT_ASSESSED,
    },
  ],
};
