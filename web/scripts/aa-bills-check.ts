/**
 * "Confirm your bills": E02 detection, next dates, decisions and the
 * member's own 30-day outlook. Pure functions, in process. Test data only:
 * the year below mirrors scripts/mock-fiu-module.mjs.
 *
 *   tsx scripts/aa-bills-check.ts
 */
import { buildBillsView, checkDecision, type BillDecisions } from "../src/lib/server/aa/bills";
import { projectOutlook } from "../src/lib/server/aa/outlook";
import { addMonths, detectBills, mayHaveStopped, nextDate } from "../src/lib/server/aa/recurrence";
import type { SummaryAccountInput } from "../src/lib/server/aa/summary";
import type { BillItem, DetectedSeries, EverydayItem } from "../src/lib/contracts/aa-bills";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail: unknown = "") {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || detail === "" ? "" : `\n      ${JSON.stringify(detail)}`}`);
}

type Txn = SummaryAccountInput["transactions"][number];
const txn = (date: string, type: "CREDIT" | "DEBIT", rupees: number, narration: string): Txn => ({
  type,
  amount_paise: Math.round(rupees * 100),
  value_date: date,
  timestamp: `${date}T10:00:00+05:30`,
  narration,
});
const ymd = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Twelve months Oct 2025 – Sep 2026, like the mock FIU module's schedule. */
function mockYear(opts: { stopRentAfter?: number } = {}): SummaryAccountInput {
  const txns: Txn[] = [];
  for (let m = 0; m < 12; m++) {
    const y = 2025 + Math.floor((9 + m) / 12);
    const mon = ((9 + m) % 12) + 1;
    const d = (day: number) => ymd(y, mon, day);
    txns.push(txn(d(1), "CREDIT", 30_000, "SALARY ACME TEXTILES PVT LTD"));
    if (opts.stopRentAfter === undefined || m <= opts.stopRentAfter) {
      txns.push(txn(d(5), "DEBIT", 9_000, "UPI/RENT/ANIL KUMAR"));
    }
    txns.push(txn(d(7), "DEBIT", 4_200, "ACH/NACH BAJAJ FIN EMI"));
    txns.push(txn(d(12), "DEBIT", 1_450 + (m % 3) * 120, "UPI/BESCOM ELECTRICITY BILL"));
    for (let k = 0; k < 8; k++) {
      txns.push(txn(d(8 + k * 2), "DEBIT", 350 + ((k * 137 + m * 59) % 900), "UPI/KIRANA STORE"));
    }
    if (m % 3 === 2) txns.push(txn(d(20), "DEBIT", 5_000, "UPI/SCHOOL FEE/ST MARYS"));
    if (mon === 5) {
      txns.push(txn(d(28), "DEBIT", 436, "PMJJBY PREMIUM RENEWAL"));
      txns.push(txn(d(28), "DEBIT", 20, "PMSBY PREMIUM RENEWAL"));
    }
  }
  return {
    account_label: "Savings account · ACME-FIP ··9648",
    data_from: "2025-10-01",
    data_to: "2026-09-27",
    holder_age: 34,
    balance_paise: 1_234_500,
    balance_at: "2026-09-27T23:59:00+05:30",
    fi_type: "DEPOSIT",
    transactions: txns,
  };
}

const TODAY = "2026-09-28";

/* --------------------------------- E02 ---------------------------------- */

const detected = detectBills({ accounts: [mockYear()] });
const by = (label: string) => detected.series.find((s) => s.payee_label.toLowerCase().includes(label));

const salary = by("salary");
check("salary found as monthly income on the 1st, high confidence",
  salary?.kind === "income" && salary.category === "salary" && salary.cadence === "monthly" &&
  salary.typical_day === 1 && salary.typical_amount.amount_paise === 3_000_000 && salary.confidence === "high", salary);

const rent = by("rent");
check("rent ₹9,000 monthly on the 5th, high", rent?.category === "rent" && rent.cadence === "monthly" &&
  rent.typical_day === 5 && rent.typical_amount.amount_paise === 900_000 && rent.confidence === "high", rent);

const emi = by("emi");
check("EMI ₹4,200 monthly on the 7th", emi?.category === "emi" && emi.typical_day === 7 &&
  emi.typical_amount.amount_paise === 420_000, emi);

const power = by("electricity");
check("electricity ₹1,450–1,690 is one bill (within 15%), utility, spread shown",
  power?.category === "utility" && power.cadence === "monthly" &&
  power.evidence.amount_spread_pct > 0 && power.evidence.amount_spread_pct <= 15, power);

const fee = by("school");
check("school fee every third month = quarterly on the 20th, 4 times",
  fee?.category === "school_fee" && fee.cadence === "quarterly" && fee.typical_day === 20 &&
  fee.evidence.occurrences === 4, fee);

const pmjjby = by("pmjjby");
check("PMJJBY seen once = yearly by the scheme rule, never high",
  pmjjby?.cadence === "yearly" && pmjjby.evidence.basis === "scheme_rule" && pmjjby.confidence === "medium" &&
  pmjjby.category === "scheme", pmjjby);

check("kirana (amounts vary, 8 a month) is not a bill", !by("kirana"), detected.series.map((s) => s.payee_label));

check("everyday spend known and equals the kirana median month",
  detected.everyday.status === "known" && detected.everyday.months_counted >= 10, detected.everyday);

check("income listed first, then rent, EMI, school fee, utility",
  detected.series.map((s) => s.category).join(",").startsWith("salary,rent,emi,school_fee,utility"),
  detected.series.map((s) => s.category));

check("ids are stable for the same payee and direction",
  detectBills({ accounts: [mockYear()] }).series.map((s) => s.id).join() === detected.series.map((s) => s.id).join());

check("no narration text in what is stored (payee label only)",
  !JSON.stringify(detected).includes("UPI/") && !JSON.stringify(detected).includes("NACH"));

const second = { ...mockYear(), account_label: "Savings account · ACME-FIP ··2231",
  transactions: mockYear().transactions.map((t) => t.narration?.startsWith("SALARY") ? { ...t, amount_paise: 3_500_000 } : t) };
const two = detectBills({ accounts: [mockYear(), second] });
const incomes = two.series.filter((s) => s.kind === "income");
check("two accounts paid by one employer on the same day = two incomes (₹30,000 + ₹35,000)",
  incomes.length === 2 && incomes.map((s) => s.typical_amount.amount_paise).sort().join() === "3000000,3500000" &&
  new Set(incomes.map((s) => s.id)).size === 2, incomes.map((s) => [s.account_labels, s.typical_amount]));

/* ------------------------------ next dates ------------------------------ */

check("next dates from 28 Sep: salary 1 Oct, rent 5 Oct, EMI 7 Oct",
  nextDate(salary!, TODAY) === "2026-10-01" && nextDate(rent!, TODAY) === "2026-10-05" &&
  nextDate(emi!, TODAY) === "2026-10-07", [nextDate(salary!, TODAY), nextDate(rent!, TODAY), nextDate(emi!, TODAY)]);
check("school fee next = 3 months after the last one",
  nextDate(fee!, TODAY) === addMonths(fee!.last_date, 3, 20) || nextDate(fee!, TODAY) > TODAY, [fee!.last_date, nextDate(fee!, TODAY)]);
check("scheme premium due by next 31 May", nextDate(pmjjby!, TODAY) === "2027-05-31");
check("member's fixed day wins", nextDate(rent!, TODAY, 10) === "2026-10-10");
check("31st clamps to the month's last day", addMonths("2026-01-31", 1) === "2026-02-28");
const oldRent: DetectedSeries = { ...rent!, last_date: "2024-11-05", data_to: "2024-11-30" };
check("old sandbox data rolls forward past today", nextDate(oldRent, TODAY) === "2026-10-05", nextDate(oldRent, TODAY));

const stopped = detectBills({ accounts: [mockYear({ stopRentAfter: 6 })] });
const stoppedRent = stopped.series.find((s) => s.category === "rent")!;
check("rent that stopped 5 months ago is flagged may-have-stopped", mayHaveStopped(stoppedRent), stoppedRent);
check("a regular bill is not flagged", !mayHaveStopped(rent!));

/* ------------------------------ decisions ------------------------------- */

const at = "2026-09-28T12:00:00+05:30";
check("confirm a real item", checkDecision(detected, { id: rent!.id, action: "confirm" }, at).ok);
check("unknown id refused", !checkDecision(detected, { id: "rb_nope", action: "confirm" }, at).ok);
const fixed = checkDecision(detected, { id: rent!.id, action: "fix", amount_rupees: 9500, day: 3 }, at);
check("fix amount and day", fixed.ok && fixed.decision?.amount?.amount_paise === 950_000 && fixed.decision.day === 3, fixed);
check("a day on a yearly scheme item is refused",
  !checkDecision(detected, { id: pmjjby!.id, action: "fix", day: 5 }, at).ok);
check("zero, negative and absurd amounts refused",
  [0, -5, 1e9, Number.NaN].every((a) => !checkDecision(detected, { id: rent!.id, action: "fix", amount_rupees: a }, at).ok));
check("fix with nothing to change refused", !checkDecision(detected, { id: rent!.id, action: "fix" }, at).ok);
check("everyday can't be confirmed when unknown, only fixed",
  !checkDecision({ ...detected, everyday: { status: "unknown", reason: "x" } }, { id: "everyday", action: "confirm" }, at).ok &&
  checkDecision({ ...detected, everyday: { status: "unknown", reason: "x" } }, { id: "everyday", action: "fix", amount_rupees: 6000 }, at).ok);
check("undo clears the decision", (() => {
  const r = checkDecision(detected, { id: rent!.id, action: "undo" }, at);
  return r.ok && r.decision === null;
})());

/* ------------------------------- outlook -------------------------------- */

const confirmed = (extra: BillDecisions = {}): BillDecisions => ({
  [salary!.id]: { status: "confirmed", amount: null, day: null, decided_at: at, receipt_id: "r1" },
  [rent!.id]: { status: "confirmed", amount: null, day: null, decided_at: at, receipt_id: "r2" },
  [emi!.id]: { status: "confirmed", amount: null, day: null, decided_at: at, receipt_id: "r3" },
  everyday: { status: "confirmed", amount: null, day: null, decided_at: at, receipt_id: "r4" },
  ...extra,
});
const view = (decisions: BillDecisions, opening: number | null, allowed = true) =>
  buildBillsView({
    link_id: "aa-test", is_sandbox: true, today: TODAY, detected, decisions,
    opening_paise: opening, opening_as_of: "2026-09-27T23:59:00+05:30", household_computation_allowed: allowed,
  });

check("outlook needs 'Use in household calculations'", view(confirmed(), 1_000_000, false).outlook.status === "not_allowed");
check("nothing confirmed = nothing projected", view({}, 1_000_000).outlook.status === "needs_confirmation");
check("no readable balance = no outlook", view(confirmed(), null).outlook.status === "no_balance");

const ignoredAll = Object.fromEntries(detected.series.map((s) => [s.id, { status: "ignored", amount: null, day: null, decided_at: at, receipt_id: null }])) as BillDecisions;
check("ignored items never enter the outlook",
  view(ignoredAll, 1_000_000).outlook.status === "needs_confirmation");

const ready = view(confirmed(), 1_000_000).outlook;
check("outlook ready: 30 days from today, salary on 1 Oct, rent 5 Oct, EMI 7 Oct",
  ready.status === "ready" && ready.days.length === 30 && ready.days[0].date === TODAY &&
  ready.days.find((d) => d.date === "2026-10-05")!.events.some((e) => e.id === rent!.id) &&
  ready.next_income_date === "2026-10-01", ready.status === "ready" ? ready.days.filter((d) => d.events.length).map((d) => d.date) : ready);
check("only confirmed items used (school fee, electricity not confirmed)",
  ready.status === "ready" && !ready.used_ids.includes(fee!.id) && !ready.used_ids.includes(power!.id) &&
  ready.used_ids.includes("everyday"));

// Hand-worked shortfall: ₹2,000 today, everyday ₹3,000/month (₹100/day),
// rent ₹9,000 on 5 Oct, salary ignored → 2,000 − 7×100 − 9,000 = −7,700.
const shortfallItems: BillItem[] = [{
  ...rent!, next_date: "2026-10-05", may_have_stopped: false, effective_amount: rent!.typical_amount,
  decision: { status: "confirmed", amount: null, day: null, decided_at: at, receipt_id: null },
}];
const everyday3k: EverydayItem = {
  id: "everyday", estimate: { status: "known", per_month: { amount_paise: 300_000, currency: "INR" }, months_counted: 12 },
  decision: { status: "confirmed", amount: null, day: null, decided_at: at, receipt_id: null },
  effective_per_month: { amount_paise: 300_000, currency: "INR" },
};
const short = projectOutlook({ as_of: TODAY, opening_paise: 200_000, opening_as_of: null, items: shortfallItems, everyday: everyday3k, household_computation_allowed: true });
check("hand-worked shortfall: ₹7,700 on 5 Oct, first task names rent, ₹1,100/day for 7 days",
  short.status === "ready" && short.first_shortfall?.date === "2026-10-05" &&
  short.first_shortfall.gap.amount_paise === 770_000 && short.first_task.kind === "shortfall" &&
  short.first_task.bill_id === rent!.id && short.first_task.days_until === 7 &&
  short.first_task.per_day.amount_paise === 110_000 && short.assumptions.no_income_confirmed, short.status === "ready" ? short.first_task : short);

// E05: 2,00,000 / (100 + 9,000/30 = 400 per day) = 500 days → green, on track.
const rich = projectOutlook({ as_of: TODAY, opening_paise: 20_000_000, opening_as_of: null, items: shortfallItems, everyday: everyday3k, household_computation_allowed: true });
check("E05 resilience: ₹2,00,000 / ₹400 a day = 500 days, green, on track",
  rich.status === "ready" && rich.resilience_days === 500 && rich.resilience_status === "green" && rich.first_task.kind === "on_track",
  rich.status === "ready" ? [rich.resilience_days, rich.first_task] : rich);

// ₹10,000 with rent due: everyday spend keeps running after the rent, so
// 10,000 − 9,000 − 11 × 100 = −100 on 9 Oct (latest bill before it: rent).
const tight = projectOutlook({ as_of: TODAY, opening_paise: 1_000_000, opening_as_of: null, items: shortfallItems, everyday: everyday3k, household_computation_allowed: true });
check("₹10,000: ₹100 short on 9 Oct, after the rent",
  tight.status === "ready" && tight.first_shortfall?.date === "2026-10-09" &&
  tight.first_shortfall.gap.amount_paise === 10_000 && tight.first_task.kind === "shortfall" &&
  tight.first_task.bill_id === rent!.id, tight.status === "ready" ? tight.first_task : tight);

// No shortfall in 30 days, but thin cover: school fee ₹5,000 a quarter
// (due 20 Dec, outside the 30 days) + ₹100/day. Per day 100 + 5,000/3/30
// = 155.56; ₹3,500 → 22.5 → 23 days (amber, rounds like E05); to reach 30 days:
// (4,666.67 − 3,500) / 90 = ₹12.96 → ₹13 a day.
const feeItems: BillItem[] = [{
  ...fee!, next_date: "2026-12-20", may_have_stopped: false, effective_amount: fee!.typical_amount,
  decision: { status: "confirmed", amount: null, day: null, decided_at: at, receipt_id: null },
}];
const thin = projectOutlook({ as_of: TODAY, opening_paise: 350_000, opening_as_of: null, items: feeItems, everyday: everyday3k, household_computation_allowed: true });
check("₹3,500 = 23 days, amber, first task builds the buffer (₹13/day for 90 days)",
  thin.status === "ready" && thin.first_shortfall === null && thin.resilience_days === 23 &&
  thin.resilience_status === "amber" && thin.first_task.kind === "build_buffer" &&
  thin.first_task.per_day.amount_paise === 1_300,
  thin.status === "ready" ? [thin.resilience_days, thin.first_task] : thin);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
