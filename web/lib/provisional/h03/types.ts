/**
 * PROVISIONAL — frontend shapes for what L04 needs from H03 (grants), N04
 * (provider states) and H07 (revoke, corrections).
 *
 * These are NOT the backend contract. They describe only what the L04
 * screens consume. When the backend publishes generated schemas, map them
 * onto these types (or replace these types) inside the adapter; screens stay
 * unchanged. Names are snake_case so that swap stays mechanical.
 */
import type {
  ErrorEnvelope,
  IsoDate,
  IsoTimestamp,
  MoneyPaise,
} from "@/lib/contracts/common";

/**
 * Guide §5 source-consent lifecycle. A request alone never authorises a
 * fetch. "paused" and "failed" come from the Anumati FIU module's consent
 * lifecycle webhook; screens show them as "Status not known", never active.
 */
export type ConsentStatus =
  | "requested"
  | "awaiting_approval"
  | "active"
  | "denied"
  | "expired"
  | "revoked"
  | "paused"
  | "failed";

/** What has arrived under an active consent (N04/N05 job state). */
export type ImportStatus =
  "not_started" | "processing" | "complete" | "partial" | "failed";

/** Who may see results computed from this source (ViewerGrant). */
export type ViewerScope = "only_me" | "household_adults";

/**
 * The four separate decisions of Guide §5. Every one starts off (default
 * deny); joining a household turns none of them on.
 */
export interface ConsentChoices {
  /** SourceConsent: may DhanYukti fetch this data at all. */
  source_access: boolean;
  /** ComputationGrant: may it be used in household calculations. */
  household_computation: boolean;
  /** ViewerGrant: who sees the results. */
  viewer_scope: ViewerScope;
  /** ActionGrant: alerts and suggested actions based on it. */
  alerts_and_actions: boolean;
}

export const DEFAULT_CHOICES: ConsentChoices = {
  source_access: false,
  household_computation: false,
  viewer_scope: "only_me",
  alerts_and_actions: false,
};

/**
 * What a consent request asks for. Codes, not sentences, so both display
 * modes word them from the same facts. Unknown codes render as "not stated".
 */
export interface ConsentRequestTerms {
  /** The regulated Account Aggregator partner; null = not yet named. */
  partner_name: string | null;
  data_kind: "savings_account_transactions";
  /** How far back transactions are requested. */
  history_months: number;
  purposes: ("budgeting" | "bill_protection" | "aggregated_statement")[];
  fetch_frequency: "on_approval_then_daily" | "once_on_approval";
  /** How long the consent lasts unless revoked earlier. */
  consent_months: number;
  retention: "while_consent_active";
  /** true until the real request terms come from the backend. */
  is_provisional: boolean;
}

export interface ImportedAccount {
  account_id: string;
  /** e.g. "Savings account · Demo Bank A (fixture)". Never a full number. */
  account_label: string;
  status: "received" | "processing" | "failed";
  /** Period the received transactions cover; null until known. */
  data_from: IsoDate | null;
  data_to: IsoDate | null;
  fetched_at: IsoTimestamp | null;
  /** null = not known (processing or failed), never zero. */
  balance: MoneyPaise | null;
  balance_as_of: IsoDate | null;
  /** Safe reason when this account failed. */
  error: ErrorEnvelope | null;
}

/**
 * One step in a live link's history, for the "What happened" trail. Codes,
 * not sentences; `ref` is a shortened, non-secret reference (never a consent
 * handle or token).
 */
export interface LinkActivity {
  at: IsoTimestamp;
  event:
    | "requested"
    | "sent_to_aa"
    | "approved"
    | "declined"
    | "data_ready"
    | "fetched"
    | "fetch_failed"
    | "decrypt_failed"
    | "revoked"
    | "expired"
    | "paused"
    | "consent_failed";
  /** e.g. number of accounts, or a short reference like "…u3i". */
  ref: string | null;
}

/** One member's link to one source: its consent plus what was imported. */
export interface SourceLink {
  link_id: string;
  source_label: string;
  is_demo: boolean;
  terms: ConsentRequestTerms;
  /** The three grants that sit beside source access. */
  grants: Omit<ConsentChoices, "source_access">;
  consent: {
    status: ConsentStatus;
    requested_at: IsoTimestamp;
    /** When the consent entered its current status. */
    status_changed_at: IsoTimestamp;
    active_from: IsoDate | null;
    expires_on: IsoDate | null;
  };
  import: {
    status: ImportStatus;
    last_attempt_at: IsoTimestamp | null;
    accounts: ImportedAccount[];
  };
  /** Live links only: what happened with the Account Aggregator, in order. */
  activity?: LinkActivity[];
  /** Live links only: data came from the provider's test sandbox. */
  is_sandbox?: boolean;
}

export type RequestConsentResult =
  | { ok: true; link: SourceLink }
  | { ok: false; reason: "source_access_required" };

/**
 * How the member approves. The demo only simulates. The live Anumati adapter
 * first asks for the mobile number registered with the bank
 * ("needs_details"), then hands the member to Anumati's hosted consent page
 * ("redirect").
 */
export type ApprovalHandoff =
  | { mode: "simulated"; link: SourceLink }
  | { mode: "needs_details"; link: SourceLink }
  | { mode: "redirect"; link: SourceLink; redirect_url: string }
  | { mode: "unavailable"; reason: string };

/** What the Account Aggregator needs to identify the customer. */
export interface ApprovalDetails {
  /** 10-digit mobile number registered with the bank / AA. */
  mobile_number: string;
}

export type ReportReason =
  "wrong_fact" | "not_suitable" | "unclear" | "privacy" | "other";

export interface FactCorrectionDraft {
  which_fact: string;
  correct_value: string;
}

export interface RecommendationReportDraft {
  reason: ReportReason;
  details: string;
}

/** A saved proposal or report. It is never a completed correction. */
export interface FeedbackReceipt {
  receipt_id: string;
  kind: "fact_correction" | "recommendation_report";
  status: "demo_not_sent";
  saved_at: IsoTimestamp;
}
