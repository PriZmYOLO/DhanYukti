import type { CopyKey } from "@/lib/onboarding/copy";
import type {
  GoalIntent,
  IncomeFrequency,
  IncomePattern,
  MemberRole,
  OccupationKind,
} from "@/lib/provisional/h01/types";

/** Option value → copy key, shared by the forms and the review screen. */
export const roleOptions: Record<MemberRole, CopyKey> = {
  earning_adult: "roleEarning",
  non_earning_adult: "roleNonEarning",
};

export const occupationOptions: Record<OccupationKind, CopyKey> = {
  salaried: "occupationSalaried",
  self_employed: "occupationSelfEmployed",
  daily_or_gig: "occupationDailyOrGig",
  homemaker: "occupationHomemaker",
  student: "occupationStudent",
  retired: "occupationRetired",
  other: "occupationOther",
};

export const incomePatternOptions: Record<IncomePattern, CopyKey> = {
  fixed: "incomeFixed",
  varies: "incomeVaries",
};

export const goalOptions: Record<GoalIntent, CopyKey> = {
  education: "goalEducation",
  emergency_cushion: "goalEmergency",
  repay_debt: "goalDebt",
  big_purchase: "goalPurchase",
  other: "goalOther",
};

export const frequencyOptions: Record<IncomeFrequency, CopyKey> = {
  monthly: "frequencyMonthly",
  weekly: "frequencyWeekly",
  daily: "frequencyDaily",
  irregular: "frequencyIrregular",
};

export function toChoiceOptions<T extends string>(
  options: Record<T, CopyKey>,
  text: (key: CopyKey) => string,
): { value: T; label: string }[] {
  return (Object.keys(options) as T[]).map((value) => ({
    value,
    label: text(options[value]),
  }));
}
