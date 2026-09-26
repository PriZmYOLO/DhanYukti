/**
 * L04 wording (permissions and import states) in both display modes.
 *
 * Only words live here. Amounts, dates and counts come from the port and are
 * rendered through Money/DateDisplay (or marked `data-fact`), so switching
 * mode can never change a fact.
 */
import {
  resolveModeText,
  type DisplayMode,
  type ModeText,
} from "@/lib/display-mode";

export const consentCopy = {
  // Frame and demo labelling
  demoLabel: "DEMO — NO BANK CONTACTED",
  demoBody: {
    standard:
      "Practice permissions only. Everything stays in this browser tab. No bank, Account Aggregator or DhanYukti server is contacted.",
    simple:
      "This is only practice. It stays in this tab. We don't contact any bank.",
  },
  backToPrivacy: { standard: "Back to Privacy", simple: "Back" },
  loading: "Loading…",

  // No session
  noSessionBody: {
    standard:
      "Permissions belong to one person, so start a practice session to see yours.",
    simple: "Start practice first. Your choices belong only to you.",
  },
  noSessionAction: "Start a practice session",

  // Privacy dashboard
  privacyTitle: "Privacy",
  privacyIntro: {
    standard:
      "What you share, with whom and for what purpose. You can revoke access at any time without asking anyone.",
    simple:
      "See what you share and who sees it. You can stop sharing any time.",
  },
  choicesHeading: { standard: "Your four choices", simple: "Your choices" },
  choicesLead: {
    standard:
      "Each choice is separate. Joining a household turns none of them on.",
    simple: "Each one is separate. Joining a family turns none of them on.",
  },
  grantGiven: { standard: "Given for", simple: "Yes, for" },
  grantSources: { standard: "source(s)", simple: "bank link(s)" },
  grantNotGiven: { standard: "Not given", simple: "No" },
  linksHeading: { standard: "Linked sources", simple: "Your bank links" },
  linksEmptyTitle: {
    standard: "No source linked yet",
    simple: "No bank linked yet",
  },
  linksEmptyBody: {
    standard:
      "Nothing has been shared from a bank. This doesn't mean you have no bank account.",
    simple: "You haven't shared any bank data. That's fine.",
  },
  addHeading: { standard: "Add a source", simple: "Add money details" },
  linkBankTitle: { standard: "Link your bank", simple: "Link your bank" },
  linkBankBody: {
    standard:
      "Share savings account transactions through a regulated Account Aggregator. You'll see exactly what is asked before you agree.",
    simple: "Share your bank records safely. We show you everything first.",
  },
  linkBankAction: { standard: "Start linking", simple: "Start" },
  uploadTitle: {
    standard: "Upload a bank statement",
    simple: "Upload a bank statement",
  },
  uploadUnavailable: {
    standard: "Not available in this build",
    simple: "Not ready yet",
  },
  uploadBody: {
    standard:
      "Statement upload isn't connected yet, so no file can be sent. Nothing is uploaded from this page.",
    simple: "You can't upload files yet. Nothing is sent.",
  },
  feedbackHeading: {
    standard: "Something not right?",
    simple: "Something wrong?",
  },
  correctTitle: { standard: "Correct a fact", simple: "Fix a wrong detail" },
  correctBody: {
    standard:
      "Tell us which fact is wrong. It stays a proposal until it is checked and accepted.",
    simple: "Tell us what is wrong. We check it before changing anything.",
  },
  privateHeading: { standard: "Kept private", simple: "Only yours" },
  privateCardTitle: {
    standard: "Only you can see this",
    simple: "Only you see this",
  },
  privateCardBody: {
    standard:
      "What you keep private. Nobody else in the household sees it or is told it exists.",
    simple: "Your private money. Your family can't see it.",
  },
  reportTitle: {
    standard: "Report a recommendation",
    simple: "Report a suggestion",
  },
  reportBody: {
    standard: "Flag a suggested step that seems wrong, unsuitable or unclear.",
    simple: "Tell us if a suggestion seems wrong or doesn't suit you.",
  },
  openAction: "Open",

  // The four grants
  grant_source_access: {
    standard: "Read your bank data",
    simple: "Read your bank data",
  },
  grant_source_access_body: {
    standard:
      "Let DhanYukti fetch the savings account transactions described above.",
    simple: "Let DhanYukti get your savings account records.",
  },
  grant_household_computation: {
    standard: "Use it in the household plan",
    simple: "Use it for the family plan",
  },
  grant_household_computation_body: {
    standard:
      "Include this data when working out the household picture. If off, it is used only for your own private view.",
    simple: "Count it in the family plan. If off, only you use it.",
  },
  grant_viewer: {
    standard: "Who can see the results",
    simple: "Who can see the results",
  },
  grant_viewer_body: {
    standard:
      "Results only — other adults never see your transactions or balances line by line.",
    simple: "Others never see your bank records.",
  },
  viewer_only_me: { standard: "Only me", simple: "Only me" },
  viewer_household_adults: {
    standard: "Adults in my household",
    simple: "Grown-ups in my family",
  },
  grant_alerts_and_actions: {
    standard: "Alerts and suggested actions",
    simple: "Alerts and tips",
  },
  grant_alerts_and_actions_body: {
    standard:
      "Send you alerts and suggest next steps based on this data. Nothing is ever done without your confirmation.",
    simple: "Warn you and suggest steps. We never act without asking you.",
  },
  turnedOn: { standard: "On", simple: "Yes" },
  turnedOff: { standard: "Off", simple: "No" },

  // Pre-consent explainer
  connectTitle: {
    standard: "Before you link your bank",
    simple: "Before you link your bank",
  },
  connectIntro: {
    standard:
      "Read what will be asked. Nothing is shared until you approve it in the Account Aggregator app.",
    simple: "Here is what we ask for. Nothing is shared until you say yes.",
  },
  termsHeading: { standard: "What is being asked", simple: "What we ask" },
  termWho: { standard: "Who is asking", simple: "Who asks" },
  termWhoValue: {
    standard: "DhanYukti, through a regulated Account Aggregator partner",
    simple: "DhanYukti, through a licensed data-sharing partner",
  },
  termPartner: { standard: "Partner", simple: "Partner" },
  partnerNotNamed: {
    standard: "Partner not yet named",
    simple: "Not decided yet",
  },
  termWhat: { standard: "What data", simple: "What" },
  data_savings_account_transactions: {
    standard: "Savings account transactions",
    simple: "Your savings account records",
  },
  historyLead: { standard: "from the last", simple: "for the last" },
  months: "months",
  termWhy: { standard: "Why", simple: "Why" },
  purpose_budgeting: {
    standard: "Budgeting",
    simple: "Planning your spending",
  },
  purpose_bill_protection: {
    standard: "Protecting upcoming bills",
    simple: "Making sure bills get paid",
  },
  termHowOften: { standard: "How often", simple: "How often" },
  frequency_on_approval_then_daily: {
    standard: "Once when you approve, then at most once a day",
    simple: "Once now, then at most once a day",
  },
  termKept: { standard: "How long it's kept", simple: "How long we keep it" },
  retention_while_consent_active: {
    standard:
      "Only while your permission lasts. When it ends or you revoke it, the data is removed from your plan.",
    simple:
      "Only while you allow it. When you stop, we take it out of your plan.",
  },
  termLasts: { standard: "Permission lasts", simple: "Lasts for" },
  termRevoke: {
    standard: "You can revoke anytime",
    simple: "You can stop any time",
  },
  termRevokeBody: {
    standard: "From the Privacy page, without asking anyone in your household.",
    simple: "From the Privacy page. You don't need anyone's OK.",
  },
  notStated: { standard: "Not stated", simple: "Not given" },
  termsProvisional: {
    standard:
      "These terms are provisional in this build. The final terms are shown to you for approval in the Account Aggregator app.",
    simple:
      "These may change. You will see the final version in the approval app.",
  },
  choicesFormHeading: {
    standard: "Four separate choices",
    simple: "Four separate choices",
  },
  choicesFormLead: {
    standard:
      "Each starts off. Joining a family grants none of them. Only the first is needed to link a bank.",
    simple:
      "All start off. Joining a family doesn't turn them on. Only the first one is needed.",
  },
  required: { standard: "Needed to link", simple: "Needed" },
  optional: "Optional",
  sourceRequiredError: {
    standard:
      "Linking a bank needs permission to read its data. The other three choices are optional.",
    simple:
      "To link a bank, turn on the first choice. The others are up to you.",
  },
  continueToApproval: {
    standard: "Continue to approval",
    simple: "Next",
  },
  cancel: { standard: "Cancel", simple: "Go back" },

  // Handoff
  handoffTitle: {
    standard: "Approve in the Account Aggregator app",
    simple: "Say yes in the approval app",
  },
  handoffIntro: {
    standard:
      "You'll approve this in the Account Aggregator app (Anumati), not in DhanYukti.",
    simple: "You say yes in the Account Aggregator app (Anumati), not here.",
  },
  handoffStep1: {
    standard: "Check the request matches what you saw here.",
    simple: "Check it matches what you saw here.",
  },
  handoffStep2: {
    standard:
      "Choose which savings accounts to share, then approve or decline.",
    simple: "Pick your accounts, then say yes or no.",
  },
  handoffStep3: {
    standard: "Come back here to see what arrived and when.",
    simple: "Come back here to see what came in.",
  },
  handoffOtp: {
    standard:
      "DhanYukti never asks for your bank password or OTP. Don't share them with anyone.",
    simple: "We never ask for your bank password or OTP. Keep them secret.",
  },
  simulatedTitle: "Simulated approval, no bank contacted",
  simulatedBody: {
    standard:
      "The Account Aggregator app isn't connected in this build. These buttons stand in for your decision there. No bank or app is contacted and no data is fetched.",
    simple:
      "The approval app isn't connected yet. These buttons pretend you answered there. No bank is contacted.",
  },
  simulateApprove: { standard: "Simulate approval", simple: "Pretend: yes" },
  simulateDecline: { standard: "Simulate decline", simple: "Pretend: no" },
  handoffNotFoundTitle: {
    standard: "This request isn't in your session",
    simple: "We can't find this request",
  },
  handoffNotFoundBody: {
    standard:
      "It may belong to another session, or it was cleared. Start again from Privacy.",
    simple: "Please start again from the Privacy page.",
  },
  handoffUnavailableTitle: {
    standard: "Approval can't start right now",
    simple: "Approval isn't working now",
  },
  seeInPrivacy: { standard: "See it in Privacy", simple: "Go to Privacy" },
  backToSetup: { standard: "Back to setup", simple: "Back to setup" },

  // Link states: titles and bodies
  state_requested: { standard: "Requested", simple: "Asked" },
  state_requested_body: {
    standard:
      "The request was created but not yet sent for approval. Nothing is fetched.",
    simple: "We made the request. Nothing is shared yet.",
  },
  state_awaiting_approval: {
    standard: "Awaiting your approval",
    simple: "Waiting for your yes",
  },
  state_awaiting_approval_body: {
    standard:
      "Waiting for you to approve or decline in the Account Aggregator app. Nothing is fetched until you approve.",
    simple: "Waiting for your answer in the approval app. Nothing shared yet.",
  },
  state_processing: { standard: "Still processing", simple: "Still coming in" },
  state_processing_body: {
    standard:
      "Permission is active and data is on its way. Until it arrives nothing is counted — not even zero.",
    simple: "Your bank data is on its way. We don't count it as zero.",
  },
  state_active: { standard: "Active", simple: "Working" },
  state_active_body: {
    standard: "Permission is active and data has arrived.",
    simple: "Sharing is on and your data came in.",
  },
  state_partial: {
    standard: "Partly received",
    simple: "Only some came in",
  },
  state_partial_body: {
    standard:
      "Some accounts arrived and some did not. Missing accounts are not counted as zero.",
    simple: "Some accounts came in. Missing ones are not counted as zero.",
  },
  state_failed: { standard: "Import failed", simple: "Didn't work" },
  state_failed_body: {
    standard:
      "Permission is active but the data could not be fetched. Nothing has been assumed in its place.",
    simple: "Sharing is on, but the data didn't come. We guessed nothing.",
  },
  state_denied: { standard: "Declined", simple: "You said no" },
  state_denied_body: {
    standard: "The request was declined, so nothing is fetched or used.",
    simple: "You said no, so we use nothing.",
  },
  state_expired: { standard: "Expired", simple: "Ended" },
  state_expired_body: {
    standard:
      "The permission period ended, so this data is no longer used. You can link again.",
    simple: "The time ran out, so we stopped using it.",
  },
  state_revoked: { standard: "Revoked", simple: "Stopped" },
  state_revoked_body: {
    standard:
      "Data removed from your plan; your household picture will be recalculated.",
    simple:
      "We took this data out of your plan. Your family's money picture will be worked out again.",
  },
  state_unknown: {
    standard: "Status not known",
    simple: "We don't know the status",
  },
  state_unknown_body: {
    standard:
      "This status couldn't be read. Nothing is assumed about this source.",
    simple: "We can't read this status. We assume nothing.",
  },
  revokeDemoNote: {
    standard:
      "Demo: only the status changed here. There was no bank data or plan to remove.",
    simple: "Practice only: just the status changed.",
  },

  // Link card details
  detailPurpose: { standard: "Purpose", simple: "Why" },
  detailScope: { standard: "Data", simple: "What" },
  detailFrequency: { standard: "How often", simple: "How often" },
  detailRequested: { standard: "Requested", simple: "Asked on" },
  detailSentForApproval: {
    standard: "Sent for approval",
    simple: "Sent to you",
  },
  detailDeclinedOn: { standard: "Declined on", simple: "You said no on" },
  detailRevokedOn: { standard: "Revoked on", simple: "Stopped on" },
  detailActiveFrom: { standard: "Active from", simple: "Started" },
  detailExpires: { standard: "Expires", simple: "Ends" },
  detailExpired: { standard: "Expired on", simple: "Ended on" },
  detailLastAttempt: { standard: "Last attempt", simple: "Last tried" },
  expiryNotSet: {
    standard: "Set when approved",
    simple: "Set after you say yes",
  },
  grantsHeading: {
    standard: "Your choices for this source",
    simple: "Your choices",
  },
  accountsHeading: { standard: "Accounts", simple: "Accounts" },
  accountsSummaryLead: { standard: "Received", simple: "Came in" },
  accountsSummaryOf: "of",
  account_received: { standard: "Received", simple: "Came in" },
  account_processing: { standard: "Still processing", simple: "Still coming" },
  account_failed: { standard: "Not received", simple: "Didn't come" },
  accountCovers: { standard: "Transactions from", simple: "Records from" },
  accountTo: "to",
  accountCoversUnknown: {
    standard: "Period not known yet",
    simple: "Dates not known yet",
  },
  accountFetched: { standard: "Received on", simple: "Came in on" },
  accountBalance: { standard: "Balance", simple: "Money in account" },
  balanceProcessing: {
    standard: "Still processing — not zero",
    simple: "Still coming — not zero",
  },
  balanceFailed: {
    standard: "Not received — not zero",
    simple: "Didn't come — not zero",
  },
  balanceNotKnown: "Not known",
  balanceDemo: { standard: "Demo figure", simple: "Practice number" },

  // Revoke
  revokeAction: { standard: "Revoke", simple: "Stop sharing" },
  revokeConfirmTitle: {
    standard: "Revoke access to this source?",
    simple: "Stop sharing this bank?",
  },
  revokeConfirmBody: {
    standard:
      "DhanYukti stops fetching from it and removes its data from your plan. Your household picture is then recalculated. You don't need anyone's approval.",
    simple:
      "We stop getting this data and take it out of your plan. You don't need anyone's OK.",
  },
  revokeConfirm: { standard: "Yes, revoke", simple: "Yes, stop" },
  revokeKeep: { standard: "Keep access", simple: "No, keep it" },
  revokedAnnouncement: {
    standard: "Access revoked.",
    simple: "Sharing stopped.",
  },

  // Demo states panel
  demoStatesTitle: {
    standard: "Demo states",
    simple: "Practice examples",
  },
  demoStatesBody: {
    standard:
      "Load one made-up example of every link state, with fixed fixture dates. Replaces the demo links in this tab.",
    simple: "Show one practice example of each state.",
  },
  demoStatesLoad: {
    standard: "Show every state (demo)",
    simple: "Show examples",
  },
  demoStatesClear: {
    standard: "Clear demo links",
    simple: "Clear examples",
  },

  // Correct a fact / report a recommendation
  reportIntro: {
    standard:
      "Tell us what is wrong with a suggested step. Reporting it doesn't change or cancel anything by itself.",
    simple: "Tell us what is wrong with a suggestion.",
  },
  reportReasonLegend: {
    standard: "What's the problem?",
    simple: "What's wrong?",
  },
  reason_wrong_fact: {
    standard: "It's based on a wrong fact",
    simple: "A detail is wrong",
  },
  reason_not_suitable: {
    standard: "It doesn't suit our situation",
    simple: "It doesn't suit us",
  },
  reason_unclear: {
    standard: "It's hard to understand",
    simple: "It's confusing",
  },
  reason_privacy: {
    standard: "It reveals something private",
    simple: "It shows something private",
  },
  reason_other: { standard: "Something else", simple: "Something else" },
  reportDetailsLabel: {
    standard: "Details (optional)",
    simple: "More details (optional)",
  },
  reportSubmit: { standard: "Save report", simple: "Save" },
  reasonRequired: {
    standard: "Please choose what the problem is.",
    simple: "Please pick one.",
  },
  feedbackSavedTitle: {
    standard: "Saved as a proposal in this tab",
    simple: "Saved in this tab",
  },
  feedbackSavedBody: {
    standard:
      "Not sent and not resolved. The report service isn't connected in this build, so nothing has changed and nobody has been notified.",
    simple: "Not sent to anyone yet. Nothing has changed.",
  },
  feedbackSavedOn: { standard: "Saved", simple: "Saved on" },
  feedbackAnother: { standard: "Write another", simple: "Write another" },

  // Live Account Aggregator (Anumati FIU module)
  liveLabel: "LIVE ACCOUNT AGGREGATOR · ANUMATI SANDBOX",
  liveBody: {
    standard:
      "Bank linking uses the real Account Aggregator flow on Anumati's test sandbox. Accounts and balances come from Anumati's test banks, not real money.",
    simple:
      "This uses the real approval app, with test banks. The money shown is not real.",
  },
  frequency_once_on_approval: {
    standard: "Once, when you approve",
    simple: "Once, when you say yes",
  },
  purpose_aggregated_statement: {
    standard: "A combined statement of your accounts",
    simple: "One statement of all your accounts",
  },
  mobileHeading: {
    standard: "Your mobile number",
    simple: "Your phone number",
  },
  mobileLabel: {
    standard: "Mobile number registered with your bank",
    simple: "Phone number your bank knows",
  },
  mobileHint: {
    standard:
      "Anumati uses it to find your accounts and send you a one-time code. DhanYukti passes it to Anumati and doesn't keep it.",
    simple: "Anumati uses it to find your accounts. We don't keep it.",
  },
  mobileInvalid: {
    standard: "Enter a 10-digit mobile number.",
    simple: "Please type 10 digits.",
  },
  mobileSubmit: {
    standard: "Continue to Anumati",
    simple: "Next",
  },
  redirectTitle: {
    standard: "Approve in Anumati",
    simple: "Say yes in Anumati",
  },
  redirectBody: {
    standard:
      "Anumati opens in a new tab. Approve or decline there. This page updates by itself when Anumati tells DhanYukti what you decided.",
    simple:
      "Anumati opens in a new tab. Answer there. This page will change by itself.",
  },
  openAnumati: { standard: "Open Anumati", simple: "Open Anumati" },
  waitingForProvider: {
    standard: "Checking for updates from Anumati…",
    simple: "Waiting for Anumati…",
  },
  activityHeading: { standard: "What happened", simple: "What happened" },
  activity_requested: {
    standard: "Request created in DhanYukti",
    simple: "Request made",
  },
  activity_sent_to_aa: {
    standard: "Consent request sent to Anumati",
    simple: "Sent to Anumati",
  },
  activity_approved: {
    standard: "Approved in Anumati",
    simple: "You said yes",
  },
  activity_declined: {
    standard: "Declined in Anumati",
    simple: "You said no",
  },
  activity_data_ready: {
    standard: "Anumati said the data is ready",
    simple: "Data ready",
  },
  activity_fetched: {
    standard: "Data collected and opened on DhanYukti's server",
    simple: "Data received",
  },
  activity_fetch_failed: {
    standard: "Collecting the data failed",
    simple: "Couldn't get the data",
  },
  activity_decrypt_failed: {
    standard: "Some data couldn't be opened",
    simple: "Some data couldn't be opened",
  },
  activity_revoked: {
    standard: "Revoked in DhanYukti; the data was deleted",
    simple: "Stopped; data deleted",
  },
  activity_expired: {
    standard: "Consent expired; the data was deleted",
    simple: "Time ran out; data deleted",
  },
  activity_paused: {
    standard: "Consent paused in Anumati",
    simple: "Paused in Anumati",
  },
  activity_consent_failed: {
    standard: "Anumati reported the consent failed",
    simple: "Anumati said it failed",
  },
  revokeLiveNote: {
    standard:
      "DhanYukti has deleted its copy and will refuse any late data. To end the consent at the Account Aggregator too, revoke it in the Anumati app.",
    simple:
      "We deleted our copy. To stop it in Anumati too, stop it in the Anumati app.",
  },
  sourceAnumatiSandbox: {
    standard: "Anumati AA sandbox (test bank)",
    simple: "Anumati test bank",
  },
  sourceAnumati: {
    standard: "Anumati Account Aggregator",
    simple: "Anumati",
  },

  // Government protection check (Jan Suraksha: PMJJBY + PMSBY), Job 2a
  schemeHeading: {
    standard: "Government insurance check",
    simple: "Government insurance check",
  },
  schemeLead: {
    standard:
      "Public schemes come first. DhanYukti earns nothing from them and shows them before any private insurance.",
    simple: "Government schemes first. We earn nothing from them.",
  },
  scheme_pmjjby: {
    standard: "PMJJBY · Pradhan Mantri Jeevan Jyoti Bima Yojana (life cover)",
    simple: "PMJJBY (life cover)",
  },
  scheme_pmsby: {
    standard: "PMSBY · Pradhan Mantri Suraksha Bima Yojana (accident cover)",
    simple: "PMSBY (accident cover)",
  },
  schemeCover: { standard: "Cover", simple: "Pays" },
  schemePremium: { standard: "Premium", simple: "Costs" },
  schemePerYear: { standard: "a year", simple: "a year" },
  schemeStatus_premium_seen: {
    standard: "Premium seen",
    simple: "You pay this",
  },
  schemeStatus_not_seen: {
    standard: "No premium seen in your linked account",
    simple: "Not seen in your account",
  },
  schemeStatus_outside_age: {
    standard: "Outside the joining age",
    simple: "Not for your age",
  },
  schemeStatus_unknown: {
    standard: "Can't tell from this data",
    simple: "We can't tell yet",
  },
  schemeSeenOn: { standard: "Last premium", simple: "Last paid" },
  schemeJoinAge: { standard: "Joining age", simple: "Age to join" },
  schemeSuggestTitle: {
    standard: "Consider government insurance first",
    simple: "Try government insurance first",
  },

  schemeSuggestTotalLead: { standard: "Together:", simple: "Both:" },
  schemeSuggestFor: { standard: "for", simple: "for" },
  schemeSuggestCover: { standard: "of cover", simple: "cover" },
  schemeSuggestHow: {
    standard:
      "Enrol through your own bank: its app, net banking or a branch. The premium is then auto-debited once a year, at the end of May.",
    simple:
      "Join through your bank's app or branch. The money is taken once a year, in late May.",
  },
  schemeOtherAccount: {
    standard:
      "We only see the accounts you linked. If you already pay this from another account, you're covered; each person can hold it through one account only.",
    simple:
      "We only see the accounts you shared. If you pay it from another account, you're already covered.",
  },
  schemeAgeUnknown: {
    standard:
      "Your bank didn't share your age, so check the joining age before you enrol.",
    simple: "Check the age limit before you join.",
  },
  schemeRenewalTitle: {
    standard: "Keep the premium ready for renewal",
    simple: "Keep money ready for renewal",
  },
  schemeRenewalLead: {
    standard: "Keep at least",
    simple: "Keep at least",
  },
  schemeRenewalBy: {
    standard: "in this account before",
    simple: "in this account before",
  },
  schemeRenewalWhy: {
    standard:
      "If the auto-debit fails for lack of balance, the cover lapses for the year.",
    simple: "If there isn't enough money, the cover stops.",
  },
  schemeUnknownBody: {
    standard:
      "Your linked data doesn't include the late-May renewal period, so we can't say whether you're enrolled. Nothing has been assumed.",
    simple:
      "Your data doesn't include late May, so we can't tell. We assume nothing.",
  },
  schemeChecked: {
    standard: "Checked transactions from",
    simple: "Checked from",
  },
  schemeWindow: {
    standard: "including the renewal period",
    simple: "including renewal time",
  },
  schemeNotAllowedTitle: {
    standard: "Check not run: you didn't allow suggestions",
    simple: "Not checked: you said no to suggestions",
  },
  schemeNotAllowedBody: {
    standard:
      'This source was linked without "Alerts and suggested actions", so DhanYukti hasn\'t looked for government insurance premiums. Link again with that choice on if you want the check.',
    simple:
      "You didn't allow suggestions for this bank. Link it again with that turned on if you want this check.",
  },
  schemeUnavailable: {
    standard: "The government insurance check couldn't run right now.",
    simple: "The check didn't work right now.",
  },
  schemeOfficial: {
    standard:
      "Premiums and cover as published by the Department of Financial Services.",
    simple: "Numbers from the Government of India.",
  },

  // DPDP notice, Value Ledger, Consent Passport (Job 2b)
  noticeTitle: {
    standard: "What DhanYukti does with your data",
    simple: "What we do with your data",
  },
  noticeIntro: {
    standard:
      "Two kinds of consent. Account Aggregator consent lets DhanYukti fetch bank data; you give it in the Anumati app. DPDP consent covers what DhanYukti itself processes: things you type in, who your insurance covers, your profile. Each purpose below is separate and off until you turn it on.",
    simple:
      "Two kinds of yes. One lets us read your bank data (you give it in Anumati). This page is the other: what we do with things you tell us. Each item is separate.",
  },
  noticeVersion: { standard: "Notice version", simple: "Version" },
  noticePurpose: { standard: "Why", simple: "Why" },
  noticeData: { standard: "What data", simple: "What" },
  noticeRetention: { standard: "How long it's kept", simple: "How long" },
  noticeProcessor: { standard: "Also processed by", simple: "Also used by" },
  noticeNoProcessor: { standard: "Only DhanYukti", simple: "Only us" },
  noticeNotInBuild: {
    standard: "Not in this build: nothing is processed for this yet.",
    simple: "Not built yet. Nothing is used.",
  },
  noticeNotEnforced: {
    standard:
      "In this build this data stays in your browser tab; withdrawal is recorded but server-side deletion isn't wired yet.",
    simple: "For now this stays in your browser. We record your choice.",
  },
  noticeEnforced: {
    standard: "Withdrawing deletes this data at once.",
    simple: "Saying stop deletes it at once.",
  },
  consentGive: { standard: "Give consent", simple: "Allow" },
  consentWithdraw: { standard: "Withdraw", simple: "Stop" },
  consentStatus_granted: { standard: "Consent given", simple: "Allowed" },
  consentStatus_withdrawn: { standard: "Withdrawn", simple: "Stopped" },
  consentStatus_never_asked: { standard: "Not given", simple: "Not allowed" },
  consentSince: { standard: "since", simple: "since" },
  receiptTitle: {
    standard: "Receipt saved in your Value Ledger",
    simple: "Receipt saved",
  },
  receiptId: { standard: "Receipt", simple: "Receipt" },
  receiptDownload: { standard: "Download receipt", simple: "Download" },
  dpdpUnavailable: {
    standard:
      "Consent records can't be loaded on this deployment right now (storage not set up). Nothing has been recorded.",
    simple: "We can't load your choices right now. Nothing was saved.",
  },
  passportTitle: { standard: "Consent Passport", simple: "Consent Passport" },
  passportIntro: {
    standard:
      "Every consent you've given DhanYukti, in one place. Each can be ended with one tap, as easily as it was given.",
    simple: "All your yeses in one place. Stop any with one tap.",
  },
  passportAaHeading: {
    standard: "Bank data · Account Aggregator consent",
    simple: "Bank data (Anumati)",
  },
  passportAaEmpty: { standard: "No bank linked.", simple: "No bank linked." },
  passportDpdpHeading: {
    standard: "What DhanYukti processes · DPDP consent",
    simple: "What we use (DPDP)",
  },
  passportPerfiosHeading: {
    standard: "Perfios Hub APIs (KYC and verification)",
    simple: "Perfios checks",
  },
  passportPerfiosBody: {
    standard:
      "None in use. This build doesn't call Perfios Hub APIs, so no consent has been asked for. Each would be added here, with its own purpose, before first use.",
    simple: "None used. We'd ask you here first.",
  },
  passportRevoke: { standard: "Revoke", simple: "Stop" },
  passportRevoked: {
    standard: "Revoked. Data deleted from DhanYukti.",
    simple: "Stopped. Data deleted.",
  },
  passportOpenNotice: { standard: "Read the full notice", simple: "Read more" },
  ledgerHeading: { standard: "Value Ledger", simple: "Your receipts" },
  ledgerLead: {
    standard:
      "Every consent event, in order. Each entry is chained to the one before it, so a changed or deleted entry would show.",
    simple: "Every yes and stop, in order. Nothing can be changed quietly.",
  },
  ledgerVerified: { standard: "Chain verified", simple: "Checked: untouched" },
  ledgerBroken: {
    standard: "Chain doesn't verify: an entry was changed or removed",
    simple: "Something was changed",
  },
  ledgerEmpty: { standard: "No consent events yet.", simple: "Nothing yet." },
  ledger_dpdp_granted: { standard: "Consent given", simple: "Allowed" },
  ledger_dpdp_withdrawn: { standard: "Consent withdrawn", simple: "Stopped" },
  ledger_aa_requested: {
    standard: "Bank link requested",
    simple: "Bank link asked",
  },
  ledger_aa_approved: {
    standard: "Bank link approved in Anumati",
    simple: "Bank link: yes",
  },
  ledger_aa_revoked: {
    standard: "Bank link revoked",
    simple: "Bank link stopped",
  },
  ledger_aa_ended: {
    standard: "Bank link ended by Anumati",
    simple: "Bank link ended",
  },
  ledgerBankLink: { standard: "Bank link", simple: "Bank link" },
  privacyPassportTitle: {
    standard: "Consent Passport",
    simple: "Consent Passport",
  },
  privacyPassportBody: {
    standard:
      "Every consent in one place, with one-tap revoke and your receipts.",
    simple: "All your yeses, with one-tap stop.",
  },
  privacyNoticeTitle: {
    standard: "What DhanYukti does with your data",
    simple: "What we do with your data",
  },
  privacyNoticeBody: {
    standard:
      "The DPDP notice, purpose by purpose, with a withdraw button for each.",
    simple: "Each use of your data, with a stop button.",
  },

  // Existing insurance (upgrade to the government insurance check)
  coverHeading: {
    standard: "Insurance you already pay for",
    simple: "Insurance you pay",
  },
  coverLead: {
    standard:
      "Premiums found in your linked bank data. Who each policy covers is only what you tell us.",
    simple: "Found in your bank data. You tell us who each one covers.",
  },
  coverNone: {
    standard: "No private insurance premiums found in your linked accounts.",
    simple: "No insurance payments found.",
  },
  licence_life: { standard: "Life insurer", simple: "Life insurance company" },
  licence_general: {
    standard: "General insurer",
    simple: "General insurance company",
  },
  licence_health: {
    standard: "Health insurer",
    simple: "Health insurance company",
  },
  frequency_monthly: { standard: "monthly", simple: "every month" },
  frequency_quarterly: { standard: "quarterly", simple: "every 3 months" },
  frequency_half_yearly: { standard: "half-yearly", simple: "twice a year" },
  frequency_yearly: { standard: "yearly", simple: "once a year" },
  coverLastPaid: { standard: "Last premium", simple: "Last paid" },
  coverYearly: { standard: "About a year", simple: "Per year" },
  coverTotalLead: { standard: "Premiums seen, about", simple: "You pay about" },
  coverAcross: { standard: "across", simple: "for" },
  coverPolicies: { standard: "policies", simple: "policies" },
  coverWho: { standard: "Who does it cover?", simple: "Who is it for?" },
  coverKind: { standard: "What kind of cover?", simple: "What kind?" },
  coverSave: { standard: "Save", simple: "Save" },
  coverEdit: { standard: "Change", simple: "Change" },
  coverSaved: { standard: "Saved", simple: "Saved" },
  coverNotTold: { standard: "Not told yet", simple: "Not told yet" },
  coverTagInvalid: {
    standard: "Choose at least one member.",
    simple: "Pick at least one person.",
  },
  coverAllowTitle: {
    standard: "Tell DhanYukti who each policy covers?",
    simple: "Tell us who each policy is for?",
  },
  coverAllowBody: {
    standard:
      "This needs your DPDP consent for \u201cWho your insurance covers\u201d. It's kept up to 90 days and deleted as soon as you withdraw.",
    simple: "We need your OK to keep this. Deleted when you say stop.",
  },
  coverAllow: { standard: "Give consent", simple: "Allow" },
  member_self: { standard: "Me", simple: "Me" },
  member_spouse: { standard: "Spouse", simple: "Husband/wife" },
  member_children: { standard: "Children", simple: "Children" },
  member_parents: { standard: "Parents", simple: "Parents" },
  member_other: { standard: "Someone else", simple: "Someone else" },
  kind_health: { standard: "Health", simple: "Health" },
  kind_life: { standard: "Life", simple: "Life" },
  kind_motor: { standard: "Motor", simple: "Car/bike" },
  kind_accident: { standard: "Accident", simple: "Accident" },
  kind_home: { standard: "Home", simple: "Home" },
  kind_other: { standard: "Other", simple: "Other" },
  coverSummaryHealth: {
    standard: "Health cover told for",
    simple: "Health cover for",
  },
  coverSummaryLifeYes: {
    standard: "You told us a life policy covers you.",
    simple: "You have life cover.",
  },
  coverSummaryLifeNo: {
    standard: "No life policy told as covering you.",
    simple: "No life cover for you told yet.",
  },
  coverSummaryMotorOnly: {
    standard:
      "Accident cover in a motor policy applies only to vehicle accidents.",
    simple: "Car insurance only covers road accidents in that car.",
  },
  schemeTopUpTitle: {
    standard:
      "You already pay for insurance. Government schemes can add low-cost cover:",
    simple: "You have insurance. These cheap government schemes can add more:",
  },
  coverNoAdvice: {
    standard:
      "DhanYukti doesn't recommend or sell private insurance. These are facts from your bank data and what you told us.",
    simple: "We don't sell insurance. These are just your facts.",
  },
} satisfies Record<string, ModeText>;

export type ConsentCopyKey = keyof typeof consentCopy;

export function resolveConsentCopy(
  key: ConsentCopyKey,
  mode: DisplayMode,
): string {
  return resolveModeText(consentCopy[key], mode);
}

/** Copy for a backend code, or "" if the code isn't recognised. */
export function codeCopy(
  prefix: string,
  code: string,
  mode: DisplayMode,
): string {
  const key = `${prefix}_${code}`;
  return key in consentCopy
    ? resolveConsentCopy(key as ConsentCopyKey, mode)
    : "";
}
