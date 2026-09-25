/**
 * PROVISIONAL Financial Health Card (Guide §26; Task Packs p.20).
 *
 * The card summarises state per domain with claim-specific confidence. It
 * does not decide priority, is never a second ranking engine and has no
 * overall score. Replace with H01 generated types.
 */
import type { IsoDate } from "@/lib/contracts/common";
import type { Confidence } from "@/lib/contracts/decision-packet";

/** Fixed display order; the card never reorders domains by severity. */
export const HEALTH_DOMAINS = [
  "liquidity",
  "debt",
  "income",
  "protection",
  "goals",
] as const;

export type HealthDomain = (typeof HEALTH_DOMAINS)[number];

/** Plain-language statuses first (Guide §26). Unknown is not "fine". */
export type HealthStatus =
  "steady" | "watch" | "attention" | "not_known" | "not_assessed";

export interface HealthDomainSummary {
  domain: HealthDomain;
  status: HealthStatus;
  /** Released plain-language summary, without figures. */
  summary: string | null;
  confidence: Confidence;
}

export interface HealthCard {
  snapshot_id: string;
  as_of: IsoDate;
  domains: HealthDomainSummary[];
}
