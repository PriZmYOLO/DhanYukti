/**
 * Home wording in both display modes. Only words live here: amounts and dates
 * always come from the released data through Money/DateDisplay, and text
 * released by the backend (need titles, reasons) is shown as released.
 */
import {
  resolveModeText,
  type DisplayMode,
  type ModeText,
} from "@/lib/display-mode";

export const homeCopy = {
  // Header
  pictureAsOf: {
    standard: "Your household picture as of",
    simple: "Your family's money on",
  },
  sharedOnly: {
    standard: "Only information each member has chosen to share is used.",
    simple: "We only use what each person agreed to share.",
  },

  // Money right now
  moneyNowHeading: { standard: "Money right now", simple: "Money you have" },
  cashAvailable: { standard: "Cash available", simple: "Money now" },
  cashNotKnown: { standard: "Not known yet", simple: "We don't know yet" },
  asOf: "as of",
  safeToSpend: { standard: "Safe to spend now", simple: "Safe to spend" },
  safeNotReleased: {
    standard: "Not calculated yet",
    simple: "Not worked out yet",
  },
  safeInsufficient: {
    standard: "Not enough information",
    simple: "We need more information",
  },
  safeKeepsFloor: {
    standard: "Keeps your agreed floor of",
    simple: "Still keeps your cushion of",
  },
  safeUntil: { standard: "until", simple: "until" },

  // Priority
  attentionHeading: {
    standard: "What needs attention",
    simple: "Look at this first",
  },
  dueBy: { standard: "Due by", simple: "By" },
  noneFoundTitle: {
    standard: "Nothing needs attention right now",
    simple: "Nothing to do right now",
  },
  noneFoundWithGapsTitle: {
    standard: "Nothing found from the information available",
    simple: "Nothing found from what we know",
  },
  noPriorityTitle: {
    standard: "No priority has been released for you",
    simple: "We can't show a priority yet",
  },
  partlyUnreadableTitle: {
    standard: "Part of this information couldn't be read",
    simple: "We couldn't read some of this",
  },
  partlyUnreadableBody: {
    standard:
      "Anything that couldn't be read is shown as not known or not available. Nothing has been assumed in its place.",
    simple: "What we couldn't read is shown as not known. We have not guessed.",
  },
  stepUnavailableTitle: {
    standard: "The proposed step isn't available right now",
    simple: "This step isn't available now",
  },
  pictureUnavailableTitle: {
    standard: "Your household picture isn't available right now",
    simple: "We can't show your money right now",
  },
  decisionUnavailableTitle: {
    standard: "Your priority and next step aren't available right now",
    simple: "We can't show what to do next right now",
  },
  ifNothingChanges: {
    standard: "If nothing changes",
    simple: "If you do nothing",
  },
  consequenceOn: { standard: "On", simple: "On" },
  consequenceBy: { standard: "By", simple: "By" },
  consequenceCashGapUnknown: {
    standard: "cash would run short. The amount isn't known yet.",
    simple: "you would run short. We don't know how much yet.",
  },
  consequenceCostUnknown: {
    standard: "waiting would have a cost. The amount isn't known yet.",
    simple: "waiting could cost money. We don't know how much yet.",
  },
  consequenceCashGap: {
    standard: "cash would be short by",
    simple: "you would be short by",
  },
  consequenceNotLoss: {
    standard: "This is a shortfall to plan for, not money lost.",
    simple: "This money is not lost. It is money you would be short.",
  },
  consequenceDeadline: {
    standard: "the deadline passes.",
    simple: "the last day passes.",
  },
  consequenceExposure: {
    standard: "cover or protection could lapse.",
    simple: "cover or protection could stop.",
  },
  consequenceCost: {
    standard: "waiting would cost",
    simple: "waiting would cost you",
  },
  firstShortfall: { standard: "First shortfall", simple: "First day short" },
  lowestPoint: { standard: "Lowest cash point", simple: "Lowest money" },
  agreedFloor: { standard: "Agreed floor", simple: "Your cushion" },
  belowFloorBy: {
    standard: "Below the floor by",
    simple: "Below your cushion by",
  },
  floorHolds: {
    standard: "Cash stays at or above the agreed floor.",
    simple: "Your cushion stays safe.",
  },
  onDate: "on",
  lookingAhead: { standard: "Looking ahead from", simple: "Checked from" },
  to: "to",

  // Next step
  nextStepHeading: { standard: "Your next step", simple: "What you can do" },
  scenarioStepHeading: {
    standard: "Something you can explore",
    simple: "Something to try as a what-if",
  },
  referStepHeading: {
    standard: "A step to take with an expert",
    simple: "Talk to an expert",
  },
  scenarioOnlyNote: {
    standard: "Shown as a what-if only. It is not a recommendation to act.",
    simple: "Only a what-if. It is not advice to act.",
  },
  referNote: {
    standard:
      "Discuss this with a qualified adviser before acting. DhanYukti does not act on it for you.",
    simple: "Talk to an expert before you act.",
  },
  noNextStep: { standard: "No next step yet", simple: "No step yet" },
  uiPreview: "UI preview · not from the decision engine",
  // A caption above the released conditional_on text, not part of a sentence.
  dependsOn: { standard: "Depends on", simple: "This depends on" },
  confirmPreviewOnly: {
    standard: "Preview only — confirming is not connected yet",
    simple: "Preview only — you can't confirm yet",
  },
  otherOptions: {
    standard: "Other options",
    simple: "Other things you can do",
  },
  reviewAndConfirm: {
    standard: "Review and confirm",
    simple: "Check and confirm",
  },
  // Short on purpose: the step's status line already says confirming is not
  // connected (confirmPreviewOnly), so the note doesn't repeat it.
  confirmNotConnected: {
    standard: "Nothing is sent.",
    simple: "Nothing is sent.",
  },
  gate_proceed_to_user_confirmation: {
    standard: "Ready for you to review",
    simple: "Ready for you to check",
  },
  gate_ask: {
    standard: "Needs an answer from you first",
    simple: "We need one answer first",
  },
  gate_scenario_only: {
    standard: "Can only be explored as a what-if",
    simple: "Only as a what-if",
  },
  gate_refer: {
    standard: "Best discussed with a qualified adviser",
    simple: "Talk to an expert about this",
  },
  gate_unavailable: {
    standard: "Not available right now",
    simple: "Not available now",
  },

  // Confidence and missing information
  confidence: { standard: "Confidence", simple: "How sure we are" },
  confidence_high: "High",
  confidence_medium: "Medium",
  confidence_low: "Low",
  confidence_insufficient_evidence: {
    standard: "Not enough information",
    simple: "Not enough information",
  },
  confidence_not_assessed: {
    standard: "Not assessed yet",
    simple: "Not checked yet",
  },
  missingHeading: {
    standard: "What we don't know yet",
    simple: "Things we don't know yet",
  },
  missingDecisive: {
    standard: "Could change this",
    simple: "Could change this",
  },
  whyButton: { standard: "Why this?", simple: "Why?" },
  // "Worked out from 5 amounts entered by your household"; the source phrase
  // is added only when every evidence item was entered by a member.
  workedOutFrom: { standard: "Worked out from", simple: "Based on" },
  amountOne: "amount",
  amountMany: "amounts",
  enteredByHousehold: {
    standard: "entered by your household",
    simple: "your household entered",
  },

  // Why sheet
  whyTitle: {
    standard: "Why DhanYukti shows this",
    simple: "Why you see this",
  },
  whyReasons: { standard: "Why it needs attention", simple: "Why" },
  whyHow: { standard: "How it was worked out", simple: "How we checked" },
  whyAssumptions: { standard: "Assumptions", simple: "What we assumed" },
  whyData: { standard: "Information used", simple: "What we used" },
  whyStep: { standard: "About the next step", simple: "About the step" },
  whyNoStep: {
    standard: "No next step has been released.",
    simple: "There is no step yet.",
  },
  whyConfidence: { standard: "How sure is this?", simple: "How sure we are" },
  whyBasedOn: { standard: "Based on", simple: "Based on" },
  whyWrong: {
    standard: "Is something here wrong?",
    simple: "Is something wrong?",
  },
  whyWrongBody: {
    standard:
      "Correcting a fact and reporting a recommendation will be done from Privacy. They are not connected in this build yet.",
    simple: "Soon you can fix mistakes from Privacy. It is not ready yet.",
  },
  whyGoToPrivacy: { standard: "Go to Privacy", simple: "Open Privacy" },
  reversible: {
    standard: "Can be undone",
    simple: "You can undo it",
  },
  irreversible: {
    standard: "Can't be undone",
    simple: "You can't undo this",
  },
  reversibilityUnknown: {
    standard: "Not known whether this can be undone",
    simple: "We don't know if you can undo this",
  },
  close: "Close",

  // Coming up
  cashFlowLabel: { standard: "Cash flow", simple: "Money in and out" },
  // Cash strip: dated released facts and markers; no balance line.
  // Describes the layout only, never the engine's method.
  stripCaption: {
    standard: "One column per day, from",
    simple: "One column for each day, from",
  },
  stripFirstShort: { standard: "First short", simple: "First short" },
  stripLowest: { standard: "Lowest", simple: "Lowest" },
  stripNothingDated: {
    standard: "No dated amounts in this window.",
    simple: "No dates in this window.",
  },
  comingUpHeading: { standard: "Coming up", simple: "Coming soon" },
  comingUpEmpty: {
    standard: "No upcoming dates have been recorded.",
    simple: "No dates yet.",
  },
  moneyIn: { standard: "Money in", simple: "Money coming" },
  moneyOut: { standard: "Money out", simple: "Money going" },
  fromDate: { standard: "From", simple: "From" },
  dateNotKnown: { standard: "Date not known", simple: "No date yet" },
  datePassed: { standard: "Date passed", simple: "Date gone by" },

  // Health card
  healthHeading: {
    standard: "Financial health",
    simple: "How your money is doing",
  },
  healthIntro: {
    standard:
      "A summary of each area. It does not decide what comes first, and there is no overall score.",
    simple: "Each part of your money, one by one.",
  },
  healthUnknownNote: {
    standard:
      "“Not known yet” means we have no information. It never means none.",
    simple: "“Not known yet” does not mean zero.",
  },
  healthGapsHeading: {
    standard: "Help us fill the gaps",
    simple: "Help us fill the gaps",
  },
  questionsAboveOne: {
    standard: "1 question above could change your priority",
    simple: "1 question above could change what comes first",
  },
  // Preceded by the count, e.g. "2 questions above could change…".
  questionsAboveMany: {
    standard: "questions above could change your priority",
    simple: "questions above could change what comes first",
  },
  healthUnavailable: {
    standard: "The health summary isn't available right now",
    simple: "We can't show this right now",
  },
  healthUnavailableBody: {
    standard:
      "Nothing has been assumed in its place. Unknown areas are not treated as fine.",
    simple: "We have not guessed anything. Unknown does not mean okay.",
  },
  domain_liquidity: { standard: "Cash and bills", simple: "Money for bills" },
  domain_debt: { standard: "Loans and money owed", simple: "Loans" },
  domain_income: { standard: "Income steadiness", simple: "Income" },
  domain_protection: {
    standard: "Insurance and protection",
    simple: "Insurance",
  },
  domain_goals: "Goals",
  status_steady: { standard: "Steady", simple: "Okay" },
  status_watch: { standard: "Worth watching", simple: "Keep an eye on it" },
  status_attention: "Needs attention",
  status_not_known: "Not known yet",
  status_not_assessed: {
    standard: "Not assessed yet",
    simple: "Not checked yet",
  },
} satisfies Record<string, ModeText>;

export type HomeCopyKey = keyof typeof homeCopy;

export function resolveHomeCopy(key: HomeCopyKey, mode: DisplayMode): string {
  return resolveModeText(homeCopy[key], mode);
}
