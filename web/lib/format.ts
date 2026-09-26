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

const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
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

function parseIsoDate(value: IsoDate): Date | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

/** "2026-09-28" → "28 Sept 2026". Returns null for invalid dates. */
export function formatIsoDate(value: IsoDate): string | null {
  const date = parseIsoDate(value);
  return date ? dateFormatter.format(date) : null;
}

/** "2026-09-28" → "28 Sept", for compact date columns. Null if invalid. */
export function formatIsoDateShort(value: IsoDate): string | null {
  const date = parseIsoDate(value);
  return date ? shortDateFormatter.format(date) : null;
}

/**
 * Every calendar day from start to end inclusive, as ISO dates. Calendar
 * arithmetic only (no amounts). Returns [] for invalid or reversed ranges,
 * and stops at `limit` days so a malformed horizon can't grow unbounded.
 */
export function isoDaysBetween(
  start: IsoDate,
  end: IsoDate,
  limit = 62,
): IsoDate[] {
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  if (!from || !to || from > to) return [];
  const days: IsoDate[] = [];
  for (
    let day = from;
    day <= to && days.length < limit;
    day = new Date(day.getTime() + 86_400_000)
  ) {
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

/** Timezone-aware timestamp → IST display. Rejects timestamps without an offset. */
export function formatTimestamp(value: IsoTimestamp): string | null {
  if (!HAS_OFFSET.test(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${timestampFormatter.format(date)} IST`;
}
