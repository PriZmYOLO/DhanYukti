/**
 * PROVISIONAL released DecisionPacket (Guide §3 "Decisions", §12, §20–23;
 * Task Packs p.4). Amma owns the rules (M02/M03/M09), Harshal the viewer
 * release (H04/H09). Replace with H01 generated types.
 *
 * The frontend renders these values as returned. It never recalculates,
 * reranks, fills in missing figures or writes its own explanations of money.
 * Free-text fields are released by the backend and must not contain amounts
 * that are not also present as typed MoneyPaise fields.
 */
import type {
  ErrorEnvelope,
  IsoDate,
  MoneyPaise,
} from "@/lib/contracts/common";

/** Need tiers from Guide §20. null until the Priority engine has ranked it. */
export type NeedTier =
  | "essential"
  | "contractual"
  | "protection"
  | "protected_goal"
  | "discretionary";

/** "not_assessed" until E16 Confidence and Freshness is connected. */
export type ConfidenceLevel =
  "high" | "medium" | "low" | "insufficient_evidence" | "not_assessed";

/** Claim-level confidence (Guide §23). Never averaged across domains. */
export interface Confidence {
  level: ConfidenceLevel;
  /** Plain-language basis for the level, e.g. what evidence it rests on. */
  basis: string | null;
}

export interface Horizon {
  start: IsoDate;
  end: IsoDate;
}

export interface DatedAmount {
  amount: MoneyPaise;
  on: IsoDate;
}

/**
 * E03 cash-flow findings over a stated horizon (Guide §12).
 *
 * Sign conventions: `first_deficit.amount` is a positive shortfall;
 * `minimum_cash.amount` is a signed balance (negative when overdrawn);
 * `floor` is non-negative; `gap_to_floor` is the positive amount by which the
 * minimum falls below the floor, and zero or negative when the floor holds.
 */
export interface CashFlowFindings {
  horizon: Horizon;
  first_deficit: DatedAmount | null;
  minimum_cash: DatedAmount;
  floor: MoneyPaise;
  gap_to_floor: MoneyPaise;
}

/** A released reason. `code` is stable; `text` is plain language. */
export interface Reason {
  code: string;
  text: string;
}

export interface Need {
  need_id: string;
  tier: NeedTier | null;
  title: string;
  summary: string;
  deadline: IsoDate | null;
  cash_flow: CashFlowFindings | null;
  reasons: Reason[];
  assumptions: string[];
  /** fact_ids from the viewer's projection this need relies on. */
  evidence_refs: string[];
  confidence: Confidence;
}

/**
 * Consequence of waiting (Guide §21). A cash gap is a shortfall, not money
 * lost. A rupee `cost` is only released when the terms support it.
 */
export type ConsequenceKind = "cash_gap" | "deadline" | "exposure" | "cost";

export interface Consequence {
  kind: ConsequenceKind;
  horizon: Horizon;
  /** Positive magnitude of the shortfall or cost; null when not known. */
  amount: MoneyPaise | null;
  on: IsoDate | null;
  /** Released plain-language statement of what happens, if any. */
  description: string | null;
  /** How the engine reached it, in words. */
  formula: string | null;
  evidence_refs: string[];
}

/** The governed action catalogue (Guide §21 step 1). */
export type ActionKind =
  | "verify_fact"
  | "reserve_in_plan"
  | "draft_request"
  | "review_debt"
  | "check_protection"
  | "explore_referral"
  | "run_scenario";

/**
 * High-stakes and privacy gate result (Guide §21 step 4, §24), evaluated for
 * the chosen proposal and for each alternative. A candidate whose gate is
 * "unavailable" is shown as unavailable, never as a step to take.
 */
export type GateDisposition =
  | "proceed_to_user_confirmation"
  | "ask"
  | "scenario_only"
  | "refer"
  | "unavailable";

export interface ActionCandidate {
  action_id: string;
  kind: ActionKind;
  title: string;
  summary: string;
  /** Expected effect in words. Rupee effects need supported terms. */
  effect: string | null;
  /** What the step depends on, e.g. another party agreeing. */
  conditional_on: string | null;
  /** true: can be undone; false: cannot; null: not assessed. */
  reversible: boolean | null;
  gate: GateDisposition;
}

/** Only "proposed" exists before the action service (Y08/H09, L08). */
export type ActionStatus = "proposed";

export interface ActionProposal extends ActionCandidate {
  need_id: string;
  status: ActionStatus;
  alternatives: ActionCandidate[];
}

/** An action is either released for this viewer or explicitly unavailable. */
export type ActionRelease =
  | { status: "released"; proposal: ActionProposal }
  | { status: "unavailable"; reason: string };

/** E03 safe-to-spend (Guide §12). Never shown without its horizon. */
export type SafeToSpendRelease =
  | {
      status: "released";
      amount: MoneyPaise;
      horizon: Horizon;
      floor: MoneyPaise;
      limitations: string[];
    }
  | { status: "insufficient_evidence"; reason: string }
  | { status: "not_released"; reason: string };

/** A fact that is not known (Guide §23 "decisive missing facts"). */
export interface MissingFact {
  fact_key: string;
  question: string;
  why: string | null;
  /** true if it could change this decision; null if not assessed. */
  decisive: boolean | null;
}

export interface DecisionVersions {
  snapshot_version: string;
  consent_version: string;
  constitution_version: string;
  rule_version: string;
}

/**
 * Whether a priority was released (E13). The absence of a need is always
 * explained: only "none_found" may be shown as nothing needing attention, and
 * only with its basis. Withholding a need that rests on another member's
 * private facts is "not_released", never "none_found".
 */
export type PriorityRelease =
  | { status: "released"; need: Need }
  | { status: "none_found"; basis: string }
  | { status: "insufficient_evidence"; reason: string }
  | { status: "not_released"; reason: string };

export interface DecisionPacket {
  packet_id: string;
  snapshot_id: string;
  as_of: IsoDate;
  versions: DecisionVersions;
  priority: PriorityRelease;
  /** Consequence of delay for the released need; null without one. */
  consequence: Consequence | null;
  action: ActionRelease;
  safe_to_spend: SafeToSpendRelease;
  missing_facts: MissingFact[];
}

/**
 * Whether a decision could be released for this viewer at all. An
 * unavailable decision is never shown as "nothing needs attention".
 */
export type DecisionRelease =
  | { status: "released"; packet: DecisionPacket }
  | { status: "unavailable"; reason: string; error: ErrorEnvelope | null };
