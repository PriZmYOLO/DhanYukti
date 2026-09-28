import type { L } from "@/lib/types";

/**
 * FI types DhanYukti can request from the Account Aggregator, with ReBIT's
 * exact enum names. Anumati's UAT test bank (ACME) supports all six. Which
 * ones are actually requested = the member's choice ∩ the server's
 * allow-list (env AA_FI_TYPES, default "DEPOSIT").
 */
export const FI_TYPES = [
  "DEPOSIT",
  "TERM_DEPOSIT",
  "RECURRING_DEPOSIT",
  "MUTUAL_FUNDS",
  "SIP",
  "EQUITIES",
] as const;

export type FiType = (typeof FI_TYPES)[number];

/** Today's verified behaviour: savings accounts only. */
export const DEFAULT_FI_TYPES: FiType[] = ["DEPOSIT"];

export const isFiType = (v: unknown): v is FiType =>
  typeof v === "string" && (FI_TYPES as readonly string[]).includes(v);

/** Known types only, in canonical order, no duplicates. */
export function normaliseFiTypes(values: readonly unknown[]): FiType[] {
  return FI_TYPES.filter((t) => values.includes(t));
}

/** "DEPOSIT, MUTUAL_FUNDS" → ["DEPOSIT", "MUTUAL_FUNDS"]; unset → DEPOSIT. */
export function parseAllowList(raw: string | undefined | null): FiType[] {
  if (raw === undefined || raw === null || raw.trim() === "") {
    return DEFAULT_FI_TYPES;
  }
  return normaliseFiTypes(raw.split(",").map((s) => s.trim().toUpperCase()));
}

/** What the member sees in "Which accounts to share". */
export const FI_TYPE_TEXT: Record<FiType, { label: L; why: L }> = {
  DEPOSIT: {
    label: { hi: "Savings khaata", en: "Savings account" },
    why: {
      hi: "Mahine ke aakhir mein paisa kam na pade, yeh dekhne ke liye",
      en: "shows whether money runs short before month-end",
    },
  },
  TERM_DEPOSIT: {
    label: { hi: "FD (fixed deposit)", en: "Fixed deposits (FD)" },
    why: {
      hi: "Aapki FD ko mushkil waqt ki bachat mein ginta hai",
      en: "counts your FDs as a safety buffer",
    },
  },
  RECURRING_DEPOSIT: {
    label: { hi: "RD (recurring deposit)", en: "Recurring deposits (RD)" },
    why: {
      hi: "Har mahine ki RD kist ko hisaab mein rakhta hai",
      en: "plans for each month's RD instalment",
    },
  },
  MUTUAL_FUNDS: {
    label: { hi: "Mutual funds", en: "Mutual funds" },
    why: {
      hi: "Lambe lakshyon ke liye kitna jama hai, yeh dikhata hai",
      en: "shows what's building up for long-term goals",
    },
  },
  SIP: {
    label: { hi: "SIP", en: "SIPs" },
    why: {
      hi: "SIP ki tareekh dekhta hai taaki woh hisaab mein rahe",
      en: "sees SIP dates so they're planned for",
    },
  },
  EQUITIES: {
    label: { hi: "Shares (demat)", en: "Shares (demat)" },
    why: {
      hi: "Aapke shares ki bazaar keemat dikhata hai (ghat bhi sakti hai)",
      en: "shows your shares' market value (it can go down)",
    },
  },
};

/** "Savings account, Fixed deposits (FD)" for consent screens. */
export function fiTypeList(
  types: readonly FiType[],
  lang: "hi" | "en",
): string {
  return types.map((t) => FI_TYPE_TEXT[t].label[lang]).join(", ");
}
