/**
 * Private insurance seen in a member's linked bank data, plus what they
 * told DhanYukti about each policy (under DPDP consent "insurance_tags").
 */
import type { IsoDate, MoneyPaise } from "@/lib/contracts/common";

/** What the insurer is licensed as by IRDAI. It limits what a policy can be. */
export type InsurerLicence = "life" | "general" | "health";

export type CoverKind =
  "health" | "life" | "motor" | "accident" | "home" | "other";

export type MemberGroup = "self" | "spouse" | "children" | "parents" | "other";

export const MEMBER_GROUPS: MemberGroup[] = [
  "self",
  "spouse",
  "children",
  "parents",
  "other",
];

/** Kinds each licence type can sell (a health insurer only sells health). */
export const KINDS_BY_LICENCE: Record<InsurerLicence, CoverKind[]> = {
  life: ["life", "health", "other"],
  general: ["health", "motor", "accident", "home", "other"],
  health: ["health"],
};

export interface PolicyTags {
  covers: MemberGroup[];
  kind: CoverKind;
  tagged_at: string;
}

export interface DetectedPolicy {
  /** Stable key: insurer + premium size. Not a policy number. */
  policy_key: string;
  insurer: string;
  licence: InsurerLicence;
  account_label: string;
  last_paid: { date: IsoDate; amount: MoneyPaise };
  payments_seen: number;
  frequency: "monthly" | "quarterly" | "half_yearly" | "yearly";
  /** Premium over a year at the seen frequency. */
  yearly_premium: MoneyPaise;
  /** null = the member hasn't said (or consent is off). */
  tags: PolicyTags | null;
}

export interface CoverSummary {
  policies_found: number;
  policies_tagged: number;
  /** From tags only: a life policy the member says covers them. */
  life_for_self: "yes" | "not_told";
  /** Groups a health policy covers, per the member's tags. */
  health_groups: MemberGroup[];
  motor: boolean;
  yearly_premiums_total: MoneyPaise | null;
}

export interface ExistingCover {
  policies: DetectedPolicy[];
  summary: CoverSummary;
  /** Whether "insurance_tags" DPDP consent is on (tags can be saved). */
  tagging_allowed: boolean;
}
