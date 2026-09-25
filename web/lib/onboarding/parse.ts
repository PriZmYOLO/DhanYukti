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
