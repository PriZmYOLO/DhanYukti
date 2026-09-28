/**
 * "Confirm your bills" (E02 with a consent step) and the member's own
 * 30-day outlook (a light E03 → E05 → E14 over confirmed items only).
 *
 * The machine suggests, the member decides, and nothing is projected from
 * a guess: only items the member confirmed (or fixed) enter the outlook.
 * Every number is worked out on the server from the member's own linked
 * bank data. No transactions or narrations leave it, only a payee label.
 * Unknown is never zero.
 */
import type { IsoDate, IsoTimestamp, MoneyPaise } from "./common";

export type Cadence = "monthly" | "quarterly" | "yearly";

export type BillCategory =
  | "salary"
  | "rent"
  | "emi"
  | "utility"
  | "school_fee"
  | "insurance"
  | "scheme"
  | "other";

export type Confidence = "high" | "medium" | "low";

/**
 * A money movement that repeats, found in the member's own data. Stored
 * with the derived summary (at most 30 days); next dates are worked out
 * when read, from the anchors here.
 */
export interface DetectedSeries {
  /** Stable for the same payee and direction: "rb_" + 10 hex. */
  id: string;
  kind: "income" | "bill";
  payee_label: string;
  category: BillCategory;
  cadence: Cadence;
  /** Median of the matching payments. */
  typical_amount: MoneyPaise;
  /** Usual day of the month (1–31); null for yearly scheme renewals. */
  typical_day: number | null;
  first_date: IsoDate;
  last_date: IsoDate;
  /** Last date the bank data covers for these accounts. */
  data_to: IsoDate;
  account_labels: string[];
  evidence: {
    /** Payments that matched (within 15% of the median). */
    occurrences: number;
    months_seen: number;
    /** Largest distance from the median, % of it (0 = always the same). */
    amount_spread_pct: number;
    /** Share of gaps between payments that fit the rhythm, %. */
    rhythm_regular_pct: number | null;
    /**
     * repeats: the payments themselves show the rhythm.
     * scheme_rule: PMJJBY/PMSBY seen once; the scheme renews every year by 31 May.
     */
    basis: "repeats" | "scheme_rule";
  };
  confidence: Confidence;
}

export type EverydaySpend =
  | {
      status: "known";
      /** Median over complete months of debits that are not repeating bills. */
      per_month: MoneyPaise;
      months_counted: number;
    }
  | { status: "unknown"; reason: string };

export interface DetectedBills {
  series: DetectedSeries[];
  everyday: EverydaySpend;
  /** Why nothing was found, when nothing was. */
  reason: string | null;
}

export type BillAction = "confirm" | "fix" | "ignore" | "undo";

export interface BillDecision {
  status: "confirmed" | "ignored";
  /** Set when the member fixed the amount. */
  amount: MoneyPaise | null;
  /** Set when the member fixed the day of the month (monthly/quarterly). */
  day: number | null;
  decided_at: IsoTimestamp;
  /** Value Ledger receipt for this decision. */
  receipt_id: string | null;
}

export interface BillItem extends DetectedSeries {
  /** Next date from today, from the rhythm (or the member's fixed day). */
  next_date: IsoDate;
  /**
   * An expected payment is missing inside the data window: it may have
   * stopped. Suggested with low confidence; the member decides.
   */
  may_have_stopped: boolean;
  decision: BillDecision | null;
  /** Amount the outlook uses: the member's fix, else the typical amount. */
  effective_amount: MoneyPaise;
}

export interface EverydayItem {
  id: "everyday";
  estimate: EverydaySpend;
  decision: BillDecision | null;
  /** Per month; null when unknown and not fixed by the member. */
  effective_per_month: MoneyPaise | null;
}

export interface OutlookEvent {
  id: string;
  label: string;
  kind: "income" | "bill";
  /** Signed: credits positive, debits negative. */
  amount: MoneyPaise;
}

export interface OutlookDay {
  date: IsoDate;
  /** Closing balance; may be negative (a shortfall). */
  balance: MoneyPaise;
  events: OutlookEvent[];
}

export type FirstTask =
  | {
      kind: "shortfall";
      date: IsoDate;
      gap: MoneyPaise;
      /** The largest bill due on or just before the shortfall day. */
      bill_label: string | null;
      bill_id: string | null;
      next_income_date: IsoDate | null;
      /** Put aside this much each day from today to cover the gap. */
      per_day: MoneyPaise;
      days_until: number;
    }
  | {
      kind: "build_buffer";
      resilience_days: number;
      /** Per day for 90 days to reach 30 days of cover. */
      per_day: MoneyPaise;
    }
  | { kind: "on_track"; lowest: MoneyPaise; lowest_date: IsoDate };

export type OutlookResult =
  | {
      status: "ready";
      as_of: IsoDate;
      horizon_days: number;
      opening: MoneyPaise;
      /** When the bank reported the opening balance. */
      opening_as_of: IsoTimestamp | null;
      days: OutlookDay[];
      first_shortfall: { date: IsoDate; gap: MoneyPaise } | null;
      lowest: { date: IsoDate; balance: MoneyPaise };
      next_income_date: IsoDate | null;
      /** E05: days of bills and everyday spend covered with no income. */
      resilience_days: number | null;
      resilience_status: "red" | "amber" | "green" | null;
      first_task: FirstTask;
      /** Items the outlook used (all confirmed by the member). */
      used_ids: string[];
      assumptions: {
        no_income_confirmed: boolean;
        no_everyday_confirmed: boolean;
      };
    }
  /** The member kept "Use in household calculations" off for this link. */
  | { status: "not_allowed" }
  /** Nothing confirmed yet: nothing is projected from a guess. */
  | { status: "needs_confirmation" }
  /** The bank sent no readable balance to start from. */
  | { status: "no_balance" };

export interface BillsView {
  link_id: string;
  is_sandbox: boolean;
  as_of: IsoDate;
  items: BillItem[];
  everyday: EverydayItem;
  reason: string | null;
  outlook: OutlookResult;
}

export interface BillDecisionInput {
  id: string;
  action: BillAction;
  /** Rupees, for "fix". */
  amount_rupees?: number;
  /** 1–31, for "fix" on a monthly or quarterly item. */
  day?: number;
}
