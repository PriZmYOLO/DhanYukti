/**
 * Onboarding answers, shared by the browser and the server.
 *
 * Every question starts "unanswered". "unanswered" (skipped), "dont_know"
 * and "none" are different answers and none of them means zero: an engine
 * that reads these must treat a skipped question as unknown, never as 0.
 */

export type Answer<T> =
  | { state: "unanswered" }
  | { state: "dont_know" }
  | { state: "none" }
  | { state: "answered"; value: T };

export const UNANSWERED = { state: "unanswered" } as const;
export const answered = <T,>(value: T): Answer<T> => ({ state: "answered", value });

export type WorkKind = "naukri" | "dukaan" | "gig" | "mazdoori" | "homemaker" | "student" | "retired" | "other";
/** The member's own income: steady, changing, or none of their own. */
export type OwnIncome = "fixed" | "varies" | "none";
export type IncomeFrequency = "monthly" | "weekly" | "daily" | "irregular";
export type GoalIntent = "education" | "emergency_cushion" | "repay_debt" | "big_purchase" | "festival_wedding" | "other";

export const WORK_KINDS: WorkKind[] = ["naukri", "dukaan", "gig", "mazdoori", "homemaker", "student", "retired", "other"];
export const OWN_INCOME: OwnIncome[] = ["fixed", "varies", "none"];
export const FREQUENCIES: IncomeFrequency[] = ["monthly", "weekly", "daily", "irregular"];

/**
 * Money the member tells us (declared, never bank data). Amounts in whole
 * rupees, dates YYYY-MM-DD. The engines use these only to fill a gap in the
 * bank data, always marked "you told us" (an estimate), never over it.
 * "none" on income = no regular income; on the bill = no bill to add.
 */
export interface MoneyAnswers {
  cash: Answer<number>;
  income_amount: Answer<number>;
  income_frequency: Answer<IncomeFrequency>;
  next_pay: Answer<string>;
  bill_name: Answer<string>;
  bill_amount: Answer<number>;
  bill_due: Answer<string>;
}
export const GOALS: GoalIntent[] = ["education", "emergency_cushion", "repay_debt", "big_purchase", "festival_wedding", "other"];

export interface OnboardingAnswers {
  /** 2 adds own_income, the fuller work list and money. v1 answers read as v2 with those unanswered. */
  version: 1 | 2;
  /** People living at home. */
  members: Answer<number>;
  earners: Answer<number>;
  /** Who depends on the earners' money. */
  dependents: {
    children: Answer<number>;
    children_in_school: Answer<number>;
    elders: Answer<number>;
    other: Answer<number>;
  };
  work: Answer<WorkKind>;
  own_income: Answer<OwnIncome>;
  loans: Answer<boolean>;
  goal: Answer<GoalIntent>;
  money: MoneyAnswers;
  updated_at: string | null;
}

export const EMPTY_MONEY: MoneyAnswers = {
  cash: UNANSWERED, income_amount: UNANSWERED, income_frequency: UNANSWERED, next_pay: UNANSWERED,
  bill_name: UNANSWERED, bill_amount: UNANSWERED, bill_due: UNANSWERED,
};

export const EMPTY_ANSWERS: OnboardingAnswers = {
  version: 2,
  members: UNANSWERED,
  earners: UNANSWERED,
  dependents: { children: UNANSWERED, children_in_school: UNANSWERED, elders: UNANSWERED, other: UNANSWERED },
  work: UNANSWERED,
  own_income: UNANSWERED,
  loans: UNANSWERED,
  goal: UNANSWERED,
  money: EMPTY_MONEY,
  updated_at: null,
};

/** Old saved answers (v1) → v2 shape; missing parts stay "unanswered". */
export function withDefaults(a: Partial<OnboardingAnswers> | null | undefined): OnboardingAnswers {
  return { ...EMPTY_ANSWERS, ...(a ?? {}), money: { ...EMPTY_MONEY, ...(a?.money ?? {}) }, version: 2 };
}

export type InviteRole = "earning_adult" | "non_earning_adult";

export interface Invite {
  code: string;
  role: InviteRole;
  /** What the inviter calls them, e.g. "Pati" (optional, max 24 chars). */
  label: string | null;
  created_at: string;
  expires_at: string;
  /** "joined": the person linked their own bank from this invite (single use). */
  status: "open" | "cancelled" | "joined";
  /** Set once joined: the level THEY chose for the household picture. */
  joined_sharing?: "poora" | "sirf_total" | "private";
  joined_at?: string;
}

/** Count of questions left unanswered, for the "N not answered" note. */
export function unansweredCount(a: OnboardingAnswers): number {
  const all = [a.members, a.earners, a.dependents.children, a.dependents.children_in_school, a.dependents.elders, a.dependents.other, a.work, a.own_income, a.loans, a.goal];
  return all.filter((x) => x.state === "unanswered").length;
}

/** Money questions left unanswered (cash, income, bill), for the Money step's note. */
export function moneyUnanswered(m: MoneyAnswers): number {
  const income = m.income_amount.state === "none" ? [] : [m.income_amount, m.income_frequency, m.next_pay];
  const bill = m.bill_name.state === "none" ? [] : [m.bill_name, m.bill_amount, m.bill_due];
  return [m.cash, ...income, ...bill].filter((x) => x.state === "unanswered").length;
}

export function answerValue<T>(a: Answer<T>): T | null {
  return a.state === "answered" ? a.value : null;
}
