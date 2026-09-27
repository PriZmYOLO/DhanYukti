/**
 * DPDP notice (Digital Personal Data Protection Act, 2023): what DhanYukti
 * itself processes, purpose by purpose. This is separate from Account
 * Aggregator consent, which covers bank data and lives with the AA.
 *
 * Each purpose is consented to, and withdrawn, on its own. `in_build`
 * says honestly whether this build actually uses that purpose yet, and
 * `enforced` whether withdrawing already changes what the server does.
 *
 * Bump NOTICE_VERSION whenever any wording or retention below changes;
 * receipts record the version and a hash of the notice they were given.
 */
import type { ModeText } from "@/lib/display-mode";

export const NOTICE_VERSION = "2026-09-27.3";

export type PurposeId =
  | "cover_profile"
  | "health_conditions"
  | "member_profile"
  | "manual_entries"
  | "insurance_tags"
  | "family_rules"
  | "voice";

export interface NoticePurpose {
  id: PurposeId;
  title: ModeText;
  purpose: ModeText;
  data: ModeText;
  retention: ModeText;
  /** Who processes it besides DhanYukti; null = nobody else. */
  processor: ModeText | null;
  in_build: boolean;
  /** Withdrawing already deletes data / stops processing in this build. */
  enforced: boolean;
}

export const NOTICE_PURPOSES: NoticePurpose[] = [
  {
    id: "insurance_tags",
    title: {
      standard: "Who your insurance covers",
      simple: "Who your insurance is for",
    },
    purpose: {
      standard:
        "To show which family members each of your insurance policies covers, so cover gaps can be seen.",
      simple: "To show who each policy covers and who has none.",
    },
    data: {
      standard:
        "For each policy found in your linked bank data: the members it covers and its kind (health, life, motor…), as you tell us.",
      simple: "Who each policy is for and what kind it is, as you tell us.",
    },
    retention: {
      standard:
        "Kept while this consent is on, at most 90 days. Deleted immediately when you withdraw.",
      simple: "Kept up to 90 days. Deleted as soon as you say stop.",
    },
    processor: null,
    in_build: true,
    enforced: true,
  },
  {
    id: "cover_profile",
    title: {
      standard: "Family cover check",
      simple: "Family insurance check",
    },
    purpose: {
      standard:
        "To work out how much health, life and accident cover each part of your family needs, and the gaps.",
      simple: "To work out what insurance your family needs.",
    },
    data: {
      standard:
        "Each member's relation and age, earners' incomes, city type, household spending, loans, savings, cover you already have (sum insured only, no insurer names) and your filters.",
      simple: "Ages, incomes, city, spending, loans and the cover you have.",
    },
    retention: {
      standard:
        "Kept while this consent is on, at most 90 days. Deleted immediately when you withdraw, with any health conditions.",
      simple: "Kept up to 90 days. Deleted as soon as you say stop.",
    },
    processor: null,
    in_build: true,
    enforced: true,
  },
  {
    id: "health_conditions",
    title: {
      standard: "Health conditions for the cover check",
      simple: "Health problems for the check",
    },
    purpose: {
      standard:
        "So the cover check can flag waiting periods and remind you to declare conditions to the insurer.",
      simple: "To warn about waiting periods for health problems.",
    },
    data: {
      standard:
        "Yes/no flags per member (diabetes, blood pressure, heart, thyroid, asthma, other). No reports, medicines or dates.",
      simple: "Only yes or no for a few health problems. Nothing else.",
    },
    retention: {
      standard:
        "Kept while this consent is on, at most 90 days. Deleted immediately when you withdraw.",
      simple: "Deleted as soon as you say stop.",
    },
    processor: null,
    in_build: true,
    enforced: true,
  },
  {
    id: "manual_entries",
    title: { standard: "Money you type in", simple: "Money you type in" },
    purpose: {
      standard:
        "To build your cash picture from amounts you enter when a bank isn't linked.",
      simple: "To work out your money from what you type in.",
    },
    data: {
      standard:
        "Cash in hand, bills, salary dates and amounts you enter. Treated as your statements, not bank facts.",
      simple: "Cash, bills and salary you type in.",
    },
    retention: {
      standard:
        "Kept while this consent is on. Deleted within 30 days of withdrawal.",
      simple: "Kept while you allow it. Deleted within 30 days after.",
    },
    processor: null,
    in_build: true,
    enforced: false,
  },
  {
    id: "member_profile",
    title: {
      standard: "Your profile in the household",
      simple: "Your name in the family",
    },
    purpose: {
      standard:
        "To show who is in the household and keep each member's data separate.",
      simple: "To know who is in the family and keep your data yours.",
    },
    data: {
      standard: "Display name, your role in the household, invites you accept.",
      simple: "Your name and your place in the family.",
    },
    retention: {
      standard:
        "Kept while you're a member. Deleted within 30 days of leaving or withdrawing.",
      simple: "Deleted within 30 days after you leave or say stop.",
    },
    processor: null,
    in_build: true,
    enforced: false,
  },
  {
    id: "family_rules",
    title: { standard: "Family Rules", simple: "Family Rules" },
    purpose: {
      standard:
        "To check spending and savings against rules your household agrees, such as limits and reserves.",
      simple: "To check money against rules your family agrees.",
    },
    data: {
      standard: "The rules you set and which members they apply to.",
      simple: "The rules you set.",
    },
    retention: {
      standard: "Kept while the rule exists and this consent is on.",
      simple: "Kept while the rule exists.",
    },
    processor: null,
    in_build: false,
    enforced: false,
  },
  {
    id: "voice",
    title: { standard: "Voice read-outs", simple: "Voice read-outs" },
    purpose: {
      standard: "To read nudges aloud in your language.",
      simple: "To read messages aloud in your language.",
    },
    data: {
      standard:
        "Only the nudge text (for example “₹4,200 short on the 28th”). Never names, account numbers or balances history.",
      simple: "Only the message text. Never your name or account number.",
    },
    retention: {
      standard:
        "Nothing is stored: not the text, not the audio. Each read-out is made when you tap and discarded after playing.",
      simple: "Not kept after the audio is made.",
    },
    processor: {
      standard: "Bhashini (Government of India) for translation and speech",
      simple: "Bhashini (Government of India)",
    },
    in_build: true,
    enforced: true,
  },
];

export function purposeById(id: string): NoticePurpose | undefined {
  return NOTICE_PURPOSES.find((p) => p.id === id);
}

/** Status of one purpose for this person, derived from the Value Ledger. */
export interface PurposeState {
  id: PurposeId;
  status: "granted" | "withdrawn" | "never_asked";
  since: string | null;
  receipt_id: string | null;
}

/** One Value Ledger entry, as shown to the person. Hash-chained. */
export interface LedgerEntry {
  seq: number;
  at: string;
  kind:
    | "dpdp_granted"
    | "dpdp_withdrawn"
    | "aa_requested"
    | "aa_approved"
    | "aa_revoked"
    | "aa_ended"
    | "engine_run";
  /** DPDP purpose id, "aa:<short link ref>" or "engine:cover:<input hash>". */
  subject: string;
  receipt_id: string;
  notice_version: string | null;
  notice_hash: string | null;
  prev_hash: string;
  hash: string;
}

export interface DpdpState {
  notice_version: string;
  purposes: PurposeState[];
  ledger: LedgerEntry[];
  ledger_verified: boolean;
}
