/**
 * PROVISIONAL shapes for scenario previews (H08 over H06 routes; E03 cash
 * flow, E08 responses, E09 goals, E10 affordability). Hand-written until the
 * backend publishes schemas; field names are snake_case so the swap stays
 * mechanical.
 *
 * A scenario is a copy-on-write branch of one baseline snapshot (Guide §12
 * step 6). Nothing here changes the live plan.
 */
import type {
  ErrorEnvelope,
  IsoDate,
  MoneyPaise,
} from "@/lib/contracts/common";
import type { DatedAmount, Horizon } from "@/lib/contracts/decision-packet";

/**
 * The bounded inputs this build can preview. The UI offers only these; there
 * are no free-text amounts. A real adapter maps each onto a change set.
 */
export type ScenarioPresetId =
  | "emergency"
  | "emergency_fee_delay"
  | "cash_purchase"
  | "loan_purchase"
  | "goal_funding"
  | "hidden_asset"
  | "no_provider";

export interface ScenarioPreset {
  preset_id: ScenarioPresetId;
  /** The typed amount the preset applies, if it has one. */
  amount: MoneyPaise | null;
  /** The date it applies on, if it has one. */
  on: IsoDate | null;
  /** A response preset only makes sense on top of this one. */
  requires: ScenarioPresetId | null;
}

/** E03 daily closing cash (the shape requested from E03 for Home). */
export interface DailyClosingCash {
  date: IsoDate;
  /** Signed; negative when overdrawn. Never clamped at zero. */
  closing_cash: MoneyPaise;
}

/**
 * E03 findings for one run over the stated horizon. Same sign conventions as
 * `CashFlowFindings`: `first_deficit.amount` is a positive shortfall,
 * `minimum_cash.amount` is signed, `gap_to_floor` is positive when the
 * minimum is below the floor.
 */
export interface ScenarioCashFlow {
  horizon: Horizon;
  /** One entry per horizon date, in order. */
  daily: DailyClosingCash[];
  first_deficit: DatedAmount | null;
  minimum_cash: DatedAmount;
  floor: MoneyPaise;
  gap_to_floor: MoneyPaise;
}

/** One change applied in the scenario, as released (words + typed values). */
export interface ScenarioChange {
  label: string;
  direction: "out" | "in" | "moved" | "none";
  amount: MoneyPaise | null;
  on: IsoDate | null;
  /** For a moved date: where it was in the live plan. */
  moved_from: IsoDate | null;
  /**
   * "conditional": depends on someone outside the household agreeing (e.g.
   * the school). It is never an accepted new date.
   */
  certainty: "applied" | "conditional";
}

/** E09 goal arithmetic. Earmarks are not extra assets. */
export interface GoalFunding {
  goal_id: string;
  label: string;
  target: MoneyPaise;
  earmarked: MoneyPaise;
  /** Still to fund before any planned contribution. */
  gap_before: MoneyPaise;
  contribution: {
    each: MoneyPaise;
    count: number;
    total: MoneyPaise;
    /** Plain words; no amounts. */
    timing: string;
  };
  /** Still to fund after the feasible contributions. */
  gap_after: MoneyPaise;
}

/**
 * A purchase on credit. `total_cost` stays null while any term is missing;
 * the UI never shows a definitive total then (Task Pack M08, L07).
 */
export interface LoanPreview {
  borrowed: MoneyPaise;
  total_cost: MoneyPaise | null;
  /** Plain-language names of the terms still needed. */
  missing_terms: string[];
}

interface ScenarioReleaseBase {
  release_id: string;
  /** "baseline" is the live plan's own run. */
  preset_id: ScenarioPresetId | "baseline";
  /** Every compared release must share this and the horizon. */
  baseline_snapshot_id: string;
  horizon: Horizon;
  changes: ScenarioChange[];
  /** Labelled demo data, not a backend result. */
  is_demo: boolean;
}

/**
 * `feasible`: at least one permitted, reversible response (or none) keeps
 * closing cash at or above zero until payday. `no_feasible_option`: none
 * does; the residual is shown and never filled with borrowing (E08).
 */
export interface SimulatedScenario extends ScenarioReleaseBase {
  status: "feasible" | "no_feasible_option";
  cash_flow: ScenarioCashFlow;
  /** What remains unfunded before payday after a response, if one applied. */
  residual_shortfall: { amount: MoneyPaise; before: IsoDate } | null;
  /** Plain words. Contains no amounts: those are typed fields. */
  finding: string;
  assumptions: string[];
  goal: GoalFunding | null;
}

/** No result: a timeout, a missing report or missing terms. Never zero. */
export interface PendingScenario extends ScenarioReleaseBase {
  status: "pending";
  cash_flow: null;
  reason: string;
  error: ErrorEnvelope | null;
  loan: LoanPreview | null;
}

export type ScenarioRelease = SimulatedScenario | PendingScenario;

export type ScenarioStatus = ScenarioRelease["status"];

/** One dated item on the plan's calendar (N06), for the L06 dates list. */
export interface PlanDate {
  item_id: string;
  label: string;
  direction: "in" | "out";
  amount: MoneyPaise | null;
  per: "day" | null;
  on: IsoDate;
  /** Last date of a repeating item; null for a single date. */
  until: IsoDate | null;
  /**
   * "confirmed": a member entered or confirmed the date. "inferred":
   * DhanYukti assumed it; it may be wrong.
   */
  certainty: "confirmed" | "inferred";
  /** Plain words: why it has that certainty. */
  basis: string;
  /** A suggested different date that is not accepted. */
  suggestion: {
    on: IsoDate;
    status: "conditional";
    condition: string;
  } | null;
}

export type PlanDatesRelease =
  | {
      status: "released";
      baseline_snapshot_id: string;
      horizon: Horizon;
      items: PlanDate[];
      is_demo: boolean;
    }
  | { status: "unavailable"; reason: string; error: ErrorEnvelope | null };
