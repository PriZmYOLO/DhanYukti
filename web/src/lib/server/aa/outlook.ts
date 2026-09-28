/**
 * The member's own 30-day outlook from items THEY confirmed: a light
 * port of E03 (daily closing cash), E05 (resilience days) and E14 (the
 * first task). Nothing unconfirmed is projected. Demo households keep the
 * full Python pipeline; this runs only on a member's own linked data.
 *
 * E03 order within a day (same as api/app/engines/e03_cashflow.py):
 *   1. everyday spend (per day)  2. bills  3. income (lands end of day).
 * E05: days = balance / (everyday per day + fixed bills per month / 30);
 *   under 15 red, under 30 amber, else green.
 *
 * Pure (relative, type-only imports), so scripts can run it.
 */
import type {
  BillItem,
  EverydayItem,
  FirstTask,
  OutlookDay,
  OutlookEvent,
  OutlookResult,
} from "../../contracts/aa-bills";
import type { IsoDate, IsoTimestamp, MoneyPaise } from "../../contracts/common";
import { addDays, addMonths, CADENCE_MONTHS } from "./recurrence";

export const HORIZON_DAYS = 30;
const BUFFER_TARGET_DAYS = 30;
const BUFFER_BUILD_DAYS = 90;

const money = (amount_paise: number): MoneyPaise => ({
  amount_paise,
  currency: "INR",
});

/** Round a paise amount up to the next whole rupee. */
const ceilRupee = (paise: number) => Math.ceil(paise / 100) * 100;

/** Dates of one confirmed item inside (as_of, as_of + horizon). */
function occurrences(item: BillItem, asOf: IsoDate, last: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  const day = item.decision?.day ?? item.typical_day ?? undefined;
  let date = item.next_date;
  for (let i = 0; i < 12 && date <= last; i++) {
    if (date > asOf) out.push(date);
    if (item.evidence.basis === "scheme_rule") break;
    date = addMonths(date, CADENCE_MONTHS[item.cadence], day);
  }
  return out;
}

export function resilienceStatus(days: number): "red" | "amber" | "green" {
  return days < 15 ? "red" : days < 30 ? "amber" : "green";
}

export function projectOutlook(input: {
  as_of: IsoDate;
  opening_paise: number | null;
  opening_as_of: IsoTimestamp | null;
  items: BillItem[];
  everyday: EverydayItem;
  household_computation_allowed: boolean;
}): OutlookResult {
  if (!input.household_computation_allowed) return { status: "not_allowed" };
  const confirmed = input.items.filter(
    (i) => i.decision?.status === "confirmed",
  );
  const everydayOn =
    input.everyday.decision?.status === "confirmed" &&
    input.everyday.effective_per_month !== null;
  if (confirmed.length === 0 && !everydayOn) {
    return { status: "needs_confirmation" };
  }
  if (input.opening_paise === null) return { status: "no_balance" };

  const asOf = input.as_of;
  const last = addDays(asOf, HORIZON_DAYS - 1);
  const burn = everydayOn
    ? Math.round(input.everyday.effective_per_month!.amount_paise / 30)
    : 0;

  const byDate = new Map<IsoDate, OutlookEvent[]>();
  for (const item of confirmed) {
    const signed =
      item.kind === "income"
        ? item.effective_amount.amount_paise
        : -item.effective_amount.amount_paise;
    for (const date of occurrences(item, asOf, last)) {
      const list = byDate.get(date) ?? [];
      list.push({
        id: item.id,
        label: item.payee_label,
        kind: item.kind,
        amount: money(signed),
      });
      byDate.set(date, list);
    }
  }

  let balance = input.opening_paise;
  const days: OutlookDay[] = [
    { date: asOf, balance: money(balance), events: [] },
  ];
  for (let i = 1; i < HORIZON_DAYS; i++) {
    const date = addDays(asOf, i);
    const events = byDate.get(date) ?? [];
    balance -= burn;
    for (const e of events) if (e.amount.amount_paise < 0) balance += e.amount.amount_paise;
    for (const e of events) if (e.amount.amount_paise > 0) balance += e.amount.amount_paise;
    days.push({ date, balance: money(balance), events });
  }

  const shortfallDay = days.find((d) => d.balance.amount_paise < 0) ?? null;
  const lowestDay = days.reduce((low, d) =>
    d.balance.amount_paise < low.balance.amount_paise ? d : low,
  );
  const nextIncome =
    days.find((d) => d.events.some((e) => e.kind === "income"))?.date ?? null;

  // E05 over confirmed items: fixed bills as a monthly amount.
  const fixedMonthly = confirmed
    .filter((i) => i.kind === "bill")
    .reduce(
      (sum, i) =>
        sum + i.effective_amount.amount_paise / CADENCE_MONTHS[i.cadence],
      0,
    );
  const perDay = burn + fixedMonthly / 30;
  const resilienceDays =
    perDay > 0
      ? Math.round(Math.max(0, input.opening_paise) / perDay)
      : null;

  let firstTask: FirstTask;
  if (shortfallDay) {
    // The bill that tips the balance: largest debit on the shortfall day,
    // else the latest bill before it.
    const debitsUpTo = days
      .filter((d) => d.date <= shortfallDay.date)
      .flatMap((d) =>
        d.events
          .filter((e) => e.amount.amount_paise < 0)
          .map((e) => ({ ...e, date: d.date })),
      );
    const sameDay = debitsUpTo.filter((e) => e.date === shortfallDay.date);
    const pick = (sameDay.length ? sameDay : debitsUpTo.slice(-1)).sort(
      (a, b) => a.amount.amount_paise - b.amount.amount_paise,
    )[0];
    const daysUntil = Math.max(
      1,
      days.findIndex((d) => d.date === shortfallDay.date),
    );
    const gap = -shortfallDay.balance.amount_paise;
    firstTask = {
      kind: "shortfall",
      date: shortfallDay.date,
      gap: money(gap),
      bill_label: pick?.label ?? null,
      bill_id: pick?.id ?? null,
      next_income_date:
        days.find(
          (d) =>
            d.date > shortfallDay.date &&
            d.events.some((e) => e.kind === "income"),
        )?.date ?? null,
      per_day: money(ceilRupee(gap / daysUntil)),
      days_until: daysUntil,
    };
  } else if (resilienceDays !== null && resilienceDays < BUFFER_TARGET_DAYS) {
    const target = BUFFER_TARGET_DAYS * perDay;
    firstTask = {
      kind: "build_buffer",
      resilience_days: resilienceDays,
      per_day: money(
        ceilRupee(
          Math.max(0, target - input.opening_paise) / BUFFER_BUILD_DAYS,
        ),
      ),
    };
  } else {
    firstTask = {
      kind: "on_track",
      lowest: lowestDay.balance,
      lowest_date: lowestDay.date,
    };
  }

  return {
    status: "ready",
    as_of: asOf,
    horizon_days: HORIZON_DAYS,
    opening: money(input.opening_paise),
    opening_as_of: input.opening_as_of,
    days,
    first_shortfall: shortfallDay
      ? {
          date: shortfallDay.date,
          gap: money(-shortfallDay.balance.amount_paise),
        }
      : null,
    lowest: { date: lowestDay.date, balance: lowestDay.balance },
    next_income_date: nextIncome,
    resilience_days: resilienceDays,
    resilience_status:
      resilienceDays === null ? null : resilienceStatus(resilienceDays),
    first_task: firstTask,
    used_ids: [
      ...confirmed.map((i) => i.id),
      ...(everydayOn ? ["everyday"] : []),
    ],
    assumptions: {
      no_income_confirmed: !confirmed.some((i) => i.kind === "income"),
      no_everyday_confirmed: !everydayOn,
    },
  };
}
