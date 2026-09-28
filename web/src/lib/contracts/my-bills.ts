/**
 * Confirm your bills on the member's Household Twin: the repeating payments
 * E02 projected from their own bank data, and the member's decision on each.
 */
import type { L } from "../types";

export type BillStatus = "confirmed" | "ignored";

export interface MyBill {
  series: string;
  label: L;
  type: string;
  kind: "income" | "bill";
  /** Rupees, as the twin projected it (before the member's fix). */
  amount: number;
  next_date: string;
  /** Projected dates inside the twin's horizon. */
  dates: string[];
  every: { months?: number; days?: number } | null;
  certainty: "pakka" | "andaaza" | null;
  basis: L | null;
  decision: { status: BillStatus | null; amount: number | null; day: number | null };
}

export interface MyBillsView {
  as_of: string;
  items: MyBill[];
  everyday: {
    per_day: number | null;
    basis: L | null;
    fixed_per_day: number | null;
    status: "confirmed" | null;
  };
  /** Items with the member's decision / all items (everyday included). */
  checked: number;
  total: number;
}

export type BillAction = "confirm" | "fix" | "ignore" | "undo";
