/**
 * "Confirm your bills": joins E02's suggestions with the member's own
 * decisions, validates a new decision, and builds the view the reveal
 * step shows. Storage, session checks and the Value Ledger live in
 * links.ts; this part is pure so scripts can run it.
 *
 * A decision is the member's word, not ours: a confirmed item enters the
 * outlook, an ignored one never does, and an item with no decision is a
 * suggestion only.
 */
import type {
  BillDecision,
  BillDecisionInput,
  BillItem,
  BillsView,
  DetectedBills,
  EverydayItem,
} from "../../contracts/aa-bills";
import type { IsoDate, IsoTimestamp, MoneyPaise } from "../../contracts/common";
import { projectOutlook } from "./outlook";
import { mayHaveStopped, nextDate } from "./recurrence";

export type BillDecisions = Record<string, BillDecision>;

const MAX_RUPEES = 10_000_000;

const money = (amount_paise: number): MoneyPaise => ({
  amount_paise,
  currency: "INR",
});

export function billItems(
  detected: DetectedBills,
  decisions: BillDecisions,
  today: IsoDate,
): { items: BillItem[]; everyday: EverydayItem } {
  const items = detected.series.map((s): BillItem => {
    const decision = decisions[s.id] ?? null;
    const stopped = mayHaveStopped(s);
    return {
      ...s,
      confidence: stopped ? "low" : s.confidence,
      next_date: nextDate(s, today, decision?.day ?? null),
      may_have_stopped: stopped,
      decision,
      effective_amount: decision?.amount ?? s.typical_amount,
    };
  });
  const everydayDecision = decisions.everyday ?? null;
  const estimate = detected.everyday;
  return {
    items,
    everyday: {
      id: "everyday",
      estimate,
      decision: everydayDecision,
      effective_per_month:
        everydayDecision?.amount ??
        (estimate.status === "known" ? estimate.per_month : null),
    },
  };
}

export type DecisionCheck =
  | { ok: true; decision: BillDecision | null; kind: "confirmed" | "changed" | "ignored" | "undone" }
  | { ok: false; reason: "unknown_item" | "invalid" };

/**
 * Validates one decision against what E02 actually suggested. "undo"
 * clears the member's decision (the item goes back to a suggestion).
 */
export function checkDecision(
  detected: DetectedBills,
  input: BillDecisionInput,
  at: IsoTimestamp,
): DecisionCheck {
  const isEveryday = input.id === "everyday";
  const series = detected.series.find((s) => s.id === input.id);
  if (!isEveryday && !series) return { ok: false, reason: "unknown_item" };

  switch (input.action) {
    case "undo":
      return { ok: true, decision: null, kind: "undone" };
    case "ignore":
      return {
        ok: true,
        kind: "ignored",
        decision: { status: "ignored", amount: null, day: null, decided_at: at, receipt_id: null },
      };
    case "confirm":
      if (isEveryday && detected.everyday.status !== "known") {
        // Nothing to confirm: the member must give the amount (fix).
        return { ok: false, reason: "invalid" };
      }
      return {
        ok: true,
        kind: "confirmed",
        decision: { status: "confirmed", amount: null, day: null, decided_at: at, receipt_id: null },
      };
    case "fix": {
      const rupees = input.amount_rupees;
      const hasAmount = rupees !== undefined && rupees !== null;
      if (
        hasAmount &&
        (typeof rupees !== "number" ||
          !Number.isFinite(rupees) ||
          rupees <= 0 ||
          rupees > MAX_RUPEES)
      ) {
        return { ok: false, reason: "invalid" };
      }
      const day = input.day;
      const hasDay = day !== undefined && day !== null;
      const dayAllowed =
        !isEveryday &&
        series!.evidence.basis === "repeats" &&
        series!.cadence !== "yearly";
      if (
        hasDay &&
        (!dayAllowed || !Number.isInteger(day) || day! < 1 || day! > 31)
      ) {
        return { ok: false, reason: "invalid" };
      }
      if (!hasAmount && !hasDay) return { ok: false, reason: "invalid" };
      return {
        ok: true,
        kind: "changed",
        decision: {
          status: "confirmed",
          amount: hasAmount ? money(Math.round(rupees! * 100)) : null,
          day: hasDay ? day! : null,
          decided_at: at,
          receipt_id: null,
        },
      };
    }
    default:
      return { ok: false, reason: "invalid" };
  }
}

export function buildBillsView(input: {
  link_id: string;
  is_sandbox: boolean;
  today: IsoDate;
  detected: DetectedBills;
  decisions: BillDecisions;
  opening_paise: number | null;
  opening_as_of: IsoTimestamp | null;
  household_computation_allowed: boolean;
}): BillsView {
  const { items, everyday } = billItems(input.detected, input.decisions, input.today);
  return {
    link_id: input.link_id,
    is_sandbox: input.is_sandbox,
    as_of: input.today,
    items,
    everyday,
    reason: input.detected.reason,
    outlook: projectOutlook({
      as_of: input.today,
      opening_paise: input.opening_paise,
      opening_as_of: input.opening_as_of,
      items,
      everyday,
      household_computation_allowed: input.household_computation_allowed,
    }),
  };
}
