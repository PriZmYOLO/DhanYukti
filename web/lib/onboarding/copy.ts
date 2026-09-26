/**
 * L02 wording in two display modes (Guide §4: simple and standard views).
 *
 * Only words live here. Amounts and dates are never stored in copy; they are
 * always rendered from the same data through Money/DateDisplay, so switching
 * mode cannot change a financial figure.
 */
import {
  resolveModeText,
  type DisplayMode,
  type ModeText,
} from "@/lib/display-mode";

export type { DisplayMode } from "@/lib/display-mode";

export const onboardingCopy = {
  // Shared
  demoSessionLabel: "DEMO SESSION",
  demoSessionBody: {
    standard:
      "This is not a real sign-in. It is kept only in this browser tab and ends when you close the tab. Nothing is sent to a server.",
    simple:
      "This is only a practice sign-in. It stays in this tab and goes away when you close it. Nothing is sent anywhere.",
  },
  modeGroupLabel: "Wording",
  modeStandard: "Standard",
  modeSimple: "Simple words",
  modeNote: {
    standard: "Changing the wording never changes amounts or dates.",
    simple: "Only the words change. Your numbers stay the same.",
  },
  progressLabel: "Setup steps",
  stepHousehold: { standard: "Household", simple: "Family group" },
  stepContext: "About you",
  stepMoney: { standard: "Money details", simple: "Your money" },
  stepReview: { standard: "Review", simple: "Check" },
  saveAndContinue: { standard: "Save and continue", simple: "Next" },
  loading: "Loading…",
  skip: { standard: "Skip for now", simple: "Skip" },
  dontKnow: { standard: "I don't know", simple: "Don't know" },
  statusUnanswered: "Not answered yet",
  statusUnansweredBody: {
    standard: "You have not answered this. It is not treated as zero or none.",
    simple: "You skipped this. We don't count it as zero.",
  },
  statusDontKnow: { standard: "Marked as not known", simple: "You don't know" },
  statusDontKnowBody: {
    standard: "You told us you don't know this yet. It is not treated as zero.",
    simple: "You said you don't know. We don't count it as zero.",
  },
  fixErrors: {
    standard: "Some answers need a correction before saving.",
    simple: "Please fix the marked answers.",
  },
  needSessionTitle: {
    standard: "Start a session first",
    simple: "Please sign in first",
  },
  needSessionBody: {
    standard: "Setup belongs to one person's session. Start one to continue.",
    simple: "Each person uses their own sign-in.",
  },
  needSessionAction: { standard: "Go to sign-in", simple: "Sign in" },
  needHouseholdTitle: {
    standard: "Create or join a household first",
    simple: "First, start or join a family group",
  },
  needHouseholdAction: {
    standard: "Set up household",
    simple: "Go to family group",
  },

  // Membership principle (Guide §5: membership is separate from permission)
  membershipTitle: {
    standard: "Joining a household shares nothing by itself",
    simple: "Joining does not show your money to others",
  },
  membershipBody: {
    standard:
      "Being in the same household does not let anyone see your money details, or you see theirs. Each adult decides what to share, and can change it later.",
    simple:
      "Your money details stay private. You decide what others can see, and you can change it later.",
  },

  // Welcome / sign-in
  welcomeIntro: {
    standard:
      "DhanYukti helps your household see what it can safely spend, what needs attention next, and how to adjust when life changes.",
    simple: "DhanYukti helps your family plan money and know the next step.",
  },
  principleAccountTitle: {
    standard: "Your own account",
    simple: "Only you use your account",
  },
  principleAccountBody: {
    standard: "Each adult signs in separately. Nobody signs in for you.",
    simple: "Every adult has their own sign-in.",
  },
  principleHouseholdTitle: {
    standard: "Create or join a household",
    simple: "Start or join a family group",
  },
  principleHouseholdBody: {
    standard:
      "Start a household, or join one with an invite from a family member.",
    simple: "Start a new group, or join when a family member invites you.",
  },
  signInHeading: "Sign in",
  secureSignInTitle: {
    standard: "Secure sign-in isn't connected yet",
    simple: "Real sign-in is not ready yet",
  },
  secureSignInBody: {
    standard:
      "Real sign-in will be added when the DhanYukti account service is ready. Until then you can explore with a demo session.",
    simple: "For now, you can try DhanYukti with a practice sign-in.",
  },
  demoNameLabel: {
    standard: "What should we call you? (optional)",
    simple: "Your name (you can skip this)",
  },
  demoNameHint: {
    standard: "Shown only in this demo. A nickname is enough.",
    simple: "A short name is enough.",
  },
  startDemo: { standard: "Start a demo session", simple: "Start practice" },
  signedInAs: {
    standard: "You're in a demo session as",
    simple: "You're signed in for practice as",
  },
  unnamedMember: { standard: "an unnamed member", simple: "no name given" },
  continueSetup: { standard: "Continue setup", simple: "Continue" },
  endDemo: { standard: "End demo session", simple: "Sign out" },
  demoLinkSignIn: "Sign in",
  demoLinkSession: "Demo session",

  // Household
  householdHeading: {
    standard: "Set up your household",
    simple: "Your family group",
  },
  householdIntro: {
    standard: "Choose how you're starting with DhanYukti.",
    simple: "How do you want to start?",
  },
  createTitle: {
    standard: "Create a household",
    simple: "Start a new family group",
  },
  createBody: {
    standard:
      "You'll be the first member. You can invite other adults when invitations are available.",
    simple: "You will be the first person in it.",
  },
  householdNameLabel: {
    standard: "Household name (optional)",
    simple: "Group name (you can skip this)",
  },
  householdNameHint: {
    standard: "For example, “Sharma household”. Not shared outside it.",
    simple: "For example, “Our home”.",
  },
  createAction: { standard: "Create household", simple: "Create" },
  joinTitle: {
    standard: "Join with an invite code",
    simple: "Join with a code",
  },
  joinBody: {
    standard:
      "A family member who uses DhanYukti can invite you. Enter the code they shared.",
    simple: "Type the code a family member gave you.",
  },
  inviteCodeLabel: "Invite code",
  inviteCodeRequired: "Enter the invite code you received.",
  joinAction: { standard: "Check invite", simple: "Check code" },
  linkTitle: { standard: "I received an invite link", simple: "I got a link" },
  linkBody: {
    standard:
      "Open the link on this device. It takes you to the invite page, where you can accept or decline.",
    simple: "Open the link. It shows the invite and lets you say yes or no.",
  },
  demoCodesHint:
    "Demo codes (fixture): DEMO-INVITE works, DEMO-EXPIRED has expired, DEMO-USED was already used.",
  alreadyMemberTitle: {
    standard: "You're part of a household",
    simple: "You're in a family group",
  },
  householdNameUnanswered: {
    standard: "Your household (no name given)",
    simple: "Your family group (no name)",
  },
  joinedViaCreated: {
    standard: "You created this household",
    simple: "You started this group",
  },
  joinedViaInvite: {
    standard: "You joined with an invite",
    simple: "You joined with an invite",
  },

  // Invite
  inviteHeading: { standard: "Household invite", simple: "You're invited" },
  inviteChecking: "Checking the invite…",
  inviteValidLead: {
    standard: "You've been invited to join",
    simple: "You are invited to join",
  },
  acceptAction: { standard: "Accept and join", simple: "Join" },
  declineAction: { standard: "Decline", simple: "No, thanks" },
  inviteExpiredTitle: {
    standard: "This invite has expired",
    simple: "This invite is too old",
  },
  inviteExpiredBody: {
    standard: "Ask the person who invited you to send a new one.",
    simple: "Ask for a new invite.",
  },
  inviteUsedTitle: {
    standard: "This invite has already been used",
    simple: "This invite was already used",
  },
  inviteUsedBody: {
    standard: "Each invite works once. Ask for a new one if you still need it.",
    simple: "Each invite works only once. Ask for a new one.",
  },
  inviteNotFoundTitle: {
    standard: "We couldn't find this invite",
    simple: "This code did not work",
  },
  inviteNotFoundBody: {
    standard: "Check the code, or ask for a new invite.",
    simple: "Check the code and try again.",
  },
  inviteUnavailableTitle: {
    standard: "We couldn't check this invite",
    simple: "We could not check this code",
  },
  inviteSignInFirst: {
    standard: "Start a session to respond to this invite.",
    simple: "Sign in first to answer this invite.",
  },
  inviteAlreadyMember: {
    standard:
      "You're already part of a household in this session, so this invite can't be accepted here.",
    simple: "You're already in a family group in this session.",
  },
  backToHousehold: { standard: "Back to household setup", simple: "Go back" },
  inviteAcceptFailedTitle: {
    standard: "This invite couldn't be accepted",
    simple: "We couldn't add you",
  },
  inviteAcceptFailedBody: {
    standard:
      "Nothing was changed. You may already be part of a household in this session. Check your household setup.",
    simple: "Nothing changed. You may already be in a family group.",
  },

  // Context
  contextHeading: {
    standard: "About you and your household",
    simple: "Tell us a little about you",
  },
  contextIntro: {
    standard:
      "Every question is optional. Anything you skip stays marked “not answered” — never as zero or none.",
    simple: "You can skip any question. Skipped ones stay “not answered”.",
  },
  roleLegend: {
    standard: "Your part in the household's money",
    simple: "Do you earn money?",
  },
  roleEarning: {
    standard: "I earn money for the household",
    simple: "Yes, I earn",
  },
  roleNonEarning: {
    standard: "I don't earn right now",
    simple: "No, not now",
  },
  occupationLegend: {
    standard: "What kind of work do you do?",
    simple: "What work do you do?",
  },
  occupationSalaried: {
    standard: "Salaried job",
    simple: "Job with a monthly salary",
  },
  occupationSelfEmployed: {
    standard: "Own business or self-employed",
    simple: "My own work or shop",
  },
  occupationDailyOrGig: {
    standard: "Daily wage or gig work",
    simple: "Daily or gig work",
  },
  occupationHomemaker: "Homemaker",
  occupationStudent: "Student",
  occupationRetired: "Retired",
  occupationOther: "Something else",
  incomePatternLegend: {
    standard: "How does your income arrive?",
    simple: "How do you get paid?",
  },
  incomeFixed: {
    standard: "About the same amount on a fixed date",
    simple: "Same money, same date",
  },
  incomeVaries: {
    standard: "It changes from month to month",
    simple: "It changes",
  },
  incomeNoneOwn: {
    standard: "I have no income of my own",
    simple: "I don't get income",
  },
  dependentsLabel: {
    standard: "How many people depend on your household's income?",
    simple: "How many people depend on this money?",
  },
  dependentsHint: {
    standard: "A number is enough. No names needed.",
    simple: "Just a number.",
  },
  goalLegend: {
    standard: "What matters most right now?",
    simple: "What is most important now?",
  },
  goalEducation: {
    standard: "School or education costs",
    simple: "School fees",
  },
  goalEmergency: {
    standard: "A safety cushion for emergencies",
    simple: "Money kept for emergencies",
  },
  goalDebt: { standard: "Paying off money owed", simple: "Paying back loans" },
  goalPurchase: {
    standard: "Saving for a big purchase",
    simple: "Saving to buy something big",
  },
  goalOther: "Something else",

  // Money
  moneyHeading: {
    standard: "Money details you know",
    simple: "Your money",
  },
  moneyIntro: {
    standard:
      "Add what you know and skip what you don't. Unknown or skipped amounts are never counted as zero.",
    simple: "Type what you know. Skip the rest. Skipped is not zero.",
  },
  pathManualTitle: {
    standard: "Continue with information I enter myself",
    simple: "Type in what you know",
  },
  pathManualBody: {
    standard: "No bank connection needed. You can use DhanYukti this way.",
    simple: "You don't need to link a bank.",
  },
  pathManualActive: { standard: "You're using this", simple: "Chosen" },
  pathBankTitle: {
    standard: "Connect a bank account",
    simple: "Link your bank",
  },
  pathBankBody: {
    standard:
      "See what would be asked and make your four choices. In this build approval is simulated and no bank is contacted.",
    simple: "Practise the steps. No bank is contacted.",
  },
  pathBankAction: { standard: "Link your bank", simple: "Link your bank" },
  cashSection: {
    standard: "Money you have now",
    simple: "Money you have now",
  },
  cashAmountLabel: {
    standard: "Cash and bank money available now",
    simple: "How much money do you have now?",
  },
  cashDateLabel: {
    standard: "As of which date?",
    simple: "On which day?",
  },
  incomeSection: { standard: "Regular income", simple: "Money coming in" },
  incomeAmountLabel: {
    standard: "Amount you usually receive",
    simple: "How much do you get?",
  },
  incomeNone: { standard: "No regular income", simple: "No regular income" },
  frequencyLegend: { standard: "How often?", simple: "How often?" },
  frequencyMonthly: "Every month",
  frequencyWeekly: "Every week",
  frequencyDaily: "Every day",
  frequencyIrregular: { standard: "No fixed pattern", simple: "It changes" },
  nextIncomeLabel: {
    standard: "Next expected date",
    simple: "When do you get it next?",
  },
  billSection: {
    standard: "An important bill",
    simple: "A bill you must pay",
  },
  billNameLabel: { standard: "What is the bill for?", simple: "Bill name" },
  billNameHint: {
    standard: "For example: school fee, electricity, rent.",
    simple: "Like school fee or electricity.",
  },
  billAmountLabel: { standard: "Bill amount", simple: "How much?" },
  billNone: { standard: "No bill to add", simple: "No bill" },
  billDueLabel: { standard: "Due date", simple: "Last day to pay" },
  moneyDemoNote: {
    standard:
      "Saved only in this demo session as your own entries. They are not bank data, are not checked yet, and are not added to Home.",
    simple:
      "Saved only for this practice. It is not bank data and does not change Home.",
  },

  // Review
  reviewHeading: {
    standard: "Review what you've told us",
    simple: "Check your answers",
  },
  reviewIntro: {
    standard:
      "This is exactly what you entered. Change anything before it is used.",
    simple: "Here is what you told us.",
  },
  reviewHousehold: { standard: "Household", simple: "Family group" },
  reviewContext: "About you",
  reviewMoney: { standard: "Money you entered", simple: "Your money" },
  reviewMembers: {
    standard: "Household members and what you can see",
    simple: "Who can see what",
  },
  reviewYou: "You",
  change: "Change",
  entrySource: {
    standard: "Entered by you in this demo session",
    simple: "You typed this",
  },
  candidateStatus: {
    standard: "Not yet accepted · demo only",
    simple: "Not checked yet · practice",
  },
  notOnHomeTitle: {
    standard: "Not used on Home yet",
    simple: "Home does not use this yet",
  },
  notOnHome: {
    standard:
      "These entries are not shown on Home. Home keeps showing the labelled demo household until DhanYukti's backend can check and accept information.",
    simple:
      "Home does not use these answers yet. Home still shows the practice family.",
  },
  goHome: { standard: "Go to Home", simple: "Go to Home" },
  asOf: "as of",
  dueOn: "due",
  nextOn: "next on",
  labelCash: { standard: "Cash available", simple: "Money now" },
  labelIncome: { standard: "Regular income", simple: "Money coming in" },
  labelBill: { standard: "Important bill", simple: "Bill to pay" },
  labelRole: { standard: "Your part", simple: "Earning" },
  labelOccupation: { standard: "Work", simple: "Work" },
  labelIncomePattern: {
    standard: "Income pattern",
    simple: "How you get paid",
  },
  labelDependents: { standard: "Dependents", simple: "People depending" },
  labelGoal: { standard: "Most important now", simple: "Most important" },
} satisfies Record<string, ModeText>;

export type CopyKey = keyof typeof onboardingCopy;

export function resolveCopy(key: CopyKey, mode: DisplayMode): string {
  return resolveModeText(onboardingCopy[key], mode);
}
