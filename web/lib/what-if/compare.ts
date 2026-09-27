/**
 * Read-only checks on released scenario results. Nothing here computes a
 * financial figure: it only decides whether released figures may be shown.
 */
import { isoDaysBetween } from "@/lib/format";
import type {
  ScenarioCashFlow,
  ScenarioRelease,
} from "@/lib/provisional/h08/types";

/**
 * Two results may be compared only when they come from the same baseline
 * snapshot and horizon (Guide §30: all compared scenarios share them).
 */
export function sameBasis(a: ScenarioRelease, b: ScenarioRelease): boolean {
  return (
    a.baseline_snapshot_id === b.baseline_snapshot_id &&
    a.horizon.start === b.horizon.start &&
    a.horizon.end === b.horizon.end
  );
}

/** One valid INR amount for every horizon date, in order. */
export function readableSeries(cashFlow: ScenarioCashFlow): boolean {
  const days = isoDaysBetween(cashFlow.horizon.start, cashFlow.horizon.end);
  return (
    days.length > 0 &&
    cashFlow.daily.length === days.length &&
    cashFlow.daily.every(
      (day, index) =>
        day.date === days[index] &&
        day.closing_cash?.currency === "INR" &&
        Number.isSafeInteger(day.closing_cash.amount_paise),
    )
  );
}
