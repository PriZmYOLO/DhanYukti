/**
 * PROVISIONAL — the operations L04 screens need, as TypeScript signatures.
 *
 * This is deliberately NOT a list of HTTP routes. The backend decides the
 * real routes, payloads and errors; a backend-backed adapter implements this
 * interface by calling them. The actor is always derived from the session on
 * the backend side, so no method takes a member id.
 */
import type {
  ApprovalHandoff,
  ConsentChoices,
  ConsentRequestTerms,
  FactCorrectionDraft,
  FeedbackReceipt,
  RecommendationReportDraft,
  RequestConsentResult,
  SourceLink,
} from "@/lib/provisional/h03/types";

export interface ConsentPort {
  /** "demo" until an H03/N04-backed adapter exists. */
  readonly implementation: "demo" | "h03";

  /** What a new bank-link request would ask for (shown before consent). */
  getRequestTerms(): Promise<ConsentRequestTerms>;

  /** This member's own links. Never another member's. */
  listLinks(): Promise<SourceLink[]>;
  getLink(linkId: string): Promise<SourceLink | null>;

  /** Records the four choices and creates a request; fetches nothing. */
  requestConsent(choices: ConsentChoices): Promise<RequestConsentResult>;

  /** Hands the member to the Account Aggregator app for approval. */
  startApproval(linkId: string): Promise<ApprovalHandoff>;

  /**
   * H07: withdraws source access. The backend cancels jobs, removes the data
   * from the plan and recomputes; the returned link shows "revoked".
   */
  revoke(linkId: string): Promise<SourceLink>;

  /** H07: a correction stays a proposal until accepted. */
  proposeCorrection(draft: FactCorrectionDraft): Promise<FeedbackReceipt>;

  /** Grievance/report entry (Y08/H09 later). Saving is not resolving. */
  reportRecommendation(
    draft: RecommendationReportDraft,
  ): Promise<FeedbackReceipt>;
}
