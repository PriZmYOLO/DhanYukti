/**
 * A few facts from a member's own fetched bank data, for the reveal step:
 * balance, data window, monthly inflow, recurring debits and the Jan
 * Suraksha check. Everything is worked out here, on the server; the result
 * carries no raw transactions and no narration beyond a payee label.
 *
 * Honesty rules:
 *   - A balance, amount or date that can't be read stays unknown, never 0.
 *   - Monthly inflow needs at least 2 complete calendar months that every
 *     account covers; otherwise it is "unknown".
 *   - A recurring debit is one payee paid a similar amount (within 15% of
 *     its median) in at least 2 different months. A payee whose amounts
 *     vary a lot (shopping) is not a recurring debit.
 *
 * Pure function (relative, type-only imports), so scripts can run it.
 */
import type {
  AccountSummary,
  MonthlyInflow,
  RecurringDebit,
  SavingsInvestments,
  SummaryJanSuraksha,
} from "../../contracts/aa-summary";
import type { FiType } from "../../aa/fi-types";
import type { DepositTerms, Holdings } from "./rebit";
import type { MoneyPaise } from "../../contracts/common";
import {
  checkJanSuraksha,
  type CheckAccount,
  type CheckTransaction,
} from "../schemes/jan-suraksha";

export interface SummaryAccountInput extends CheckAccount {
  balance_paise: number | null;
  balance_at: string | null;
  /** Absent = DEPOSIT (data stored before FI types). */
  fi_type?: FiType;
  deposit_terms?: DepositTerms | null;
  holdings?: Holdings | null;
}

export const isDeposit = (a: SummaryAccountInput) =>
  (a.fi_type ?? "DEPOSIT") === "DEPOSIT";

function sumKnown(values: (number | null)[]) {
  const known = values.filter((v): v is number => v !== null);
  return {
    total: known.length ? money(known.reduce((s, v) => s + v, 0)) : null,
    missing: values.length - known.length,
  };
}

/**
 * FD/RD, mutual funds, shares and SIPs, each labelled by its FI type.
 * "not_requested" and "none_found" are different from a value of 0.
 */
function savingsInvestments(
  accounts: SummaryAccountInput[],
  requested: FiType[],
  today: string,
): SavingsInvestments {
  const of = (...types: FiType[]) =>
    accounts.filter((a) => types.includes(a.fi_type ?? "DEPOSIT"));
  const wanted = (...types: FiType[]) =>
    types.some((t) => requested.includes(t));

  const tdRd = of("TERM_DEPOSIT", "RECURRING_DEPOSIT");
  const maturities = tdRd
    .filter(
      (a) =>
        a.deposit_terms?.maturity_date &&
        a.deposit_terms.maturity_date >= today,
    )
    .sort((a, b) =>
      a.deposit_terms!.maturity_date!.localeCompare(
        b.deposit_terms!.maturity_date!,
      ),
    );
  const next = maturities[0];
  const tdValues = sumKnown(
    tdRd.map((a) => a.deposit_terms?.current_value_paise ?? null),
  );

  const mf = of("MUTUAL_FUNDS");
  const mfHoldings = mf.map((a) =>
    a.holdings?.kind === "mutual_funds" ? a.holdings : null,
  );
  const mfValue = sumKnown(
    mfHoldings.map((h) => h?.current_value_paise ?? null),
  );
  const mfCost = sumKnown(mfHoldings.map((h) => h?.cost_value_paise ?? null));
  const navDates = mfHoldings
    .flatMap((h) => h?.schemes.map((s) => s.as_of) ?? [])
    .filter((d): d is string => d !== null)
    .sort();

  const eq = of("EQUITIES");
  const eqHoldings = eq.map((a) =>
    a.holdings?.kind === "equities" ? a.holdings : null,
  );
  const eqValue = sumKnown(
    eqHoldings.map((h) => h?.current_value_paise ?? null),
  );

  const sipRows = of("SIP").flatMap((a) =>
    a.holdings?.kind === "sip" ? a.holdings.sips : [],
  );
  const active = sipRows
    .filter((s) => s.status === "active")
    .sort((a, b) =>
      (a.next_date ?? "9999").localeCompare(b.next_date ?? "9999"),
    );

  return {
    requested,
    deposits: !wanted("TERM_DEPOSIT", "RECURRING_DEPOSIT")
      ? { status: "not_requested" }
      : tdRd.length === 0
        ? { status: "none_found" }
        : {
            status: "ready",
            source_fi_types: (
              ["TERM_DEPOSIT", "RECURRING_DEPOSIT"] as const
            ).filter((t) => tdRd.some((a) => a.fi_type === t)),
            accounts: tdRd.length,
            total_current_value: tdValues.total,
            accounts_without_value: tdValues.missing,
            next_maturity: next
              ? {
                  date: next.deposit_terms!.maturity_date!,
                  amount:
                    next.deposit_terms!.maturity_amount_paise === null
                      ? null
                      : money(next.deposit_terms!.maturity_amount_paise),
                  fi_type: next.fi_type as "TERM_DEPOSIT" | "RECURRING_DEPOSIT",
                  account_label: next.account_label,
                }
              : null,
          },
    mutual_funds: !wanted("MUTUAL_FUNDS")
      ? { status: "not_requested" }
      : mf.length === 0
        ? { status: "none_found" }
        : {
            status: "ready",
            current_value: mfValue.total,
            cost_value: mfCost.total,
            schemes: mfHoldings.reduce(
              (n, h) => n + (h?.schemes.length ?? 0),
              0,
            ),
            accounts_without_value: mfValue.missing,
            as_of: navDates.length ? navDates[navDates.length - 1] : null,
          },
    equities: !wanted("EQUITIES")
      ? { status: "not_requested" }
      : eq.length === 0
        ? { status: "none_found" }
        : {
            status: "ready",
            current_value: eqValue.total,
            holdings: eqHoldings.reduce(
              (n, h) => n + (h?.holdings.length ?? 0),
              0,
            ),
            accounts_without_value: eqValue.missing,
          },
    sips: !wanted("SIP")
      ? { status: "not_requested" }
      : of("SIP").length === 0
        ? { status: "none_found" }
        : {
            status: "ready",
            active: active.map((s) => ({
              scheme: s.scheme,
              amc: s.amc,
              amount: s.amount_paise === null ? null : money(s.amount_paise),
              frequency: s.frequency,
              next_date: s.next_date,
            })),
            ceased: sipRows.filter((s) => s.status === "ceased").length,
          },
  };
}

export const TOLERANCE = 0.15;
/** Share of a payee's debits that must fall in the ±15% band. */
export const CONSISTENT = 0.8;
const MIN_MONTHS = 2;
const TOP = 3;

const money = (amount_paise: number): MoneyPaise => ({
  amount_paise,
  currency: "INR",
});

export function txnDate(t: CheckTransaction): string | null {
  const date = t.value_date ?? t.timestamp?.slice(0, 10) ?? null;
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Dates the account covers: as the bank declared, else its transactions. */
export function accountWindow(a: CheckAccount): { from: string; to: string } | null {
  if (a.data_from && a.data_to) return { from: a.data_from, to: a.data_to };
  const dates = a.transactions
    .map(txnDate)
    .filter((d): d is string => d !== null)
    .sort();
  return dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null;
}

function lastDayOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const day = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Calendar months ("YYYY-MM") that lie wholly inside from..to. */
export function completeMonths(from: string, to: string): string[] {
  const months: string[] = [];
  for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = nextMonth(m)) {
    if (`${m}-01` >= from && lastDayOfMonth(m) <= to) months.push(m);
  }
  return months;
}

function monthlyInflow(accounts: CheckAccount[]): MonthlyInflow {
  if (accounts.length === 0) {
    return {
      status: "unknown",
      months_counted: 0,
      reason: "No savings account was shared.",
    };
  }
  const windows = accounts
    .filter((a) => a.transactions.length > 0 || (a.data_from && a.data_to))
    .map(accountWindow);
  if (windows.length === 0 || windows.some((w) => w === null)) {
    return {
      status: "unknown",
      months_counted: 0,
      reason: "The bank data doesn't say which dates it covers.",
    };
  }
  // Only months that every account covers, so a missing account never
  // shows up as a month with less money coming in.
  const from = windows.map((w) => w!.from).sort()[windows.length - 1];
  const to = windows.map((w) => w!.to).sort()[0];
  const months = from <= to ? completeMonths(from, to) : [];

  const totals = new Map<string, number>(months.map((m) => [m, 0]));
  const unreadable = new Set<string>();
  for (const account of accounts) {
    for (const t of account.transactions) {
      if (t.type !== "CREDIT") continue;
      const date = txnDate(t);
      const month = date?.slice(0, 7);
      if (!month || !totals.has(month)) continue;
      if (t.amount_paise === null) unreadable.add(month);
      else totals.set(month, totals.get(month)! + t.amount_paise);
    }
  }
  // A month with a credit we couldn't read has an unknown total.
  const counted = months.filter((m) => !unreadable.has(m));
  if (counted.length < MIN_MONTHS) {
    return {
      status: "unknown",
      months_counted: counted.length,
      reason:
        unreadable.size > 0
          ? `Fewer than ${MIN_MONTHS} complete months with readable credits (${counted.length} found).`
          : `The data covers fewer than ${MIN_MONTHS} complete calendar months (${counted.length} found).`,
    };
  }
  return {
    status: "known",
    median: money(median(counted.map((m) => totals.get(m)!))),
    months_counted: counted.length,
    from_month: counted[0],
    to_month: counted[counted.length - 1],
  };
}

const CHANNEL_WORDS = new Set([
  "UPI",
  "ACH",
  "NACH",
  "NEFT",
  "IMPS",
  "RTGS",
  "ECS",
  "POS",
  "ATM",
  "DR",
  "CR",
  "TO",
  "BY",
  "TRF",
  "TRANSFER",
  "PAYMENT",
  "P2A",
  "P2M",
  "MB",
  "IB",
]);

/**
 * "UPI/RENT/ANIL KUMAR" → "RENT ANIL KUMAR". Drops channel words,
 * references, VPAs and anything with a digit (account numbers, IFSC).
 */
export function payeeKey(narration: string | null): string | null {
  if (!narration) return null;
  const words = narration
    .toUpperCase()
    .split(/[\s/\\\-:|,*_.()]+/)
    .filter(
      (w) =>
        w.length > 1 &&
        !w.includes("@") &&
        !/\d/.test(w) &&
        !CHANNEL_WORDS.has(w),
    );
  return words.length ? words.slice(0, 4).join(" ") : null;
}

export function payeeLabel(key: string): string {
  return key.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function recurringDebits(accounts: SummaryAccountInput[]): {
  items: RecurringDebit[];
  reason: string | null;
} {
  type Debit = { amount: number; date: string; account: string };
  const byPayee = new Map<string, Debit[]>();
  const months = new Set<string>();
  for (const account of accounts) {
    const window = accountWindow(account);
    if (!window) continue;
    for (const m of completeMonths(window.from, window.to)) months.add(m);
    for (const t of account.transactions) {
      const date = txnDate(t);
      const key = payeeKey(t.narration);
      if (t.type !== "DEBIT" || t.amount_paise === null || !date || !key)
        continue;
      if (date < window.from || date > window.to) continue;
      const list = byPayee.get(key) ?? [];
      list.push({
        amount: t.amount_paise,
        date,
        account: account.account_label,
      });
      byPayee.set(key, list);
    }
  }

  const items: RecurringDebit[] = [];
  for (const [key, debits] of byPayee) {
    const typical = median(debits.map((d) => d.amount));
    const series = debits.filter(
      (d) => Math.abs(d.amount - typical) <= typical * TOLERANCE,
    );
    if (series.length < debits.length * CONSISTENT) continue;
    const seen = new Set(series.map((d) => d.date.slice(0, 7)));
    if (seen.size < MIN_MONTHS) continue;
    items.push({
      payee_label: payeeLabel(key),
      typical_amount: money(median(series.map((d) => d.amount))),
      months_seen: seen.size,
      last_date: series.map((d) => d.date).sort()[series.length - 1],
      account_labels: [...new Set(series.map((d) => d.account))],
    });
  }
  items.sort(
    (a, b) =>
      b.months_seen - a.months_seen ||
      b.typical_amount.amount_paise - a.typical_amount.amount_paise,
  );
  const reason = items.length
    ? null
    : months.size < MIN_MONTHS
      ? `The data covers fewer than ${MIN_MONTHS} complete months, too short to see repeats.`
      : byPayee.size === 0
        ? "No debits with a readable payee and amount in the data."
        : `No payee was paid a similar amount (within ${TOLERANCE * 100}%) in ${MIN_MONTHS} or more different months.`;
  return { items: items.slice(0, TOP), reason };
}

function janSuraksha(
  accounts: SummaryAccountInput[],
  options: { alertsAllowed: boolean; isSandbox: boolean; now?: Date },
): SummaryJanSuraksha {
  if (!options.alertsAllowed) return { status: "not_checked_consent_off" };
  const check = checkJanSuraksha(accounts, {
    now: options.now,
    isSandbox: options.isSandbox,
  });
  return {
    status: "checked",
    renewal_window_checked: check.renewal_window_checked,
    findings: check.findings.map((f) => ({
      scheme: f.scheme,
      status: f.status,
      evidence: f.evidence
        ? { account_label: f.evidence.account_label, date: f.evidence.date }
        : null,
    })),
  };
}

export function summariseAccounts(
  input: {
    link_id: string;
    fetched_at: string;
    accounts: SummaryAccountInput[];
  },
  options: {
    alertsAllowed: boolean;
    isSandbox: boolean;
    now?: Date;
    /** FI types the link asked for; absent = DEPOSIT only. */
    requestedFiTypes?: FiType[];
  },
): AccountSummary {
  // Balance, window, inflow, recurring debits and Jan Suraksha read savings
  // accounts only: FD interest or MF redemptions are not income.
  const accounts = input.accounts.filter(isDeposit);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(options.now ?? new Date());
  const known = accounts.filter((a) => a.balance_paise !== null);
  const windows = accounts
    .map(accountWindow)
    .filter((w): w is { from: string; to: string } => w !== null);
  return {
    link_id: input.link_id,
    is_sandbox: options.isSandbox,
    fetched_at: input.fetched_at,
    balance: {
      total: known.length
        ? money(known.reduce((sum, a) => sum + a.balance_paise!, 0))
        : null,
      accounts: accounts.map((a) => ({
        account_label: a.account_label,
        balance: a.balance_paise === null ? null : money(a.balance_paise),
        balance_at: a.balance_at,
      })),
      accounts_without_balance: accounts.length - known.length,
    },
    window: {
      from: windows.length ? windows.map((w) => w.from).sort()[0] : null,
      to: windows.length
        ? windows.map((w) => w.to).sort()[windows.length - 1]
        : null,
      transaction_count: accounts.reduce(
        (n, a) => n + a.transactions.length,
        0,
      ),
    },
    monthly_inflow: monthlyInflow(accounts),
    recurring_debits: recurringDebits(accounts),
    jan_suraksha: janSuraksha(accounts, options),
    savings_investments: savingsInvestments(
      input.accounts,
      options.requestedFiTypes ?? ["DEPOSIT"],
      today,
    ),
  };
}
