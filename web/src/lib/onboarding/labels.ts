import type { L } from "@/lib/types";
import type { GoalIntent, IncomeFrequency, OwnIncome, WorkKind } from "./answers";

/** Words for the onboarding answers (Hindi + English), shared by the questions, the review and the Family tab. */
export const WORK_LABEL: Record<WorkKind, L & { e: string }> = {
  naukri: { e: "🏭", hi: "Naukri", en: "Job" },
  dukaan: { e: "🏪", hi: "Dukaan / apna kaam", en: "Shop / own work" },
  gig: { e: "🛵", hi: "Gig (Swiggy, Uber…)", en: "Gig (delivery, driving)" },
  mazdoori: { e: "🧱", hi: "Mazdoori", en: "Daily wage" },
  homemaker: { e: "🏠", hi: "Grihini / ghar sambhalna", en: "Homemaker" },
  student: { e: "🎓", hi: "Padhai", en: "Student" },
  retired: { e: "🧓", hi: "Retired", en: "Retired" },
  other: { e: "✳️", hi: "Kuch aur", en: "Something else" },
};

export const OWN_INCOME_LABEL: Record<OwnIncome, L> = {
  fixed: { hi: "Har baar lagbhag utni, tay tareekh par", en: "About the same, on a fixed date" },
  varies: { hi: "Upar-neeche hoti hai", en: "It changes" },
  none: { hi: "Meri apni kamai nahi", en: "No income of my own" },
};

export const FREQUENCY_LABEL: Record<IncomeFrequency, L> = {
  monthly: { hi: "Har mahine", en: "Every month" },
  weekly: { hi: "Har hafte", en: "Every week" },
  daily: { hi: "Roz", en: "Every day" },
  irregular: { hi: "Tay nahi", en: "No fixed pattern" },
};

export const GOAL_LABEL: Record<GoalIntent, L> = {
  education: { hi: "Bachchon ki padhai", en: "Children's education" },
  emergency_cushion: { hi: "Mushkil waqt ki bachat", en: "Emergency cushion" },
  repay_debt: { hi: "Karz utaarna", en: "Pay off loans" },
  big_purchase: { hi: "Badi kharidari", en: "Big purchase" },
  festival_wedding: { hi: "Tyohaar / shaadi", en: "Festival / wedding" },
  other: { hi: "Kuch aur", en: "Something else" },
};

/** "Why we ask": one line per question, so nobody wonders what an answer is used for. */
export const WHY: Record<string, L> = {
  people: { hi: "Parivaar ke hisaab se bima aur bachat ka lakshya tay karne ke liye", en: "To size cover and savings goals to your family" },
  dependents: { hi: "Jitne log aap par nirbhar, utna zyada suraksha ka dhyaan", en: "More people depending on you means more protection matters" },
  work: { hi: "Kaam se pata chalta hai aamdani kab aur kaise aati hai", en: "Your work tells us when and how money comes in" },
  own_income: { hi: "Tay aamdani ki tareekh pakki maante hain; badalti hai to andaaza", en: "A fixed income date is treated as firm; a changing one as an estimate" },
  loans: { hi: "Loan ki EMI aapke 'kitna kharch kar sakte hain' ko ghataati hai", en: "Loan EMIs reduce what you can safely spend" },
  goal: { hi: "Aapka lakshya aap chunte hain — DhanYukti nahi", en: "You choose your goal — DhanYukti doesn't" },
  cash: { hi: "Ghar ka cash bhi mushkil waqt mein kaam aata hai — bina aamdani ke din ginne mein", en: "Cash at home also helps in a hard month — it counts toward days without income" },
  income: { hi: "Agar bank data mein agli aamdani na dikhe, to yeh tareekh andaaza ke roop mein lagate hain", en: "If your bank data doesn't show your next income, we use this date as an estimate" },
  bill: { hi: "Ek zaroori bill jo bank data mein na dikhe, woh bhi hisaab mein aaye", en: "So an important bill your bank data doesn't show is still counted" },
};
