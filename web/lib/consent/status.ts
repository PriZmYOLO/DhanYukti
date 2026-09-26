/**
 * Status-screen mapping for linked sources (Task Pack L04 → N04 bridge).
 *
 * Pure functions from a SourceLink (consent status + import status) to the
 * one state a screen shows. The backend owns both statuses; this file only
 * decides how they are displayed. Anything it doesn't recognise is shown as
 * "unknown", never as active, empty or zero.
 */
import type { AvailabilityStatus } from "@/components/finance/availability-state";
import type { SourceLink } from "@/lib/provisional/h03";

export type LinkState =
  | "requested"
  | "awaiting_approval"
  | "processing"
  | "active"
  | "partial"
  | "failed"
  | "denied"
  | "expired"
  | "revoked"
  | "unknown";

export interface LinkStateInfo {
  /** How AvailabilityState draws it; null for a healthy active link. */
  availability: AvailabilityStatus | null;
  /** Whether per-account import rows (dates, balances) are shown. */
  showAccounts: boolean;
  /** Whether source access can be revoked from this state. */
  revocable: boolean;
  /** Whether the consent currently permits any use (grants count). */
  consentActive: boolean;
}

export const LINK_STATE_INFO: Record<LinkState, LinkStateInfo> = {
  requested: {
    availability: "pending",
    showAccounts: false,
    revocable: false,
    consentActive: false,
  },
  awaiting_approval: {
    availability: "pending",
    showAccounts: false,
    revocable: false,
    consentActive: false,
  },
  processing: {
    availability: "pending",
    showAccounts: true,
    revocable: true,
    consentActive: true,
  },
  active: {
    availability: null,
    showAccounts: true,
    revocable: true,
    consentActive: true,
  },
  partial: {
    availability: "partial",
    showAccounts: true,
    revocable: true,
    consentActive: true,
  },
  failed: {
    availability: "failed",
    showAccounts: true,
    revocable: true,
    consentActive: true,
  },
  // Data from an ended consent is no longer used, so it is not shown.
  denied: {
    availability: "denied",
    showAccounts: false,
    revocable: false,
    consentActive: false,
  },
  expired: {
    availability: "expired",
    showAccounts: false,
    revocable: false,
    consentActive: false,
  },
  revoked: {
    availability: "revoked",
    showAccounts: false,
    revocable: false,
    consentActive: false,
  },
  unknown: {
    availability: "unavailable",
    showAccounts: false,
    revocable: false,
    consentActive: false,
  },
};

/** The single displayed state of a link. */
export function linkState(link: SourceLink): LinkState {
  switch (link.consent.status) {
    case "requested":
    case "awaiting_approval":
    case "denied":
    case "expired":
    case "revoked":
      return link.consent.status;
    case "active":
      switch (link.import.status) {
        case "not_started":
        case "processing":
          return "processing";
        case "complete":
          return "active";
        case "partial":
          return "partial";
        case "failed":
          return "failed";
        default:
          return "unknown";
      }
    default:
      return "unknown";
  }
}

export type GrantKey =
  "source_access" | "household_computation" | "viewer" | "alerts_and_actions";

export const GRANT_KEYS: readonly GrantKey[] = [
  "source_access",
  "household_computation",
  "viewer",
  "alerts_and_actions",
];

/**
 * For each of the four choices, how many links with a live consent have it
 * turned on. Zero means "not given"; membership never counts.
 */
export function grantCounts(links: SourceLink[]): Record<GrantKey, number> {
  const live = links.filter(
    (link) => LINK_STATE_INFO[linkState(link)].consentActive,
  );
  return {
    source_access: live.length,
    household_computation: live.filter(
      (link) => link.grants.household_computation,
    ).length,
    viewer: live.filter(
      (link) => link.grants.viewer_scope === "household_adults",
    ).length,
    alerts_and_actions: live.filter((link) => link.grants.alerts_and_actions)
      .length,
  };
}
