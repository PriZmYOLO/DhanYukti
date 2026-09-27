/**
 * Voice read-out nudges (Job 2c). Each nudge is a fixed template that takes
 * only typed values (an amount, a date). The server builds the sentence
 * from these, so a name, account number or free text can never reach the
 * speech service: there is no field to put it in.
 *
 * `hindiReviewed` is a human-written Hindi version, used when a machine
 * translation doesn't keep every number exactly (numbers are never left to
 * a model to change).
 *
 * No imports with path aliases: scripts use this file directly.
 */

export type VoiceNudgeId = "cash_short";

export interface CashShortParams {
  amount_paise: number;
  /** ISO calendar date, e.g. 2026-09-28. */
  date: string;
}

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const HI_MONTHS = [
  "जनवरी",
  "फ़रवरी",
  "मार्च",
  "अप्रैल",
  "मई",
  "जून",
  "जुलाई",
  "अगस्त",
  "सितंबर",
  "अक्टूबर",
  "नवंबर",
  "दिसंबर",
];

/** Whole rupees with Indian grouping, e.g. 125000 → "1,25,000". */
export function indianGrouping(rupees: number): string {
  const s = String(Math.round(rupees));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

export function validCashShort(input: unknown): CashShortParams | null {
  if (!input || typeof input !== "object") return null;
  const { amount_paise, date } = input as Record<string, unknown>;
  if (
    typeof amount_paise !== "number" ||
    !Number.isSafeInteger(amount_paise) ||
    amount_paise <= 0 ||
    amount_paise > 100_000_000 * 100 ||
    amount_paise % 100 !== 0
  ) {
    return null;
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return null;
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { amount_paise, date };
}

export function cashShortText(p: CashShortParams) {
  const rupees = indianGrouping(p.amount_paise / 100);
  const day = Number(p.date.slice(8, 10));
  const m = Number(p.date.slice(5, 7)) - 1;
  return {
    english: `On ${day} ${EN_MONTHS[m]}, your cash may fall short by ${rupees} rupees. This is a shortfall to plan for, not money lost.`,
    hindiReviewed: `${day} ${HI_MONTHS[m]} को आपके पास ${rupees} रुपये कम पड़ सकते हैं। यह एक कमी है जिसकी पहले से तैयारी की जा सकती है, पैसों का नुकसान नहीं।`,
  };
}

/** Clip key for a recorded fallback: same nudge, same values. */
export function cashShortKey(p: CashShortParams) {
  return `cash_short-${p.amount_paise}-${p.date}`;
}

/**
 * First code point ("zero") of every decimal-digit block an Indian language
 * uses: ASCII, Arabic-Indic and Extended (Urdu, Sindhi, Kashmiri),
 * Devanagari, Bengali/Assamese, Gurmukhi, Gujarati, Odia, Tamil, Telugu,
 * Kannada, Malayalam, Ol Chiki (Santali), Meetei Mayek (Manipuri).
 */
const DIGIT_ZEROS = [0x30, 0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0x1c50, 0xabf0];

function toAsciiDigit(ch: string): string {
  const cp = ch.codePointAt(0) ?? 0;
  const zero = DIGIT_ZEROS.find((z) => cp >= z && cp <= z + 9);
  return zero === undefined ? ch : String(cp - zero);
}

/** Every number in a text, grouping commas removed, any Indian script's digits → ASCII. */
export function numbersIn(text: string): string[] {
  const ascii = Array.from(text, toAsciiDigit).join("").replace(/[٬،]/g, ",");
  return (ascii.match(/\d[\d,]*/g) ?? []).map((n) => n.replace(/,/g, ""));
}

/** True when the translation kept every number from the source exactly. */
export function numbersKept(source: string, translation: string): boolean {
  const out = numbersIn(translation);
  return numbersIn(source).every((n) => out.includes(n));
}
