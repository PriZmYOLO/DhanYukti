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

export type WorkKind = "naukri" | "dukaan" | "gig" | "mazdoori" | "other";
export type GoalIntent = "education" | "emergency_cushion" | "repay_debt" | "big_purchase" | "festival_wedding" | "other";

export const WORK_KINDS: WorkKind[] = ["naukri", "dukaan", "gig", "mazdoori", "other"];
export const GOALS: GoalIntent[] = ["education", "emergency_cushion", "repay_debt", "big_purchase", "festival_wedding", "other"];

export interface OnboardingAnswers {
  version: 1;
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
  loans: Answer<boolean>;
  goal: Answer<GoalIntent>;
  updated_at: string | null;
}

export const EMPTY_ANSWERS: OnboardingAnswers = {
  version: 1,
  members: UNANSWERED,
  earners: UNANSWERED,
  dependents: { children: UNANSWERED, children_in_school: UNANSWERED, elders: UNANSWERED, other: UNANSWERED },
  work: UNANSWERED,
  loans: UNANSWERED,
  goal: UNANSWERED,
  updated_at: null,
};

export type InviteRole = "earning_adult" | "non_earning_adult";

export interface Invite {
  code: string;
  role: InviteRole;
  /** What the inviter calls them, e.g. "Pati" (optional, max 24 chars). */
  label: string | null;
  created_at: string;
  expires_at: string;
  status: "open" | "cancelled";
}

/** Count of questions left unanswered, for the "N not answered" note. */
export function unansweredCount(a: OnboardingAnswers): number {
  const all = [a.members, a.earners, a.dependents.children, a.dependents.children_in_school, a.dependents.elders, a.dependents.other, a.work, a.loans, a.goal];
  return all.filter((x) => x.state === "unanswered").length;
}

export function answerValue<T>(a: Answer<T>): T | null {
  return a.state === "answered" ? a.value : null;
}
