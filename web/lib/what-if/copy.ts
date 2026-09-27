/**
 * What-if wording (L06/L07) in both display modes.
 *
 * Only words live here. Amounts and dates come from ScenarioPort releases
 * and are rendered through Money/DateDisplay, so switching mode can never
 * change a figure. No entry contains a figure.
 */
import {
  resolveModeText,
  type DisplayMode,
  type ModeText,
} from "@/lib/display-mode";

export const whatIfCopy = {
  // Frame
  demoLabel: "DEMO SCENARIOS",
  demoBody: {
    standard:
      "Written-out results for a made-up test household, matching the product guide's test cases. No scenario engine is connected and no real money is involved.",
    simple:
      "Practice numbers for a made-up family. Nothing is connected and no real money is used.",
  },
  backToPlan: { standard: "Back to Plan", simple: "Back" },
  title: "What if…?",
  intro: {
    standard:
      "Try a change against your plan and see the before and after, day by day. Only the choices below can be previewed.",
    simple: "Pick a change and see what would happen to your money.",
  },
  loading: "Loading…",

  // Preview banner
  bannerTitle: {
    standard: "Preview, your plan is unchanged",
    simple: "Only a preview. Your plan stays the same",
  },
  bannerBody: {
    standard:
      "Nothing you choose here is saved, sent or added to Home. Your real plan changes only after a step is confirmed.",
    simple: "Nothing here is saved or sent. Home does not change.",
  },

  // Inputs
  tryHeading: { standard: "Try a change", simple: "Pick a change" },
  changeLegend: { standard: "What changes?", simple: "What happens?" },
  presetNote: {
    standard:
      "Amounts and dates are fixed presets for this test household. Other amounts need the scenario engine.",
    simple: "The amounts are fixed for practice.",
  },
  choice_emergency: { standard: "Emergency expense", simple: "A sudden cost" },
  choice_purchase: { standard: "A purchase", simple: "Buying something" },
  choice_asset: {
    standard: "A locked or private asset",
    simple: "Money you can't use now",
  },
  choice_asset_detail: {
    standard: "e.g. a fixed deposit or a member's private savings",
    simple: "like a locked deposit",
  },
  choice_provider: {
    standard: "A source doesn't respond",
    simple: "A bank doesn't answer",
  },
  choice_provider_detail: {
    standard: "Shows what a timeout looks like",
    simple: "What a delay looks like",
  },
  on: { standard: "on", simple: "on" },
  responseLegend: {
    standard: "Also try a response",
    simple: "Try a fix too",
  },
  feeDelayOption: {
    standard: "Move the school fee to salary day",
    simple: "Pay the school fee on salary day",
  },
  feeDelayNote: {
    standard: "Only if the school agrees. It has not.",
    simple: "Only if the school says yes. It hasn't.",
  },
  paymentLegend: { standard: "How is it paid?", simple: "How do you pay?" },
  payCash: { standard: "From cash", simple: "With cash" },
  payLoan: { standard: "On a loan", simple: "With a loan" },

  // Result
  resultHeading: { standard: "Before and after", simple: "Before and after" },
  sameBasis: {
    standard: "Both use the same starting picture and the same dates:",
    simple: "Both start from the same money, from",
  },
  to: "to",
  appliedHeading: {
    standard: "This preview adds",
    simple: "What we added",
  },
  movedFrom: { standard: "moved from", simple: "moved from" },
  movedTo: { standard: "to", simple: "to" },
  conditionalBadge: {
    standard: "Conditional, not accepted",
    simple: "Not agreed yet",
  },
  noFeasibleTitle: {
    standard: "No feasible option in this preview",
    simple: "No way through found",
  },
  noFeasibleBody: {
    standard:
      "No permitted response keeps cash above zero before payday. DhanYukti never fills a shortfall with borrowing for you. Nothing has been changed.",
    simple:
      "Nothing we can try keeps your money above zero before salary. We never borrow for you. Nothing changed.",
  },
  residualLabel: {
    standard: "Still unfunded before payday",
    simple: "Still short before salary",
  },
  pendingTitle: {
    standard: "Result pending. It is not zero",
    simple: "Still waiting. This is not zero",
  },
  pendingCell: { standard: "Pending", simple: "Waiting" },
  loanTitle: {
    standard: "Total cost needs full loan terms",
    simple: "We need the full loan details",
  },
  loanBorrowed: { standard: "Amount borrowed", simple: "Loan amount" },
  loanMissing: { standard: "Still needed:", simple: "We still need:" },
  loanNoTotal: {
    standard:
      "No total cost is shown until every term is known. A lower instalment alone does not mean a lower cost.",
    simple: "We won't guess the total. A smaller EMI is not always cheaper.",
  },
  cantCompareTitle: {
    standard: "These results can't be compared",
    simple: "We can't compare these",
  },
  cantCompareBody: {
    standard:
      "They were not worked out from the same starting picture and dates, so they are not shown side by side.",
    simple: "They don't start from the same money, so we don't compare them.",
  },
  unreadableTitle: {
    standard: "Day-by-day figures could not be read",
    simple: "We couldn't read the daily numbers",
  },
  loadFailedTitle: {
    standard: "This preview could not be loaded",
    simple: "We couldn't load this",
  },
  loadFailedBody: {
    standard: "Nothing has been assumed in its place. Try again later.",
    simple: "We haven't guessed anything. Try again later.",
  },
  assumptionsHeading: {
    standard: "Assumptions",
    simple: "What we assumed",
  },

  // Chart
  chartCaption: {
    standard: "Closing cash at the end of each day",
    simple: "Money left at the end of each day",
  },
  legendToday: { standard: "Plan today", simple: "Now" },
  legendWhatIf: { standard: "With this change", simple: "With the change" },
  floorLine: { standard: "Agreed floor", simple: "Cushion" },
  zeroLine: { standard: "Zero", simple: "Zero" },
  lowest: { standard: "Lowest", simple: "Lowest" },
  aboveChart: {
    standard: "Above the chart:",
    simple: "Too high to draw:",
  },
  dayTableSummary: {
    standard: "Day-by-day figures",
    simple: "Each day's numbers",
  },
  dayColumn: { standard: "Day", simple: "Day" },
  whatIfNotDrawn: {
    standard: "The change is not drawn: its result is pending.",
    simple: "The change isn't drawn: we are still waiting.",
  },

  // Key figures
  figuresCaption: { standard: "Key figures", simple: "Main numbers" },
  firstShortfall: {
    standard: "First shortfall",
    simple: "First day money runs out",
  },
  lowestPoint: { standard: "Lowest point", simple: "Lowest amount" },
  belowFloorBy: {
    standard: "Below the agreed floor by",
    simple: "Below your cushion by",
  },
  noShortfall: {
    standard: "None in this period",
    simple: "Doesn't run out",
  },

  // Dates (L06)
  datesHeading: { standard: "Dates in your plan", simple: "Coming dates" },
  datesIntro: {
    standard:
      "Confirmed dates were entered or confirmed by a member. Inferred dates were assumed and may be wrong.",
    simple: "Confirmed means a person told us. Inferred means we guessed.",
  },
  confirmed: { standard: "Confirmed", simple: "Confirmed" },
  inferred: { standard: "Inferred", simple: "Our guess" },
  moneyIn: { standard: "Money in", simple: "Money in" },
  moneyOut: { standard: "Money out", simple: "Money out" },
  suggestedDate: {
    standard: "Suggested later date:",
    simple: "Maybe later:",
  },
  datesUnavailableTitle: {
    standard: "Dates are not available",
    simple: "We can't show the dates",
  },

  // Goal (L06)
  goalHeading: { standard: "Goal funding", simple: "Your goal" },
  goalTarget: { standard: "Target", simple: "Goal" },
  goalBefore: { standard: "Before this plan", simple: "Now" },
  goalAfter: { standard: "With this plan", simple: "With the plan" },
  goalEarmarked: { standard: "Already set aside", simple: "Saved already" },
  goalContributions: {
    standard: "Planned contributions",
    simple: "Money to add",
  },
  goalGap: { standard: "Still to fund", simple: "Still needed" },
  goalTimes: "×",
  goalEarmarkNote: {
    standard: "Money set aside is part of your cash, not extra money.",
    simple: "Saved money is not extra money.",
  },
  approve: { standard: "Approve this plan", simple: "Say yes to this plan" },
  draftTitle: {
    standard: "Draft: not approved yet",
    simple: "Draft only. Not done yet",
  },
  draftBody: {
    standard:
      "This is a draft of the plan above. Approving and recording it belongs to the action service (L08), which is not connected in this build. Your plan has not changed.",
    simple:
      "This is only a draft. Saying yes is not connected yet, so nothing changed.",
  },
  draftConfirm: {
    standard: "Confirm (not available in this build)",
    simple: "Confirm (not available yet)",
  },
  draftDiscard: { standard: "Discard draft", simple: "Throw away draft" },
  goalUnavailableTitle: {
    standard: "Goal funding is not available",
    simple: "We can't show the goal",
  },
} satisfies Record<string, ModeText>;

export type WhatIfCopyKey = keyof typeof whatIfCopy;

export function resolveWhatIfCopy(
  key: WhatIfCopyKey,
  mode: DisplayMode,
): string {
  return resolveModeText(whatIfCopy[key], mode);
}
