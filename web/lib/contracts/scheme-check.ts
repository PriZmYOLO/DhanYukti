/**
 * Government protection check (Jan Suraksha: PMJJBY + PMSBY) released to
 * the member who linked the accounts. Facts come from their own
 * Account Aggregator data; nothing here is a recommendation to buy private
 * insurance. Unknown is never "not enrolled".
 */
import type { IsoDate, IsoTimestamp, MoneyPaise } from "@/lib/contracts/common";
import type { ExistingCover } from "@/lib/contracts/insurance-cover";

export type SchemeId = "pmjjby" | "pmsby";

/**
 * - premium_seen: a premium debit for this scheme is in the linked data.
 * - not_seen: the data covers the yearly renewal window and has no premium
 *   debit for this scheme (it may still be paid from another account).
 * - outside_age: the holder's age is outside the joining band.
 * - unknown: the data can't answer (renewal window not covered).
 */
export type SchemeStatus =
  "premium_seen" | "not_seen" | "outside_age" | "unknown";

export interface SchemeEvidence {
  account_label: string;
  date: IsoDate;
  amount: MoneyPaise;
}

export interface SchemeFinding {
  scheme: SchemeId;
  status: SchemeStatus;
  /** Official annual premium and cover (Department of Financial Services). */
  annual_premium: MoneyPaise;
  cover: MoneyPaise;
  /** Joining age band, e.g. [18, 50] for PMJJBY. */
  join_age: [number, number];
  evidence: SchemeEvidence | null;
}

export type SchemeCheckResult =
  | {
      status: "ready";
      checked_at: IsoTimestamp;
      /** Period of transactions that was checked (earliest to latest). */
      data_from: IsoDate | null;
      data_to: IsoDate | null;
      /** Holder's age from the bank profile; null = not shared. */
      holder_age: number | null;
      renewal_window_checked: { from: IsoDate; to: IsoDate } | null;
      findings: SchemeFinding[];
      /** Schemes to suggest, public before private. Empty = nothing to do. */
      suggest: SchemeId[];
      suggest_total_premium: MoneyPaise | null;
      suggest_total_cover: MoneyPaise | null;
      /** When premium_seen: the next auto-debit to keep money for. */
      next_renewal_by: IsoDate;
      is_sandbox: boolean;
      /** Private premiums seen in the same data, plus the member's tags. */
      existing_cover?: ExistingCover;
    }
  /** The member didn't allow alerts and suggestions for this source. */
  | { status: "not_allowed" }
  /** No usable data yet (still processing, failed, revoked…). */
  | { status: "no_data" }
  | { status: "unavailable"; safe_message: string };
