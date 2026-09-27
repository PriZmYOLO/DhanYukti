/**
 * ============================================================
 *  DEMO SCENARIO RELEASES — NOT A REAL HOUSEHOLD, NOT A BACKEND
 * ============================================================
 *
 * Written-out stand-ins for the scenario service's results, mirroring the
 * Technical Guide §30 golden fixtures (same household as Home's fixture):
 * frozen clock 23 Sep 2026, ₹6,000 cash, ₹500/day essentials on 24–29 Sep,
 * ₹1,500 electricity due 27 Sep, ₹5,000 school fee due 28 Sep, ₹30,000
 * salary on 30 Sep, ₹2,000 agreed floor. Nothing here is computed at run
 * time; every figure is a literal.
 *
 * Documented §30 values (tests assert each one):
 *   baseline   first deficit 3,000 on 28; minimum −3,500 on 29; gap 5,500
 *   emergency  +4,000 on 26: first deficit 1,500 on 27; minimum −7,500 on 29
 *   fee delay  after the emergency, fee moved to 30: 2,500 unfunded before payday
 *   purchase   2,000 on 24: minimum −5,500
 *   goal       15,000 − 5,000 − 2 × 3,000 = 4,000 gap
 *   hidden     a locked/private asset adds no shared cash
 *   provider   a timeout is pending, never zero
 *
 * The other figures (each day's closing cash, the purchase's first deficit,
 * gaps for the shock cases, the 30 Sep closing) are not printed in §30. They
 * were worked out by hand from the §30 inputs with the Guide §12 rule
 * (closing = opening + in − out, negatives carried, nothing borrowed) and
 * agree with every documented value. Replace this file with engine output.
 */
import type { MoneyPaise } from "@/lib/contracts/common";
import type {
  PendingScenario,
  PlanDatesRelease,
  ScenarioCashFlow,
  ScenarioPreset,
  ScenarioPresetId,
  ScenarioRelease,
  SimulatedScenario,
} from "@/lib/provisional/h08/types";

const inr = (rupees: number): MoneyPaise => ({
  amount_paise: rupees * 100,
  currency: "INR",
});

const SNAPSHOT = "fixture-snapshot-001";
const HORIZON = { start: "2026-09-23", end: "2026-09-30" };
const PAYDAY = "2026-09-30";
const FLOOR = inr(2_000);

const DATES = [
  "2026-09-23",
  "2026-09-24",
  "2026-09-25",
  "2026-09-26",
  "2026-09-27",
  "2026-09-28",
  "2026-09-29",
  "2026-09-30",
];

/** Pairs eight written-out closing balances (rupees) with 23–30 Sep. */
const daily = (rupees: readonly number[]) =>
  DATES.map((date, index) => ({ date, closing_cash: inr(rupees[index]) }));

const BASELINE_CASH: ScenarioCashFlow = {
  horizon: HORIZON,
  daily: daily([6_000, 5_500, 5_000, 4_500, 2_500, -3_000, -3_500, 26_500]),
  first_deficit: { amount: inr(3_000), on: "2026-09-28" },
  minimum_cash: { amount: inr(-3_500), on: "2026-09-29" },
  floor: FLOOR,
  gap_to_floor: inr(5_500),
};

const BASE_ASSUMPTIONS = [
  "Only the amounts and dates in your plan are included. No other money comes in or goes out before 30 Sept.",
  "A negative balance is carried forward. It is never filled with borrowing.",
];

const EMERGENCY_CHANGE = {
  label: "Emergency expense",
  direction: "out",
  amount: inr(4_000),
  on: "2026-09-26",
  moved_from: null,
  certainty: "applied",
} as const;

const base = {
  baseline_snapshot_id: SNAPSHOT,
  horizon: HORIZON,
  is_demo: true,
} as const;

const baseline: SimulatedScenario = {
  ...base,
  release_id: "demo-scenario-baseline",
  preset_id: "baseline",
  status: "feasible",
  changes: [],
  cash_flow: BASELINE_CASH,
  residual_shortfall: null,
  finding:
    "Your plan as it is: essentials and bills fall due before salary arrives.",
  assumptions: BASE_ASSUMPTIONS,
  goal: null,
};

const emergency: SimulatedScenario = {
  ...base,
  release_id: "demo-scenario-emergency",
  preset_id: "emergency",
  status: "no_feasible_option",
  changes: [EMERGENCY_CHANGE],
  cash_flow: {
    horizon: HORIZON,
    daily: daily([6_000, 5_500, 5_000, 500, -1_500, -7_000, -7_500, 22_500]),
    first_deficit: { amount: inr(1_500), on: "2026-09-27" },
    minimum_cash: { amount: inr(-7_500), on: "2026-09-29" },
    floor: FLOOR,
    gap_to_floor: inr(9_500),
  },
  residual_shortfall: null,
  finding: "Cash runs short a day earlier and falls further before payday.",
  assumptions: [
    ...BASE_ASSUMPTIONS,
    "The emergency is paid in full on the day it happens.",
  ],
  goal: null,
};

const feeDelay: SimulatedScenario = {
  ...base,
  release_id: "demo-scenario-emergency-fee-delay",
  preset_id: "emergency_fee_delay",
  status: "no_feasible_option",
  changes: [
    EMERGENCY_CHANGE,
    {
      label: "School fee",
      direction: "moved",
      amount: inr(5_000),
      on: PAYDAY,
      moved_from: "2026-09-28",
      certainty: "conditional",
    },
  ],
  cash_flow: {
    horizon: HORIZON,
    daily: daily([6_000, 5_500, 5_000, 500, -1_500, -2_000, -2_500, 22_500]),
    first_deficit: { amount: inr(1_500), on: "2026-09-27" },
    minimum_cash: { amount: inr(-2_500), on: "2026-09-29" },
    floor: FLOOR,
    gap_to_floor: inr(4_500),
  },
  residual_shortfall: { amount: inr(2_500), before: PAYDAY },
  finding:
    "Moving the school fee to salary day narrows the shortfall but does not close it. The crisis is not solved.",
  assumptions: [
    ...BASE_ASSUMPTIONS,
    "The school has not agreed to a later date. This only shows what would happen if it did.",
  ],
  goal: null,
};

const cashPurchase: SimulatedScenario = {
  ...base,
  release_id: "demo-scenario-cash-purchase",
  preset_id: "cash_purchase",
  status: "no_feasible_option",
  changes: [
    {
      label: "Purchase paid from cash",
      direction: "out",
      amount: inr(2_000),
      on: "2026-09-24",
      moved_from: null,
      certainty: "applied",
    },
  ],
  cash_flow: {
    horizon: HORIZON,
    daily: daily([6_000, 3_500, 3_000, 2_500, 500, -5_000, -5_500, 24_500]),
    first_deficit: { amount: inr(5_000), on: "2026-09-28" },
    minimum_cash: { amount: inr(-5_500), on: "2026-09-29" },
    floor: FLOOR,
    gap_to_floor: inr(7_500),
  },
  residual_shortfall: null,
  finding:
    "Paying now deepens the shortfall before payday. It is counted once, on the day it is paid.",
  assumptions: BASE_ASSUMPTIONS,
  goal: null,
};

const loanPurchase: PendingScenario = {
  ...base,
  release_id: "demo-scenario-loan-purchase",
  preset_id: "loan_purchase",
  status: "pending",
  changes: [
    {
      label: "Purchase on a loan",
      direction: "none",
      amount: inr(2_000),
      on: "2026-09-24",
      moved_from: null,
      certainty: "applied",
    },
  ],
  cash_flow: null,
  reason:
    "The repayments depend on loan terms we do not have, so the effect on your cash is not worked out.",
  error: null,
  loan: {
    borrowed: inr(2_000),
    total_cost: null,
    missing_terms: [
      "Interest rate and how it is charged",
      "Processing and other fees",
      "Number and dates of repayments",
    ],
  },
};

const goalFunding: SimulatedScenario = {
  ...base,
  release_id: "demo-scenario-goal-funding",
  preset_id: "goal_funding",
  status: "feasible",
  changes: [],
  cash_flow: BASELINE_CASH,
  residual_shortfall: null,
  finding:
    "The contributions come from salaries after this horizon, so cash before payday is unchanged.",
  assumptions: [
    "Money already set aside for the goal is not extra cash; it is not counted twice.",
  ],
  goal: {
    goal_id: "demo-goal-001",
    label: "Savings goal (demo)",
    target: inr(15_000),
    earmarked: inr(5_000),
    gap_before: inr(10_000),
    contribution: {
      each: inr(3_000),
      count: 2,
      total: inr(6_000),
      timing: "From the next two salaries, after 30 Sept",
    },
    gap_after: inr(4_000),
  },
};

const hiddenAsset: SimulatedScenario = {
  ...base,
  release_id: "demo-scenario-hidden-asset",
  preset_id: "hidden_asset",
  status: "feasible",
  changes: [
    {
      label: "A locked or private asset",
      direction: "none",
      amount: null,
      on: null,
      moved_from: null,
      certainty: "applied",
    },
  ],
  cash_flow: BASELINE_CASH,
  residual_shortfall: null,
  finding:
    "Shared available cash is unchanged. A locked or private asset is not money the household can spend before payday.",
  assumptions: BASE_ASSUMPTIONS,
  goal: null,
};

const noProvider: PendingScenario = {
  ...base,
  release_id: "demo-scenario-no-provider",
  preset_id: "no_provider",
  status: "pending",
  changes: [],
  cash_flow: null,
  reason:
    "A source did not respond in time, so this result is still pending. Nothing has been assumed in its place.",
  error: {
    request_id: "demo-timeout-001",
    code: "provider_timeout",
    safe_message:
      "A source did not respond in time, so this result is still pending. Nothing has been assumed in its place.",
    retryable: true,
  },
  loan: null,
};

export const DEMO_BASELINE: ScenarioRelease = baseline;

export const DEMO_RELEASES: Record<ScenarioPresetId, ScenarioRelease> = {
  emergency,
  emergency_fee_delay: feeDelay,
  cash_purchase: cashPurchase,
  loan_purchase: loanPurchase,
  goal_funding: goalFunding,
  hidden_asset: hiddenAsset,
  no_provider: noProvider,
};

export const DEMO_PRESETS: ScenarioPreset[] = [
  {
    preset_id: "emergency",
    amount: inr(4_000),
    on: "2026-09-26",
    requires: null,
  },
  {
    preset_id: "emergency_fee_delay",
    amount: inr(5_000),
    on: PAYDAY,
    requires: "emergency",
  },
  {
    preset_id: "cash_purchase",
    amount: inr(2_000),
    on: "2026-09-24",
    requires: null,
  },
  {
    preset_id: "loan_purchase",
    amount: inr(2_000),
    on: "2026-09-24",
    requires: null,
  },
  { preset_id: "goal_funding", amount: null, on: null, requires: null },
  { preset_id: "hidden_asset", amount: null, on: null, requires: null },
  { preset_id: "no_provider", amount: null, on: null, requires: null },
];

export const DEMO_PLAN_DATES: PlanDatesRelease = {
  status: "released",
  baseline_snapshot_id: SNAPSHOT,
  horizon: HORIZON,
  is_demo: true,
  items: [
    {
      item_id: "demo-date-essentials",
      label: "Daily essentials",
      direction: "out",
      amount: inr(500),
      per: "day",
      on: "2026-09-24",
      until: "2026-09-29",
      certainty: "inferred",
      basis:
        "Spread across these days from a per-day amount. The actual spending days may differ.",
      suggestion: null,
    },
    {
      item_id: "demo-date-electricity",
      label: "Electricity bill",
      direction: "out",
      amount: inr(1_500),
      per: null,
      on: "2026-09-27",
      until: null,
      certainty: "confirmed",
      basis: "Due date entered by a household member.",
      suggestion: null,
    },
    {
      item_id: "demo-date-school-fee",
      label: "School fee",
      direction: "out",
      amount: inr(5_000),
      per: null,
      on: "2026-09-28",
      until: null,
      certainty: "confirmed",
      basis: "Due date entered by a household member.",
      suggestion: {
        on: PAYDAY,
        status: "conditional",
        condition:
          "Only if the school agrees. Your plan keeps the original date until it does.",
      },
    },
    {
      item_id: "demo-date-salary",
      label: "Salary",
      direction: "in",
      amount: inr(30_000),
      per: null,
      on: PAYDAY,
      until: null,
      certainty: "confirmed",
      basis: "Pay date entered by a household member.",
      suggestion: null,
    },
  ],
};
