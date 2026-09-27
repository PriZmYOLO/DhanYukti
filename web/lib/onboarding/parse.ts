import type { IsoDate, MoneyPaise } from "@/lib/contracts/common";
import { formatIsoDate } from "@/lib/format";
import type { ParseResult } from "@/lib/onboarding/answer";

const RUPEES = /^(\d{1,11})(?:\.(\d{1,2}))?$/;

/**
 * "1,500", "₹1500.5" → integer paise, using string arithmetic only (no float
 * rounding). Negative amounts and more than two decimal places are rejected.
 */
export function parseRupeesToPaise(text: string): ParseResult<MoneyPaise> {
  const cleaned = text.replace(/[₹,\s]/g, "");
  if (cleaned.startsWith("-")) {
    return { ok: false, error: "Enter the amount without a minus sign." };
  }

  const match = RUPEES.exec(cleaned);
  if (!match) {
    return {
      ok: false,
      error: "Enter an amount in rupees, like 1,500 or 1500.50.",
    };
  }

  const rupees = Number(match[1]);
  const paise = Number((match[2] ?? "").padEnd(2, "0"));
  return {
    ok: true,
    value: { amount_paise: rupees * 100 + paise, currency: "INR" },
  };
}

/** Integer paise → editable rupee text, e.g. 150050 → "1500.50". */
export function paiseToRupeeText(value: MoneyPaise): string {
  const remainder = value.amount_paise % 100;
  const rupees = (value.amount_paise - remainder) / 100;
  return remainder === 0
    ? String(rupees)
    : `${rupees}.${String(remainder).padStart(2, "0")}`;
}

export function parseIsoDateInput(text: string): ParseResult<IsoDate> {
  return formatIsoDate(text) === null
    ? { ok: false, error: "Choose a valid date." }
    : { ok: true, value: text };
}

export function parseCount(text: string, max: number): ParseResult<number> {
  if (!/^\d{1,3}$/.test(text) || Number(text) > max) {
    return { ok: false, error: `Enter a whole number from 0 to ${max}.` };
  }
  return { ok: true, value: Number(text) };
}

export function parseShortText(
  text: string,
  maxLength: number,
): ParseResult<string> {
  return text.length > maxLength
    ? { ok: false, error: `Keep this to ${maxLength} characters or fewer.` }
    : { ok: true, value: text };
}

// Display formatting only: these never compute or change an amount. Intl
// formats the digit string itself, so no value passes through a float.
const groupFormatter = new Intl.NumberFormat("en-IN");
const unitsFormatter = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  compactDisplay: "long",
  maximumFractionDigits: 2,
});
const exactUnitsFormatter = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  compactDisplay: "long",
  maximumFractionDigits: 20,
});

type IntlDecimal = Parameters<Intl.NumberFormat["format"]>[0];

function rupeeDigits(
  text: string,
): { whole: string; fraction?: string } | null {
  const match = RUPEES.exec(text.replace(/[₹,\s]/g, ""));
  return match ? { whole: match[1], fraction: match[2] } : null;
}

/**
 * "500000" → "5,00,000" (en-IN grouping) for showing in the input. Text that
 * isn't a valid amount is returned unchanged so the error still shows.
 */
export function groupRupeeText(text: string): string {
  const digits = rupeeDigits(text);
  if (!digits) return text;
  const whole = groupFormatter.format(digits.whole as IntlDecimal);
  return digits.fraction === undefined ? whole : `${whole}.${digits.fraction}`;
}

/**
 * "500000" → "5 lakh", "50000" → "50 thousand", "523456" → "about 5.23
 * lakh". Null below one thousand or for invalid text.
 */
export function rupeeUnitsText(text: string): string | null {
  const digits = rupeeDigits(text);
  if (!digits || digits.whole.replace(/^0+/, "").length < 4) return null;
  const decimal = (
    digits.fraction === undefined
      ? digits.whole
      : `${digits.whole}.${digits.fraction}`
  ) as IntlDecimal;
  const rounded = unitsFormatter.format(decimal);
  return rounded === exactUnitsFormatter.format(decimal)
    ? rounded
    : `about ${rounded}`;
}
