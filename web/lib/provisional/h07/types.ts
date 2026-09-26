/**
 * PROVISIONAL — frontend shapes for what L05 needs from H07 (fact
 * corrections, and recalculation after a revoke or an accepted correction).
 *
 * These are NOT the backend contract. They describe only what the L05
 * screens consume. When the backend publishes generated schemas, map them
 * onto these types (or replace these types) inside the adapter; screens stay
 * unchanged. Names are snake_case so that swap stays mechanical.
 */
import type { IsoDate, IsoTimestamp, MoneyPaise } from "@/lib/contracts/common";

/** Which part of a fact the member says is wrong. */
export type CorrectionField = "amount" | "effective_on";

/** A correction is a proposal until the backend decides. */
export type CorrectionStatus = "proposed" | "accepted" | "rejected";

/** The proposed value, typed like the fact it corrects. */
export type ProposedValue =
  | { field: "amount"; amount: MoneyPaise }
  | { field: "effective_on"; effective_on: IsoDate };

export interface FactCorrectionDraft {
  fact_id: string;
  proposed: ProposedValue;
  /** The member's own words; required. */
  reason: string;
}

/**
 * A proposal against one released fact. It carries no copy of the original:
 * screens show the original from the released picture, beside the proposal,
 * so the fact on screen is never overwritten by what was proposed.
 */
export interface FactCorrection {
  correction_id: string;
  fact_id: string;
  proposed: ProposedValue;
  reason: string;
  status: CorrectionStatus;
  proposed_at: IsoTimestamp;
  /** When it was accepted or rejected; null while proposed. */
  decided_at: IsoTimestamp | null;
  /** Safe reason from the reviewer; set only when rejected. */
  rejection_reason: string | null;
  is_demo: boolean;
}

export type PictureChangeCause = "source_revoked" | "correction_accepted";

/**
 * Whether this member's household picture is still the one on screen.
 * "recalculating" means every figure computed from it is stale and must not
 * be shown until a new snapshot is released.
 */
export type PictureStatus =
  | { status: "current" }
  | {
      status: "recalculating";
      since: IsoTimestamp;
      causes: PictureChangeCause[];
    };
