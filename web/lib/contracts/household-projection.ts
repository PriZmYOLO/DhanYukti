/**
 * PROVISIONAL viewer-authorised household projection (Guide §3 "State",
 * GET /households/{id}/twin). Replace with H01 generated types.
 *
 * The backend releases only what this viewer may see: another member's
 * private facts are absent from the payload, not hidden by the UI.
 */
import type {
  ErrorEnvelope,
  Availability,
  IsoDate,
  IsoTimestamp,
  MoneyPaise,
  SourceKind,
} from "@/lib/contracts/common";

export type MemberVisibility = "self" | "shared_with_you" | "not_shared";

export interface MemberSummary {
  member_id: string;
  display_label: string;
  visibility: MemberVisibility;
}

export type ConnectionStatus =
  | "not_connected"
  | "pending"
  | "connected"
  | "partial"
  | "denied"
  | "failed"
  | "revoked";

export interface SourceConnection {
  connection_id: string;
  label: string;
  status: ConnectionStatus;
  last_updated_at: IsoTimestamp | null;
}

export type FactKind =
  | "cash_balance"
  | "income"
  | "obligation"
  | "essential_spending"
  | "debt"
  | "asset"
  | "protection"
  | "goal";

export interface FactSummary {
  fact_id: string;
  owner_member_id: string;
  kind: FactKind;
  label: string;
  /** null means the amount is not known; it must never be shown as ₹0. */
  amount: MoneyPaise | null;
  /** Set when the amount repeats, e.g. a daily essentials estimate. */
  per: "day" | "month" | null;
  effective_on: IsoDate | null;
  source_kind: SourceKind;
  source_label: string | null;
  availability: Availability;
}

export type CoverageDomain =
  "cash" | "income" | "bills" | "debt" | "protection" | "goals";

export interface DomainCoverage {
  domain: CoverageDomain;
  availability: Availability;
}

/**
 * Whether the viewer's projection could be released. When it is unavailable
 * nothing is shown in its place: no balances, no dates, no members.
 */
export type ProjectionRelease =
  | { status: "released"; projection: HouseholdProjection }
  | { status: "unavailable"; reason: string; error: ErrorEnvelope | null };

export interface HouseholdProjection {
  projection_id: string;
  household_id: string;
  snapshot_id: string;
  viewer_member_id: string;
  as_of: IsoDate;
  members: MemberSummary[];
  connections: SourceConnection[];
  facts: FactSummary[];
  coverage: DomainCoverage[];
}
