/**
 * Family cover engine contract (health, life, accident).
 *
 * FIREWALL: nothing here names an insurer, a product, a price or a
 * commission. The engine works out what cover each part of the family
 * needs and what features to insist on; the family takes that
 * specification to IRDAI's Bima Sugam marketplace or any insurer. Output
 * codes are rendered into words by the UI in both display modes.
 */
import type { IsoTimestamp, MoneyPaise } from "@/lib/contracts/common";

export type Relation = "self" | "spouse" | "child" | "parent" | "other";
export type CityTier = "metro" | "tier2" | "tier3";
export type Condition =
  "diabetes" | "hypertension" | "heart" | "thyroid" | "asthma" | "other";

export const RELATIONS: Relation[] = [
  "self",
  "spouse",
  "child",
  "parent",
  "other",
];
export const CONDITIONS: Condition[] = [
  "diabetes",
  "hypertension",
  "heart",
  "thyroid",
  "asthma",
  "other",
];

export interface ProfileMember {
  id: string;
  relation: Relation;
  /** Whole years; null = not told (never assumed). */
  age: number | null;
  earns: boolean;
  /** Earners only; null = not told. */
  annual_income: MoneyPaise | null;
}

export type CoverKind = "health" | "life" | "accident";

/** A policy the family already has. No insurer name: the engine is blind to it. */
export interface DeclaredCover {
  id: string;
  kind: CoverKind;
  member_ids: string[];
  /** null = sum insured not told; the policy then can't count. */
  sum_insured: MoneyPaise | null;
  /** Employer group cover ends with the job, so it's shown but not counted. */
  employer: boolean;
  source: "declared" | "aa_detected";
}

export interface CoverFilters {
  /** Health: insist on no room-rent limit. */
  room_rent_no_cap: boolean;
  /** Health: highest co-payment the family accepts. */
  copay_max_pct: 0 | 10 | 20;
  /** Health: longest pre-existing-disease wait accepted (IRDAI max is 36). */
  ped_wait_max_months: 12 | 24 | 36;
  restore_benefit: boolean;
  maternity: boolean;
  opd: boolean;
  /** Term life riders the family wants. */
  term_riders: (
    "accidental_death" | "critical_illness" | "waiver_of_premium"
  )[];
}

export const DEFAULT_FILTERS: CoverFilters = {
  room_rent_no_cap: true,
  copay_max_pct: 0,
  ped_wait_max_months: 36,
  restore_benefit: true,
  maternity: false,
  opd: false,
  term_riders: [],
};

export interface CoverProfile {
  version: 1;
  city_tier: CityTier | null;
  members: ProfileMember[];
  /** Household spending a year; null = not told. */
  annual_expenses: MoneyPaise | null;
  loans_outstanding: MoneyPaise | null;
  liquid_savings: MoneyPaise | null;
  existing: DeclaredCover[];
  /** Members who already pay these public-scheme premiums. */
  pmjjby_member_ids: string[];
  pmsby_member_ids: string[];
  vay_vandana_member_ids: string[];
  filters: CoverFilters;
  updated_at: IsoTimestamp | null;
}

/** Declared conditions per member id (separate DPDP consent). */
export type MemberConditions = Record<string, Condition[]>;

/* ------------------------------- output --------------------------------- */

export type UnitStatus = "gap" | "covered" | "not_needed" | "unknown";

export interface HaveItem {
  /** A DeclaredCover id, or "pmjjby" / "pmsby" / "vay_vandana". */
  source_id: string;
  amount: MoneyPaise;
  counted: boolean;
  /** Why it was or wasn't counted (UI code). */
  note:
    "counted" | "employer_not_counted" | "not_all_members" | "public_scheme";
}

export interface CoverUnit {
  unit_id: string;
  kind: CoverKind;
  /** family_floater | parents | member | earner */
  label: "family" | "parents" | "member" | "earner";
  member_ids: string[];
  need: MoneyPaise | null;
  have: MoneyPaise;
  have_items: HaveItem[];
  gap: MoneyPaise | null;
  status: UnitStatus;
  /** 1 = act first. null when there is no gap. */
  priority: number | null;
  /** Rules that produced this line (see RULES in the engine). */
  rule_ids: string[];
  /** Inputs that would make this line exact. */
  missing: string[];
  /** Life only: cover until this age. */
  term_until_age: number | null;
  years_needed: number | null;
}

export type FeatureCode =
  | "no_room_rent_cap"
  | "copay_max"
  | "ped_wait_max"
  | "restore_benefit"
  | "maternity"
  | "opd"
  | "no_disease_sublimits"
  | "cashless_network_nearby"
  | "pre_post_hospitalisation"
  | "day_care"
  | "super_top_up_structure"
  | "separate_from_family_floater"
  | "pure_term"
  | "rider_accidental_death"
  | "rider_critical_illness"
  | "rider_waiver_of_premium"
  | "permanent_disability"
  | "temporary_disability_income";

export type NoteCode =
  | "disclose_conditions"
  | "senior_loading_possible"
  | "moratorium_five_years"
  | "employer_cover_ends"
  | "motor_pa_not_counted"
  | "cover_capped_by_income";

export interface CoverSpec {
  unit_id: string;
  cover_type:
    | "family_floater"
    | "senior_floater"
    | "individual_health"
    | "term_life"
    | "personal_accident";
  member_ids: string[];
  /** Cover to buy now (the gap, rounded up), not the total need. */
  sum_insured: MoneyPaise;
  term_until_age: number | null;
  must_have: FeatureCode[];
  notes: NoteCode[];
  /** Filter values the feature codes refer to. */
  filter_values: { copay_max_pct: number; ped_wait_max_months: number };
}

export interface PublicStep {
  scheme: "pmsby" | "pmjjby" | "vay_vandana";
  member_id: string;
  status: "already" | "consider" | "not_eligible" | "unknown";
  annual_premium: MoneyPaise | null;
  cover: MoneyPaise;
}

export interface CoverPlan {
  ruleset_version: string;
  generated_at: IsoTimestamp;
  /** sha256 of the exact inputs, so a result can be reproduced and audited. */
  input_hash: string;
  public_first: PublicStep[];
  units: CoverUnit[];
  specs: CoverSpec[];
  /** Household-level inputs that are missing. */
  missing: string[];
  /** Value Ledger receipt for this run; null if not recorded. */
  receipt_id: string | null;
  /** The assumption values this ruleset used, shown to the family. */
  rules_used: {
    floater_base: Record<CityTier, MoneyPaise>;
    senior_base: Record<CityTier, MoneyPaise>;
    extra_per_member_over_4: MoneyPaise;
    senior_age: number;
    child_independence_age: number;
    min_years: number;
    life_income_multiple: number;
    accident_income_multiple: number;
    term_end_age: [number, number];
  };
}
