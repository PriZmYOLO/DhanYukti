import "server-only";

import { createHash } from "node:crypto";

import { appendLedger } from "@/lib/server/dpdp/ledger";
import { callEngine, loadTwin, saveState, TwinError, type Twin, type TwinState } from "@/lib/server/twin/engine";
import type { BillAction, MyBill, MyBillsView } from "@/lib/contracts/my-bills";
import type { L } from "@/lib/types";

/**
 * Confirm your bills, on the member's Household Twin (E02). The twin projects
 * the payments that repeat in their own bank data; here the member says what
 * each one is: confirmed as seen, fixed (amount or day), or ignored (it won't
 * happen). Their word is kept as an overlay per repeating payment ("series"),
 * so it covers every date of it and survives a rebuild; the bank data is never
 * rewritten. Every decision is a Value Ledger entry whose subject is a hash of
 * the series: no payee, no amount.
 */

type Upcoming = {
  id: string;
  series?: string;
  every?: { months?: number; days?: number };
  date: string;
  type: string;
  label: L;
  amount: number;
  certainty?: "pakka" | "andaaza";
  basis?: L;
};


const DATED = /_\d{4}-\d{2}-\d{2}$/;
const seriesOf = (e: Upcoming) => e.series ?? e.id.replace(DATED, "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function listBills(twin: Twin, state: TwinState): MyBillsView {
  const overlays = ((state.overlays as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const upcoming = ((twin.upcoming as Upcoming[]) ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const groups = new Map<string, Upcoming[]>();
  for (const e of upcoming) {
    const sid = seriesOf(e);
    groups.set(sid, [...(groups.get(sid) ?? []), e]);
  }
  const items: MyBill[] = [...groups.entries()].map(([sid, evs]) => {
    const first = evs[0];
    const status = overlays[`series:${sid}.status`];
    return {
      series: sid,
      label: first.label,
      type: first.type,
      kind: first.amount > 0 ? "income" : "bill",
      amount: Math.abs(first.amount),
      next_date: first.date,
      dates: evs.map((e) => e.date),
      every: first.every ?? null,
      certainty: first.certainty ?? null,
      basis: first.basis ?? null,
      decision: {
        status: status === "confirmed" || status === "ignored" ? status : null,
        amount: num(overlays[`series:${sid}.amount`]),
        day: num(overlays[`series:${sid}.day`]),
      },
    };
  });
  items.sort((a, b) => (a.kind === b.kind ? a.next_date.localeCompare(b.next_date) : a.kind === "income" ? -1 : 1));
  const everydayStatus = overlays["series:everyday.status"] === "confirmed" ? "confirmed" : null;
  const everyday = {
    per_day: twin.essentials_known === false ? null : num(twin.essentials_per_day),
    basis: (twin.essentials_basis as L | undefined) ?? null,
    fixed_per_day: num(overlays.essentials_per_day),
    status: everydayStatus as "confirmed" | null,
  };
  return {
    as_of: twin.as_of,
    items,
    everyday,
    checked: items.filter((i) => i.decision.status).length + (everydayStatus ? 1 : 0),
    total: items.length + 1,
  };
}

const LEDGER_KIND = {
  confirm: "bill_confirmed",
  fix: "bill_changed",
  ignore: "bill_ignored",
  undo: "bill_undone",
} as const;

/** Ledger subject: which payment, without saying who was paid or how much. */
const subject = (series: string) => `bill:${createHash("sha256").update(series).digest("hex").slice(0, 10)}`;

export async function decideBill(
  sid: string,
  input: Record<string, unknown>,
): Promise<{ bills: MyBillsView; receipt_id: string | null }> {
  const action = input.action as BillAction;
  if (typeof input.series !== "string" || !(action in LEDGER_KIND)) {
    throw new TwinError(400, "invalid_request", "Choose confirm, fix, ignore or undo for one payment.");
  }
  const series = input.series;
  const { twin, state: saved } = await loadTwin(sid);
  const known = series === "everyday" || listBills(twin, saved).items.some((i) => i.series === series);
  if (!known) throw new TwinError(404, "unknown_item", "This payment isn't among the ones found in your bank data.");
  if (series === "everyday" && action === "ignore") {
    throw new TwinError(400, "invalid_request", "Everyday spending can be confirmed or corrected, not ignored.");
  }

  let state: TwinState = structuredClone(saved);
  const fields: [string, unknown][] = [];
  if (action === "confirm") fields.push([`series:${series}.status`, "confirmed"]);
  if (action === "ignore") fields.push([`series:${series}.status`, "ignored"]);
  if (action === "fix") {
    const amount = input.amount === undefined || input.amount === null ? null : input.amount;
    const day = input.day === undefined || input.day === null ? null : input.day;
    if (amount === null && day === null) {
      throw new TwinError(400, "invalid_request", "Enter the amount or the day to correct. Nothing was saved.");
    }
    if (series === "everyday") {
      if (day !== null) throw new TwinError(400, "invalid_request", "Everyday spending has no day of the month.");
      if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || amount > 100_000) {
        throw new TwinError(400, "invalid_request", "Enter everyday spending per day in whole rupees, above ₹0. Nothing was saved.");
      }
      fields.push(["essentials_per_day", amount]);
    } else {
      if (amount !== null) fields.push([`series:${series}.amount`, amount]);
      if (day !== null) fields.push([`series:${series}.day`, day]);
    }
    fields.push([`series:${series}.status`, "confirmed"]);
  }

  if (action === "undo") {
    // No decision any more: the twin's own projection stands again.
    const overlays = { ...((state.overlays as Record<string, unknown>) ?? {}) };
    for (const attr of ["status", "amount", "day"]) delete overlays[`series:${series}.${attr}`];
    if (series === "everyday") delete overlays.essentials_per_day;
    state = { ...state, overlays };
    await callEngine("dashboard", { twin, state }); // still a valid picture
  } else {
    for (const [field, value] of fields) {
      // The engine checks every value (unknown payment, ₹0, day 32…) before it is kept;
      // nothing is saved unless every field of this decision is accepted.
      try {
        const r = await callEngine<{ ok: boolean; state: TwinState }>("correct", { twin, state, field, value });
        state = r.state;
      } catch (e) {
        if (e instanceof TwinError && e.status === 422) {
          throw new TwinError(400, "invalid_request", "Enter an amount above ₹0 in whole rupees and a day from 1 to 31. Nothing was saved.");
        }
        throw e;
      }
    }
  }
  await saveState(sid, state);

  let receipt: string | null = null;
  try {
    receipt = (await appendLedger(sid, LEDGER_KIND[action], subject(series))).receipt_id;
  } catch (error) {
    console.info("[twin] ledger_failed", error instanceof Error ? error.message : "?");
  }
  return { bills: listBills(twin, state), receipt_id: receipt };
}
