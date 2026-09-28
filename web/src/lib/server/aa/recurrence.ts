/**
 * E02 — recurrence detection. Finds money that repeats in a member's own
 * bank data (salary, rent, EMI, bills, fees) and works out its rhythm,
 * usual day, typical amount and how sure we are. It only SUGGESTS: the
 * member confirms, fixes or ignores each item before anything is
 * projected from it (see outlook.ts and "Confirm your bills").
 *
 * Rules (honest by default):
 *   - Same payee, direction and account; amounts within 15% of their median, and at
 *     least 80% of that payee's payments inside that band (so shopping
 *     with varying amounts is not a bill).
 *   - Rhythm from the gaps between payments: 25–35 days = monthly,
 *     80–100 = quarterly, 340–390 = yearly. Anything else is not a rhythm.
 *   - One payment is never a rhythm, except a PMJJBY/PMSBY premium: those
 *     schemes renew every year by 31 May, so the rule gives the rhythm
 *     (basis "scheme_rule", never "high" confidence).
 *   - Everyday spend = median over complete months of debits that are not
 *     part of a repeating bill. Fewer than 2 complete months = unknown.
 *
 * Pure (relative, type-only imports apart from node:crypto), so scripts
 * can run it.
 */
import { createHash } from "node:crypto";

import type {
  BillCategory,
  Cadence,
  Confidence,
  DetectedBills,
  DetectedSeries,
  EverydaySpend,
} from "../../contracts/aa-bills";
import type { IsoDate, MoneyPaise } from "../../contracts/common";
import {
  accountWindow,
  completeMonths,
  CONSISTENT,
  isDeposit,
  median,
  payeeKey,
  payeeLabel,
  TOLERANCE,
  txnDate,
  type SummaryAccountInput,
} from "./summary";

const MIN_EVERYDAY_MONTHS = 2;
/** Share of gaps that must fit the rhythm for the series to count. */
const MIN_REGULAR = 0.5;

const RHYTHMS: { cadence: Cadence; min: number; max: number }[] = [
  { cadence: "monthly", min: 25, max: 35 },
  { cadence: "quarterly", min: 80, max: 100 },
  { cadence: "yearly", min: 340, max: 390 },
];

export const CADENCE_MONTHS: Record<Cadence, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

const SCHEME = /\b(PMJJBY|PMSBY)\b/;

const money = (amount_paise: number): MoneyPaise => ({
  amount_paise,
  currency: "INR",
});

/* --------------------------------- dates --------------------------------- */

const DAY_MS = 86_400_000;
const toMs = (iso: IsoDate) => Date.parse(`${iso}T00:00:00Z`);

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toMs(to) - toMs(from)) / DAY_MS);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return new Date(toMs(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** Same (or clamped) day `months` later: 31 Jan + 1 month = 28/29 Feb. */
export function addMonths(iso: IsoDate, months: number, day?: number): IsoDate {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const nd = Math.min(day ?? d, daysInMonth(ny, nm));
  return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

/* ------------------------------ categories ------------------------------- */

const CATEGORY_RULES: [RegExp, BillCategory][] = [
  [SCHEME, "scheme"],
  [/\b(SALARY|SAL|PAYROLL|WAGES?)\b/, "salary"],
  [/\bRENT\b/, "rent"],
  [/\b(EMI|LOAN|FIN|FINANCE|HOUSING)\b/, "emi"],
  [/\b(SCHOOL|FEES?|TUITION|COLLEGE|ACADEMY)\b/, "school_fee"],
  [/\b(INSURANCE|LIC|PREMIUM|GIC|LOMBARD|ERGO|ACKO)\b/, "insurance"],
  [
    /\b(ELECTRICITY|BESCOM|MSEDCL|TPDDL|BSES|POWER|WATER|GAS|LPG|BROADBAND|FIBER|FIBRE|RECHARGE|MOBILE|POSTPAID|DTH|JIO|AIRTEL)\b/,
    "utility",
  ],
];

function categoryOf(key: string, kind: "income" | "bill"): BillCategory {
  const hit = CATEGORY_RULES.find(([re]) => re.test(key))?.[1] ?? "other";
  if (kind === "income") return hit === "salary" ? "salary" : "other";
  return hit === "salary" ? "other" : hit;
}

/** Same payee, direction and account → same id across fetches. */
export function seriesId(
  kind: "income" | "bill",
  key: string,
  account: string,
): string {
  return `rb_${createHash("sha256").update(`${kind}|${account}|${key}`).digest("hex").slice(0, 10)}`;
}

/* ------------------------------- detection ------------------------------- */

type Payment = { amount: number; date: IsoDate; account: string };

function confidenceOf(
  occurrences: number,
  spreadPct: number,
  regularPct: number | null,
  basis: "repeats" | "scheme_rule",
): Confidence {
  if (basis === "scheme_rule") return "medium";
  if (occurrences >= 3 && spreadPct <= 10 && (regularPct ?? 0) >= 80) {
    return "high";
  }
  if ((regularPct ?? 0) < 70) return "low";
  return "medium";
}

function detectSeries(
  kind: "income" | "bill",
  key: string,
  account: string,
  payments: Payment[],
  dataTo: IsoDate,
): DetectedSeries | null {
  const typical = median(payments.map((p) => p.amount));
  if (typical <= 0) return null;
  const series = payments.filter(
    (p) => Math.abs(p.amount - typical) <= typical * TOLERANCE,
  );
  if (series.length < payments.length * CONSISTENT) return null;

  const dates = [...new Set(series.map((p) => p.date))].sort();
  const scheme = kind === "bill" && SCHEME.test(key);
  const gaps = dates.slice(1).map((d, i) => daysBetween(dates[i], d));
  const medianGap = gaps.length ? median(gaps) : null;
  const rhythm =
    medianGap === null
      ? null
      : (RHYTHMS.find((r) => medianGap >= r.min && medianGap <= r.max) ?? null);

  let cadence: Cadence;
  let basis: "repeats" | "scheme_rule" = "repeats";
  let regularPct: number | null = null;
  if (rhythm) {
    cadence = rhythm.cadence;
    const regular = gaps.filter((g) => g >= rhythm.min && g <= rhythm.max);
    regularPct = Math.round((regular.length / gaps.length) * 100);
    if (regularPct < MIN_REGULAR * 100) return null;
  } else if (scheme) {
    cadence = "yearly";
    basis = "scheme_rule";
  } else {
    return null;
  }

  const typicalAmount = median(series.map((p) => p.amount));
  const spreadPct = Math.round(
    (Math.max(...series.map((p) => Math.abs(p.amount - typicalAmount))) /
      typicalAmount) *
      100,
  );
  const typicalDay =
    basis === "scheme_rule"
      ? null
      : median(dates.map((d) => Number(d.slice(8, 10))));
  const occurrences = dates.length;
  return {
    id: seriesId(kind, key, account),
    kind,
    payee_label: payeeLabel(key),
    category: categoryOf(key, kind),
    cadence,
    typical_amount: money(typicalAmount),
    typical_day: typicalDay,
    first_date: dates[0],
    last_date: dates[dates.length - 1],
    data_to: dataTo,
    account_labels: [account],
    evidence: {
      occurrences,
      months_seen: new Set(dates.map((d) => d.slice(0, 7))).size,
      amount_spread_pct: spreadPct,
      rhythm_regular_pct: regularPct,
      basis,
    },
    confidence: confidenceOf(occurrences, spreadPct, regularPct, basis),
  };
}

/** Months (YYYY-MM) that every account covers completely. */
function sharedCompleteMonths(accounts: SummaryAccountInput[]): string[] {
  const windows = accounts.map(accountWindow);
  if (windows.length === 0 || windows.some((w) => w === null)) return [];
  const from = windows.map((w) => w!.from).sort()[windows.length - 1];
  const to = windows.map((w) => w!.to).sort()[0];
  return from <= to ? completeMonths(from, to) : [];
}

function everydaySpend(
  accounts: SummaryAccountInput[],
  billKeys: Set<string>,
): EverydaySpend {
  const months = sharedCompleteMonths(accounts);
  if (months.length < MIN_EVERYDAY_MONTHS) {
    return {
      status: "unknown",
      reason: `The data covers fewer than ${MIN_EVERYDAY_MONTHS} complete months (${months.length} found).`,
    };
  }
  const totals = new Map<string, number>(months.map((m) => [m, 0]));
  const unreadable = new Set<string>();
  for (const account of accounts) {
    for (const t of account.transactions) {
      if (t.type !== "DEBIT") continue;
      const month = txnDate(t)?.slice(0, 7);
      if (!month || !totals.has(month)) continue;
      const key = payeeKey(t.narration);
      if (key && billKeys.has(key)) continue;
      if (t.amount_paise === null) unreadable.add(month);
      else totals.set(month, totals.get(month)! + t.amount_paise);
    }
  }
  const counted = months.filter((m) => !unreadable.has(m));
  if (counted.length < MIN_EVERYDAY_MONTHS) {
    return {
      status: "unknown",
      reason: `Fewer than ${MIN_EVERYDAY_MONTHS} complete months with readable debits (${counted.length} found).`,
    };
  }
  return {
    status: "known",
    per_month: money(median(counted.map((m) => totals.get(m)!))),
    months_counted: counted.length,
  };
}

const CATEGORY_ORDER: BillCategory[] = [
  "salary",
  "rent",
  "emi",
  "school_fee",
  "utility",
  "insurance",
  "scheme",
  "other",
];

/**
 * E02 over the savings (DEPOSIT) accounts of one link. FD interest or
 * fund redemptions are not income, so other FI types are left out.
 */
export function detectBills(input: {
  accounts: SummaryAccountInput[];
}): DetectedBills {
  const accounts = input.accounts.filter(isDeposit);
  const groups = new Map<string, Payment[]>();
  let dataTo: IsoDate | null = null;
  for (const account of accounts) {
    const window = accountWindow(account);
    if (!window) continue;
    if (!dataTo || window.to > dataTo) dataTo = window.to;
    for (const t of account.transactions) {
      const date = txnDate(t);
      const key = payeeKey(t.narration);
      if (!date || !key || t.amount_paise === null || t.amount_paise <= 0) {
        continue;
      }
      if (t.type !== "DEBIT" && t.type !== "CREDIT") continue;
      if (date < window.from || date > window.to) continue;
      // Per account: two earners paid by one employer on the same day are
      // two incomes, and each account's bills really leave that account.
      const group = JSON.stringify([
        t.type === "CREDIT" ? "income" : "bill",
        key,
        account.account_label,
      ]);
      const list = groups.get(group) ?? [];
      list.push({ amount: t.amount_paise, date, account: account.account_label });
      groups.set(group, list);
    }
  }

  const series: DetectedSeries[] = [];
  const billKeys = new Set<string>();
  if (dataTo) {
    for (const [group, payments] of groups) {
      const [kind, key, account] = JSON.parse(group) as [
        "income" | "bill",
        string,
        string,
      ];
      const found = detectSeries(kind, key, account, payments, dataTo);
      if (!found) continue;
      series.push(found);
      if (kind === "bill") billKeys.add(key);
    }
  }
  series.sort(
    (a, b) =>
      (a.kind === b.kind ? 0 : a.kind === "income" ? -1 : 1) ||
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      b.typical_amount.amount_paise - a.typical_amount.amount_paise,
  );

  const reason = series.length
    ? null
    : !dataTo
      ? "No transactions with readable dates in the data."
      : "No payee was paid (or paid you) a similar amount on a regular rhythm in this data.";
  return { series, everyday: everydaySpend(accounts, billKeys), reason };
}

/* ------------------------------ next dates ------------------------------- */

/** The scheme year renews on 1 June; the premium is due by 31 May. */
function nextSchemeDue(today: IsoDate): IsoDate {
  const year = Number(today.slice(0, 4));
  const due = `${year}-05-31`;
  return today <= due ? due : `${year + 1}-05-31`;
}

/**
 * Next payment after `today` (today counts as already settled: the
 * balance the bank reported includes it). `fixedDay` is the member's own
 * correction of the usual day.
 */
export function nextDate(
  s: Pick<DetectedSeries, "cadence" | "last_date" | "typical_day" | "evidence">,
  today: IsoDate,
  fixedDay: number | null = null,
): IsoDate {
  if (s.evidence.basis === "scheme_rule") return nextSchemeDue(today);
  const step = CADENCE_MONTHS[s.cadence];
  const day = fixedDay ?? s.typical_day ?? Number(s.last_date.slice(8, 10));
  let next = addMonths(s.last_date, step, day);
  // Jumping whole years first keeps old sandbox data quick to roll forward.
  while (daysBetween(next, today) > 400) next = addMonths(next, 12, day);
  while (next <= today) next = addMonths(next, step, day);
  return next;
}

/** An expected payment is missing inside the data window. */
export function mayHaveStopped(
  s: Pick<
    DetectedSeries,
    "cadence" | "last_date" | "typical_day" | "evidence" | "data_to"
  >,
): boolean {
  if (s.evidence.basis === "scheme_rule") return false;
  const grace = s.cadence === "monthly" ? 10 : s.cadence === "quarterly" ? 20 : 30;
  const expected = addMonths(
    s.last_date,
    CADENCE_MONTHS[s.cadence],
    s.typical_day ?? undefined,
  );
  return addDays(expected, grace) <= s.data_to;
}
