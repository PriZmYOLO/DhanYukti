import type { IsoDate, IsoTimestamp, MoneyPaise } from "@/lib/contracts/common";

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/**
 * Formats integer paise as rupees with Indian digit grouping, e.g.
 * -350000 → "−₹3,500". Uses integer arithmetic only. Returns null for values
 * that are not valid INR paise so callers can show an error instead of a guess.
 */
export function formatMoney(value: MoneyPaise): string | null {
  const paise = value.amount_paise;
  if (value.currency !== "INR" || !Number.isSafeInteger(paise)) return null;

  const sign = paise < 0 ? "−" : "";
  const absolute = Math.abs(paise);
  const remainder = absolute % 100;
  const rupees = (absolute - remainder) / 100;
  const fraction =
    remainder === 0 ? "" : `.${String(remainder).padStart(2, "0")}`;

  return `${sign}₹${rupeeFormatter.format(rupees)}${fraction}`;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HAS_OFFSET = /(Z|[+-]\d{2}:\d{2})$/;

// Calendar dates carry no time, so format them in UTC to avoid a day shift.
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

// Financial timestamps are shown in Asia/Kolkata (Guide §2).
const timestampFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value);
}

/** "2026-09-28" → "28 Sept 2026". Returns null for invalid dates. */
export function formatIsoDate(value: IsoDate): string | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return dateFormatter.format(date);
}

/** Timezone-aware timestamp → IST display. Rejects timestamps without an offset. */
export function formatTimestamp(value: IsoTimestamp): string | null {
  if (!HAS_OFFSET.test(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${timestampFormatter.format(date)} IST`;
}
