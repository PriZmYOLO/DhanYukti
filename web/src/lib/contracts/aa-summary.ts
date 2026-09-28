/**
 * What the reveal step may show from a member's own live Account
 * Aggregator data: a few facts worked out on the server. No raw
 * transactions and no narrations beyond a payee label ever leave it.
 * Unknown is never zero.
 */
import type { IsoDate, IsoTimestamp, MoneyPaise } from "./common";
import type { SchemeId, SchemeStatus } from "./scheme-check";
import type { FiType } from "../aa/fi-types";
import type { DetectedBills } from "./aa-bills";

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
  /** FD/RD, mutual funds, shares and SIPs (only the types requested). */
  savings_investments: SavingsInvestments;
  /**
   * E02 suggestions (repeating income and bills, everyday spend). Absent on
   * summaries saved before E02; see /api/aa/links/[linkId]/bills.
   */
  bills?: DetectedBills;
}

/**
 * - not_requested: the member didn't share this kind of account.
 * - none_found: shared, but the bank sent no account of this kind.
 * - ready: facts below; a value that couldn't be read is null, never 0.
 */
type Fact<T> = { status: "not_requested" } | { status: "none_found" } | ({ status: "ready" } & T);

export interface SavingsInvestments {
  /** FI types this link asked for; the facts cover only these. */
  requested: FiType[];
  /** TERM_DEPOSIT + RECURRING_DEPOSIT. */
  deposits: Fact<{
    source_fi_types: ("TERM_DEPOSIT" | "RECURRING_DEPOSIT")[];
    accounts: number;
    /** Sum of current values the bank sent; null when none did. */
    total_current_value: MoneyPaise | null;
    accounts_without_value: number;
    /** Earliest maturity from today on; null when no date is known. */
    next_maturity: {
      date: IsoDate;
      amount: MoneyPaise | null;
      fi_type: "TERM_DEPOSIT" | "RECURRING_DEPOSIT";
      account_label: string;
    } | null;
  }>;
  /** MUTUAL_FUNDS: market value, can go down. */
  mutual_funds: Fact<{
    current_value: MoneyPaise | null;
    cost_value: MoneyPaise | null;
    schemes: number;
    accounts_without_value: number;
    /** Latest NAV date among the schemes. */
    as_of: IsoDate | null;
  }>;
  /** EQUITIES: market value, can go down. */
  equities: Fact<{
    current_value: MoneyPaise | null;
    holdings: number;
    accounts_without_value: number;
  }>;
  /** SIP. */
  sips: Fact<{
    active: {
      scheme: string | null;
      amc: string | null;
      amount: MoneyPaise | null;
      frequency: string | null;
      next_date: IsoDate | null;
    }[];
    ceased: number;
  }>;
}
