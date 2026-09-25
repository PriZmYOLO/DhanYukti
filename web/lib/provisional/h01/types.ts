/**
 * PROVISIONAL — frontend shapes for what L02 needs from H01/H02/H03/H04.
 *
 * These are NOT the H01 contract. They describe only what the L02 screens
 * consume. When Harshal publishes generated schemas, map them onto these
 * types (or replace these types) inside the adapter; screens stay unchanged.
 */
import type { IsoDate, IsoTimestamp, MoneyPaise } from "@/lib/contracts/common";
import type { Answer } from "@/lib/onboarding/answer";
import type { DisplayMode } from "@/lib/onboarding/copy";

/** Who is using this session. Real sessions come from H02 (Supabase Auth). */
export interface ProvisionalMemberSession {
  member_id: string;
  display_name: string | null;
  started_at: IsoTimestamp;
  is_demo: boolean;
}

export interface ProvisionalHouseholdMembership {
  household_id: string;
  household_name: Answer<string>;
  joined_via: "created" | "invite";
  is_demo: boolean;
}

/**
 * What this viewer may see of a member. The decision belongs to H03; the
 * frontend only renders it. Default deny (Guide §5) until H03 says otherwise.
 */
export interface ProvisionalMemberAccess {
  member_id: string;
  display_label: string;
  access: "self" | "not_shared";
}

export type ProvisionalInviteLookup =
  | { status: "valid"; code: string; household_name: string; is_demo: boolean }
  | { status: "expired" | "already_used" | "not_found"; code: string }
  | { status: "unavailable"; code: string; reason: string };

export type ProvisionalAcceptInviteResult =
  | { ok: true; snapshot: OnboardingSnapshot }
  | { ok: false; lookup: ProvisionalInviteLookup };

export type MemberRole = "earning_adult" | "non_earning_adult";

export type OccupationKind =
  | "salaried"
  | "self_employed"
  | "daily_or_gig"
  | "homemaker"
  | "student"
  | "retired"
  | "other";

/** Answer "none" means "no income of my own". */
export type IncomePattern = "fixed" | "varies";

export type GoalIntent =
  "education" | "emergency_cushion" | "repay_debt" | "big_purchase" | "other";

/** Minimal member context (Guide §4). Maps to H01 ContextVersion later. */
export interface HouseholdContextDraft {
  member_role: Answer<MemberRole>;
  occupation: Answer<OccupationKind>;
  income_pattern: Answer<IncomePattern>;
  dependents: Answer<number>;
  goal_intent: Answer<GoalIntent>;
}

export type IncomeFrequency = "monthly" | "weekly" | "daily" | "irregular";

/** Manually entered money context. Always declared, never bank data. */
export interface ManualMoneyDraft {
  cash: { amount: Answer<MoneyPaise>; as_of: Answer<IsoDate> };
  income: {
    amount: Answer<MoneyPaise>;
    frequency: Answer<IncomeFrequency>;
    next_on: Answer<IsoDate>;
  };
  bill: {
    name: Answer<string>;
    amount: Answer<MoneyPaise>;
    due_on: Answer<IsoDate>;
  };
}

/**
 * Manual entries are candidates only. Turning them into accepted facts is
 * H04's job (via N02 normalisation); nothing here reaches Home.
 */
export interface ManualCandidateSet {
  draft: ManualMoneyDraft;
  source_kind: "declared";
  status: "demo_not_accepted";
  saved_at: IsoTimestamp;
}

/** Maps to H01 PresentationProfile later. Presentation only. */
export interface PresentationPreference {
  mode: DisplayMode;
}

export interface OnboardingSnapshot {
  session: ProvisionalMemberSession | null;
  membership: ProvisionalHouseholdMembership | null;
  members: ProvisionalMemberAccess[];
  context: HouseholdContextDraft | null;
  money: ManualCandidateSet | null;
  presentation: PresentationPreference;
}
