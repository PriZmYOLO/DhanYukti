/**
 * What the reveal step may show from a member's own live Account
 * Aggregator data: a few facts worked out on the server. No raw
 * transactions and no narrations beyond a payee label ever leave it.
 * Unknown is never zero.
 */
import type { IsoDate, IsoTimestamp, MoneyPaise } from "./common";
import type { SchemeId, SchemeStatus } from "./scheme-check";

export interface SummaryAccount {
  /** Masked label, e.g. "Savings account · SBI-FIP-UAT ··9648". */
  account_label: string;
  /** null = the bank didn't send a readable balance. */
  balance: MoneyPaise | null;
  balance_at: IsoTimestamp | null;
}

export type MonthlyInflow =
  | {
      status: "known";
      /** Median of total credits per complete calendar month. */
      median: MoneyPaise;
      months_counted: number;
      /** First and last month counted, "YYYY-MM". */
      from_month: string;
      to_month: string;
    }
  | { status: "unknown"; months_counted: number; reason: string };

export interface RecurringDebit {
  payee_label: string;
  /** Median of the matching debits. */
  typical_amount: MoneyPaise;
  /** Distinct calendar months with a matching debit. */
  months_seen: number;
  last_date: IsoDate;
  /** Accounts the debits were paid from. */
  account_labels: string[];
}

export type SummaryJanSuraksha =
  /** The member didn't allow "Alerts and suggested actions" for this source. */
  | { status: "not_checked_consent_off" }
  | {
      status: "checked";
      renewal_window_checked: { from: IsoDate; to: IsoDate } | null;
      findings: {
        scheme: SchemeId;
        status: SchemeStatus;
        evidence: { account_label: string; date: IsoDate } | null;
      }[];
    };

export interface AccountSummary {
  link_id: string;
  is_sandbox: boolean;
  fetched_at: IsoTimestamp;
  balance: {
    /** Sum over accounts with a balance; null when none sent one. */
    total: MoneyPaise | null;
    accounts: SummaryAccount[];
    /** Accounts left out of the total because their balance is unknown. */
    accounts_without_balance: number;
  };
  window: {
    from: IsoDate | null;
    to: IsoDate | null;
    transaction_count: number;
  };
  monthly_inflow: MonthlyInflow;
  recurring_debits: { items: RecurringDebit[]; reason: string | null };
  jan_suraksha: SummaryJanSuraksha;
}
