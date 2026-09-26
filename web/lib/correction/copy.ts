/**
 * L05 wording (fact corrections, recalculation, the owner-only view) in both
 * display modes.
 *
 * Only words live here. Amounts and dates come from the ports and are
 * rendered through Money/DateDisplay, so switching mode can never change a
 * fact. No entry contains a figure.
 */
import {
  resolveModeText,
  type DisplayMode,
  type ModeText,
} from "@/lib/display-mode";

export const correctionCopy = {
  // Recalculation (Home, Why)
  recalcTitle: {
    standard: "Your household picture will be recalculated",
    simple: "We will work out your money again",
  },
  recalcBody: {
    standard:
      "Something it was built from has changed, so its figures are out of date. They are hidden rather than shown stale, and nothing has been assumed in their place.",
    simple: "Something changed, so the old numbers are hidden. We don't guess.",
  },
  recalcSince: { standard: "Since", simple: "Since" },
  cause_source_revoked: {
    standard: "You revoked access to a source.",
    simple: "You stopped sharing a bank link.",
  },
  cause_correction_accepted: {
    standard: "A correction you proposed was accepted.",
    simple: "A fix you sent was accepted.",
  },
  recalcDemo: {
    standard:
      "Demo: nothing is recalculated in this build. This stays until you end the practice session or reset the demo corrections.",
    simple: "Practice only: this stays until you reset it.",
  },
  recalcOpenCorrections: {
    standard: "Your corrections",
    simple: "Your fixes",
  },
  recalcOpenPrivacy: { standard: "Privacy", simple: "Privacy" },

  // Correction flow
  correctIntro: {
    standard:
      "Choose the fact, say what it should be and why. It stays a proposal until it is checked; the original stays in your plan until then.",
    simple:
      "Pick what is wrong and tell us why. Nothing changes until we check it.",
  },
  pickLegend: { standard: "Which fact is wrong?", simple: "What is wrong?" },
  pickHint: {
    standard: "Only facts that belong to you are listed.",
    simple: "Only your own details are shown.",
  },
  fieldLegend: {
    standard: "What is wrong with it?",
    simple: "Which part is wrong?",
  },
  field_amount: { standard: "The amount", simple: "The money" },
  field_effective_on: { standard: "The date", simple: "The date" },
  proposedAmountLabel: {
    standard: "What should the amount be? (₹)",
    simple: "How much should it be? (₹)",
  },
  proposedDateLabel: {
    standard: "What should the date be?",
    simple: "What is the right date?",
  },
  reasonLabel: { standard: "Why is it wrong?", simple: "Why?" },
  reasonHint: {
    standard: "For example, “The bill came in lower this month”.",
    simple: "For example, “The bill was less this month”.",
  },
  previewAction: {
    standard: "Preview what would change",
    simple: "See what would change",
  },
  previewHeading: {
    standard: "What would change if it is accepted",
    simple: "If we accept it",
  },
  preview_amount: {
    standard:
      "Your household picture would be recalculated with the new amount.",
    simple: "We would work out your money again with the new amount.",
  },
  preview_effective_on: {
    standard: "Your household picture would be recalculated with the new date.",
    simple: "We would work out your money again with the new date.",
  },
  previewPriority: {
    standard: "Your current priority rests on this fact:",
    simple: "Your main task uses this:",
  },
  previewConsequence: {
    standard: "The consequence of waiting would be worked out again.",
    simple: "What happens if you wait would change too.",
  },
  previewNotInPriority: {
    standard:
      "Your current priority doesn't rest on this fact, but other parts of your plan may use it.",
    simple: "Your main task doesn't use this, but other parts may.",
  },
  previewNoFigures: {
    standard:
      "No new figures are worked out on this screen. Until a decision, nothing changes and the original stays in your plan.",
    simple: "We don't work out new numbers here. Nothing changes yet.",
  },
  previewEdit: { standard: "Change it", simple: "Change" },
  submitAction: {
    standard: "Propose this correction",
    simple: "Send this fix",
  },
  pickRequired: {
    standard: "Choose the fact that is wrong.",
    simple: "Pick what is wrong.",
  },
  fieldRequired: {
    standard: "Choose what is wrong with it.",
    simple: "Pick which part is wrong.",
  },
  valueRequired: {
    standard: "Please fill this in.",
    simple: "Please fill this in.",
  },
  reasonRequired: {
    standard: "Please say why it is wrong.",
    simple: "Please tell us why.",
  },
  sameValue: {
    standard: "This is the same as the value in your plan.",
    simple: "This is the same as now.",
  },
  proposedAnnouncement: {
    standard: "Correction proposed. It is not accepted yet.",
    simple: "Fix sent. Not accepted yet.",
  },
  factsUnavailableTitle: {
    standard: "Your facts can't be shown right now",
    simple: "We can't show your details right now",
  },
  noFactsTitle: {
    standard: "No facts of yours to correct",
    simple: "Nothing of yours to fix",
  },
  noFactsBody: {
    standard:
      "Your household picture holds no facts that belong to you yet. That doesn't mean there is nothing to record.",
    simple: "We have no details from you yet.",
  },

  // Corrections list
  listHeading: { standard: "Your corrections", simple: "Your fixes" },
  listEmpty: {
    standard: "You haven't proposed any corrections.",
    simple: "You haven't sent any fixes.",
  },
  status_proposed: {
    standard: "Proposed — not accepted",
    simple: "Sent — not accepted yet",
  },
  status_proposed_body: {
    standard:
      "Nothing has changed yet. The original stays in your plan until the correction is checked.",
    simple: "Nothing has changed yet.",
  },
  status_accepted: { standard: "Accepted", simple: "Accepted" },
  status_accepted_body: {
    standard: "Your household picture will be recalculated with it.",
    simple: "We will work out your money again with it.",
  },
  status_rejected: { standard: "Rejected", simple: "Not accepted" },
  status_rejected_body: {
    standard: "The original stays in your plan.",
    simple: "The old detail stays.",
  },
  labelOriginal: { standard: "In your plan", simple: "Now" },
  labelProposed: { standard: "You proposed", simple: "You said" },
  labelYourReason: { standard: "Your reason", simple: "Why" },
  labelReviewReason: { standard: "Reason given", simple: "Why not" },
  proposedOn: { standard: "Proposed", simple: "Sent" },
  decidedOn: { standard: "Decided", simple: "Decided" },
  originalMissing: {
    standard: "This fact isn't in your current picture.",
    simple: "We can't find this detail now.",
  },

  // Demo review
  demoReviewTitle: {
    standard: "Simulate the review (demo)",
    simple: "Practice review",
  },
  demoReviewBody: {
    standard:
      "Stands in for whoever checks a correction. Nothing is checked or sent.",
    simple: "Practice only. Nobody checks it.",
  },
  demoAccept: { standard: "Simulate accept", simple: "Practice: accept" },
  demoReject: { standard: "Simulate reject", simple: "Practice: reject" },
  demoReset: {
    standard: "Reset demo corrections",
    simple: "Reset practice fixes",
  },
  demoResetBody: {
    standard:
      "Forgets every correction and shows the unchanged demo picture again.",
    simple: "Clears your fixes and shows the practice numbers again.",
  },

  // Why sheet
  whyCorrect: { standard: "Correct this", simple: "Fix this" },
  whyPending: {
    standard: "Correction proposed — not accepted",
    simple: "Fix sent — not accepted yet",
  },

  // Owner-only view
  privateTitle: {
    standard: "Only you can see this",
    simple: "Only you see this",
  },
  privateIntro: {
    standard:
      "Your private items. They aren't shared with your household, aren't counted in any household figure, and nobody else is told they exist — not even how many there are.",
    simple:
      "These are only yours. Your family doesn't see them or know about them.",
  },
  privateDemo: {
    standard: "Demo items (fixture), loaded only in this tab for this member.",
    simple: "Practice items, only in this tab.",
  },
  holdingsHeading: {
    standard: "What you hold privately",
    simple: "Your private money",
  },
  holdingsEmpty: {
    standard: "No private items recorded. That doesn't mean you have none.",
    simple: "Nothing private recorded.",
  },
  notCounted: {
    standard: "Not in household totals · not shown to relatives",
    simple: "Not added to family totals · family can't see it",
  },
  nudgesHeading: { standard: "Reminders for you", simple: "For you" },
  nudgesEmpty: {
    standard: "No private reminders right now.",
    simple: "No reminders now.",
  },
  nudgeBy: { standard: "By", simple: "By" },
  nudgePreview: {
    standard:
      "UI preview: written by the DhanYukti team, not by the decision engine.",
    simple: "Sample only, not from DhanYukti's rules.",
  },
  noHouseholdTitle: {
    standard: "Create or join a household first",
    simple: "First, start or join a family group",
  },
  noHouseholdBody: {
    standard:
      "Private items belong to you as a member of a household. Nothing is shown until you are in one.",
    simple: "Join a family group to see this.",
  },
  noHouseholdAction: {
    standard: "Set up your household",
    simple: "Set up",
  },
  privateUnavailableTitle: {
    standard: "Your private items can't be shown right now",
    simple: "We can't show this right now",
  },
} satisfies Record<string, ModeText>;

export type CorrectionCopyKey = keyof typeof correctionCopy;

export function resolveCorrectionCopy(
  key: CorrectionCopyKey,
  mode: DisplayMode,
): string {
  return resolveModeText(correctionCopy[key], mode);
}
