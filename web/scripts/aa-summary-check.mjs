#!/usr/bin/env node
/**
 * End-to-end check of GET /api/aa/links/[linkId]/summary against the LOCAL
 * mock FIU module (scripts/mock-fiu-module.mjs). Not Anumati: test data only.
 *
 * Needs a production build first (`npx next build`). Starts the mock and
 * `next start` with mock credentials, runs the journeys over HTTP, then
 * stops both.
 *
 *   npm run test:aa-summary
 *
 * Expected numbers come from the mock's own schedule, not from the code
 * under test: two accounts, salary ₹30,000 and ₹35,000 on the 1st of each
 * month; rent ₹9,000, EMI ₹4,200, electricity ₹1,450–1,690 every month;
 * 12 per month plus a school fee every third month (148 per account).
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { connect } from "node:net";

import { MOCK_INVESTMENTS } from "./mock-rebit-xml.mjs";

const ALL_FI = ["DEPOSIT", "TERM_DEPOSIT", "RECURRING_DEPOSIT", "MUTUAL_FUNDS", "SIP", "EQUITIES"];
const paise = (rupees) => Math.round(Number(rupees) * 100);

const APP_PORT = Number(process.env.CHECK_APP_PORT ?? 3108);
const MOCK_PORT = Number(process.env.CHECK_MOCK_PORT ?? 4010);
const APP = `http://localhost:${APP_PORT}`;
const MOCK = `http://localhost:${MOCK_PORT}`;

const children = [];
const output = [];
let failed = 0;
let passed = 0;

function check(name, ok, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = connect(port, "127.0.0.1");
    socket.once("connect", () => (socket.destroy(), resolve(true)));
    socket.once("error", () => resolve(false));
  });
}

function start(name, args, env) {
  const child = spawn(process.execPath, args, {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (d) => output.push(`[${name}] ${d}`));
  }
  children.push(child);
  return child;
}

function stopAll() {
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
}

async function waitFor(fn, ms, what) {
  const until = Date.now() + ms;
  for (;;) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {
      /* not up yet */
    }
    if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
    await sleep(400);
  }
}

async function newSession() {
  const r = await fetch(`${APP}/api/aa/session`, { method: "POST" });
  return r.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function call(cookie, method, path, body) {
  const r = await fetch(`${APP}${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

/** Link → approve at the mock → wait for the data → read the summary. */
async function journey(mobile, alerts, fiTypes, household = false) {
  const cookie = await newSession();
  const created = await call(cookie, "POST", "/api/aa/links", {
    source_access: true,
    household_computation: household,
    viewer_scope: "only_me",
    alerts_and_actions: alerts,
    ...(fiTypes ? { fi_types: fiTypes } : {}),
  });
  const id = created.body.link.link_id;
  const handoff = await call(cookie, "POST", `/api/aa/links/${id}/approval`, {
    mobile_number: mobile,
  });
  if (handoff.body?.mode !== "redirect") {
    throw new Error(`approval did not redirect: ${JSON.stringify(handoff.body)}`);
  }
  const ref = new URL(handoff.body.redirect_url).searchParams.get("ref");
  await fetch(`${MOCK}/web-redirect/decide?ref=${ref}&d=approve`, {
    method: "POST",
  });
  const link = await waitFor(
    async () => {
      const r = await call(cookie, "GET", `/api/aa/links/${id}`);
      const s = r.body?.link?.import?.status;
      return s === "complete" || s === "partial" ? r.body.link : null;
    },
    30_000,
    `bank data for ${mobile}`,
  );
  const summary = await call(cookie, "GET", `/api/aa/links/${id}/summary`);
  return { cookie, id, link, summary };
}

async function main() {
  for (const port of [APP_PORT, MOCK_PORT]) {
    if (await portInUse(port)) {
      throw new Error(`port ${port} is in use; stop that server first`);
    }
  }
  const require = createRequire(import.meta.url);
  start("mock", ["scripts/mock-fiu-module.mjs"], {
    MOCK_PORT: String(MOCK_PORT),
    MOCK_APP_URL: APP,
  });
  start("app", [require.resolve("next/dist/bin/next"), "start", "-p", String(APP_PORT)], {
    ANUMATI_BASE_URL: MOCK,
    ANUMATI_CLIENT_ID: "mock-id",
    ANUMATI_CLIENT_SECRET: "mock-secret",
    NEXT_PUBLIC_AA_LIVE: "true",
    KV_REST_API_URL: "",
    KV_REST_API_TOKEN: "",
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    VERCEL: "",
    // Every type allowed: journeys that send no choice must stay DEPOSIT-only.
    AA_FI_TYPES: ALL_FI.join(","),
  });
  await waitFor(async () => (await fetch(MOCK)).status === 404, 20_000, "mock");
  await waitFor(
    async () => (await call(null, "GET", "/api/aa/status")).body?.credentials_configured,
    60_000,
    "app (run `npx next build` first)",
  );

  // 1. Twelve months, alerts on, PMJJBY + PMSBY premiums (mobile ends in 5).
  const full = await journey("9876543215", true);
  const s = full.summary.body?.summary;
  check("summary: 200 for this session's own active link", full.summary.status === 200 && !!s, JSON.stringify(full.summary.body));
  const raw = JSON.stringify(full.summary.body);
  check(
    "summary: no transactions or narrations beyond payee labels",
    !/transactions"|narration|txn_id|ACME|KIRANA|REF[0-9a-f]{8}/i.test(raw),
  );
  const imported = full.link.import.accounts.filter((a) => a.balance);
  const expectedTotal = imported.reduce((n, a) => n + a.balance.amount_paise, 0);
  check(
    "balance: total = sum of both accounts' balances",
    imported.length === 2 && s.balance.total?.amount_paise === expectedTotal,
    `total ${s.balance.total?.amount_paise}, expected ${expectedTotal}`,
  );
  check(
    "balance: per-account masked labels and balances",
    s.balance.accounts.length === 2 &&
      s.balance.accounts.some((a) => a.account_label.includes("··9648")) &&
      s.balance.accounts.some((a) => a.account_label.includes("··2231")) &&
      s.balance.accounts.every((a) =>
        imported.some((i) => i.account_label === a.account_label && i.balance.amount_paise === a.balance?.amount_paise),
      ),
  );
  const froms = full.link.import.accounts.map((a) => a.data_from).sort();
  const tos = full.link.import.accounts.map((a) => a.data_to).sort();
  check(
    "window: from/to match the bank's declared dates",
    s.window.from === froms[0] && s.window.to === tos[tos.length - 1],
    `${s.window.from} → ${s.window.to}`,
  );
  check(
    "window: 298 transactions (148 per account + 2 scheme premiums)",
    s.window.transaction_count === 2 * 148 + 2,
    `got ${s.window.transaction_count}`,
  );
  check(
    "monthly inflow: median ₹65,000 (₹30,000 + ₹35,000 salaries)",
    s.monthly_inflow.status === "known" &&
      s.monthly_inflow.median.amount_paise === 65_000_00 &&
      s.monthly_inflow.months_counted >= 10,
    JSON.stringify(s.monthly_inflow),
  );
  const rec = s.recurring_debits.items;
  check(
    "recurring: rent ₹9,000, EMI ₹4,200, electricity ₹1,570 (in that order)",
    rec.length === 3 &&
      rec[0].payee_label === "Rent Anil Kumar" && rec[0].typical_amount.amount_paise === 9_000_00 &&
      rec[1].payee_label === "Bajaj Fin Emi" && rec[1].typical_amount.amount_paise === 4_200_00 &&
      rec[2].payee_label === "Bescom Electricity Bill" && rec[2].typical_amount.amount_paise === 1_570_00 &&
      rec.every((r) => r.months_seen >= 11 && r.last_date <= s.window.to),
    JSON.stringify(rec),
  );
  check(
    "recurring: kirana shopping (varying amounts) is not a recurring debit",
    !rec.some((r) => /kirana/i.test(r.payee_label)),
  );
  const js = s.jan_suraksha;
  check(
    "Jan Suraksha: both premiums seen on ··9648",
    js.status === "checked" &&
      js.findings.every((f) => f.status === "premium_seen" && f.evidence?.account_label.includes("··9648")),
    JSON.stringify(js),
  );

  // 2. Forty days of history: fewer than 2 complete months.
  const short = await journey("9876543213", true);
  const ss = short.summary.body?.summary;
  check(
    "short history: monthly inflow is \"unknown\", never 0",
    ss?.monthly_inflow.status === "unknown" &&
      ss.monthly_inflow.months_counted < 2 &&
      !("median" in ss.monthly_inflow),
    JSON.stringify(ss?.monthly_inflow),
  );
  check(
    "short history: Jan Suraksha is \"unknown\", not \"not seen\"",
    ss?.jan_suraksha.status === "checked" && ss.jan_suraksha.findings.every((f) => f.status === "unknown"),
    JSON.stringify(ss?.jan_suraksha),
  );

  // 3. Alerts and suggested actions off.
  const off = await journey("9876543211", false);
  check(
    "alerts off: Jan Suraksha is \"not_checked_consent_off\"",
    off.summary.body?.summary?.jan_suraksha.status === "not_checked_consent_off",
    JSON.stringify(off.summary.body?.summary?.jan_suraksha),
  );

  // 3b. All six FI types shared (XML for each from the mock).
  check("no choice sent: link is DEPOSIT only, even with every type allowed", JSON.stringify(full.link.fi_types) === '["DEPOSIT"]', full.link.fi_types);
  check("no choice sent: no investment block shown", s.savings_investments.requested.length === 1 && s.savings_investments.deposits.status === "not_requested");
  const all = await journey("9876543215", true, ALL_FI);
  const a = all.summary.body?.summary;
  const si = a?.savings_investments;
  const m = MOCK_INVESTMENTS;
  check("all types: link and terms list exactly the six requested", JSON.stringify(all.link.fi_types) === JSON.stringify(ALL_FI) && JSON.stringify(all.link.terms.fi_types) === JSON.stringify(ALL_FI), all.link.fi_types);
  check("all types: savings facts unchanged by investments (₹65,000 inflow, 298 txns)", a?.monthly_inflow.median?.amount_paise === 65_000_00 && a.window.transaction_count === 298, { inflow: a?.monthly_inflow, n: a?.window.transaction_count });
  check("all types: FD+RD ₹1,35,390.95, next maturity = FD ₹1,12,550",
    si?.deposits.status === "ready" && si.deposits.total_current_value?.amount_paise === paise(m.TERM_DEPOSIT.current) + paise(m.RECURRING_DEPOSIT.current) &&
      si.deposits.next_maturity?.fi_type === "TERM_DEPOSIT" && si.deposits.next_maturity.amount?.amount_paise === paise(m.TERM_DEPOSIT.maturityAmount), si?.deposits);
  check("all types: MF ₹1,71,234.56 (cost ₹1,50,000), shares ₹84,500",
    si?.mutual_funds.current_value?.amount_paise === paise(m.MUTUAL_FUNDS.current) && si.mutual_funds.cost_value?.amount_paise === paise(m.MUTUAL_FUNDS.cost) && si.equities.current_value?.amount_paise === paise(m.EQUITIES.current), { mf: si?.mutual_funds, eq: si?.equities });
  check("all types: one active SIP ₹5,000 with a next date", si?.sips.status === "ready" && si.sips.active.length === 1 && si.sips.active[0].amount.amount_paise === paise(m.SIP.active.amount) && !!si.sips.active[0].next_date, si?.sips);
  check("all types: summary still carries no holdings detail beyond counts", !/isin|INF000|INE000|closingUnits|SIP-1/i.test(JSON.stringify(all.summary.body)));
  const status = await call(null, "GET", "/api/aa/status");
  check("status lists the allow-list (names only)", JSON.stringify(status.body?.fi_types_allowed) === JSON.stringify(ALL_FI));
  await call(all.cookie, "POST", `/api/aa/links/${all.id}/revoke`, {});
  check("all types: after revoke, 404", (await call(all.cookie, "GET", `/api/aa/links/${all.id}/summary`)).status === 404);

  // 3c. Confirm your bills (E02 + consent step), household calculations on.
  const hh = await journey("9876543215", true, undefined, true);
  const b0 = await call(hh.cookie, "GET", `/api/aa/links/${hh.id}/bills`);
  const v0 = b0.body?.bills;
  check("bills: 200 for this session's own active link", b0.status === 200 && !!v0, b0.body);
  const find = (v, re, acct) => v.items.filter((i) => re.test(i.payee_label) && (!acct || i.account_labels[0].includes(acct)));
  const incomes = v0.items.filter((i) => i.kind === "income");
  check("bills: two salaries (₹30,000 and ₹35,000), monthly on the 1st, one per account",
    incomes.length === 2 && incomes.map((i) => i.typical_amount.amount_paise).sort().join() === "3000000,3500000" &&
      incomes.every((i) => i.cadence === "monthly" && i.typical_day === 1 && i.category === "salary"), incomes);
  const rents = find(v0, /rent/i);
  check("bills: rent ₹9,000 on the 5th from each account, high confidence",
    rents.length === 2 && rents.every((r) => r.typical_amount.amount_paise === 9_000_00 && r.typical_day === 5 && r.confidence === "high" && r.category === "rent"), rents);
  const fees = find(v0, /school/i);
  check("bills: school fee ₹5,000 every 3 months (quarterly) on the 20th",
    fees.length === 2 && fees.every((f) => f.cadence === "quarterly" && f.typical_day === 20 && f.typical_amount.amount_paise === 5_000_00), fees);
  const pm = find(v0, /pmjjby/i);
  check("bills: PMJJBY seen once, yearly by the scheme rule, on ··9648 only, due by 31 May",
    pm.length === 1 && pm[0].evidence.basis === "scheme_rule" && pm[0].account_labels[0].includes("··9648") && pm[0].next_date.endsWith("-05-31"), pm);
  check("bills: kirana is everyday spend, not a bill", !find(v0, /kirana/i).length && v0.everyday.estimate.status === "known", v0.everyday);
  check("bills: nothing confirmed = nothing projected", v0.outlook.status === "needs_confirmation", v0.outlook);
  check("bills: no transactions, narrations or references in the response",
    !/transactions"|narration|txn_id|UPI\/|NACH\/|REF[0-9a-f]{8}/i.test(JSON.stringify(b0.body)));
  check("summary: carries no bills block (bills have their own route)", !("bills" in (hh.summary.body?.summary ?? {})));

  const decide = (body) => call(hh.cookie, "POST", `/api/aa/links/${hh.id}/bills`, body);
  const confirmIds = [...incomes, ...rents, ...find(v0, /emi/i)].map((i) => i.id);
  let v = v0;
  for (const id of confirmIds) v = (await decide({ id, action: "confirm" })).body.bills;
  v = (await decide({ id: "everyday", action: "confirm" })).body.bills;
  const o = v.outlook;
  check("outlook: ready after confirming, 30 days from today", o.status === "ready" && o.days.length === 30 && o.days[0].date === v.as_of, o.status);
  check("outlook: uses exactly the confirmed items (school fee, electricity left out)",
    o.used_ids.length === confirmIds.length + 1 && confirmIds.every((id) => o.used_ids.includes(id)) && !fees.some((f) => o.used_ids.includes(f.id)), o.used_ids);
  const opening = hh.summary.body.summary.balance.total.amount_paise;
  check("outlook: opens at the bank's total balance", o.opening.amount_paise === opening, [o.opening, opening]);
  const burn = Math.round(v.everyday.effective_per_month.amount_paise / 30);
  const moved = o.days.flatMap((d) => d.events).reduce((n, e) => n + e.amount.amount_paise, 0);
  check("outlook: last day = opening − 29 days of everyday spend ± confirmed events (E03 arithmetic)",
    o.days[29].balance.amount_paise === opening - 29 * burn + moved, [o.days[29].balance, opening, burn, moved]);
  check("outlook: salaries land on the 1st, rent on the 5th, within the 30 days",
    o.days.filter((d) => d.events.some((e) => e.kind === "income")).every((d) => d.date.endsWith("-01")) &&
      o.days.filter((d) => d.events.some((e) => rents.some((r) => r.id === e.id))).every((d) => d.date.endsWith("-05")));
  check("outlook: resilience days and a first task are present", typeof o.resilience_days === "number" && !!o.first_task?.kind, [o.resilience_days, o.first_task]);

  const fixedR = await decide({ id: rents[0].id, action: "fix", amount_rupees: 9500, day: 3 });
  const fr = fixedR.body?.bills?.items.find((i) => i.id === rents[0].id);
  check("fix: rent ₹9,500 on the 3rd, used in the outlook",
    fixedR.status === 200 && fr.effective_amount.amount_paise === 9_500_00 && fr.next_date.endsWith("-03") &&
      fixedR.body.bills.outlook.days.some((d) => d.date.endsWith("-03") && d.events.some((e) => e.id === rents[0].id && e.amount.amount_paise === -9_500_00)), fr);
  check("fix: a day on a yearly scheme item is refused (400)", (await decide({ id: pm[0].id, action: "fix", day: 4 })).status === 400);
  check("fix: ₹0 refused (400)", (await decide({ id: rents[1].id, action: "fix", amount_rupees: 0 })).status === 400);
  check("unknown item: 404", (await decide({ id: "rb_0000000000", action: "confirm" })).status === 404);
  check("bad action: 400", (await decide({ id: rents[1].id, action: "delete" })).status === 400);
  const ign = (await decide({ id: incomes[0].id, action: "ignore" })).body.bills;
  check("ignore: the salary leaves the outlook", ign.outlook.status === "ready" && !ign.outlook.used_ids.includes(incomes[0].id));
  const und = (await decide({ id: incomes[0].id, action: "undo" })).body.bills;
  check("undo: back to a suggestion, still not projected",
    und.items.find((i) => i.id === incomes[0].id).decision === null && !und.outlook.used_ids.includes(incomes[0].id));
  check("decisions carry Value Ledger receipts", v.items.filter((i) => i.decision).every((i) => /^rcpt_/.test(i.decision.receipt_id ?? "")));
  const led = await call(hh.cookie, "GET", "/api/dpdp/state");
  const billEntries = (led.body?.ledger ?? led.body?.state?.ledger ?? []).filter((e) => e.kind.startsWith("bill_"));
  check("ledger: every decision is a hash-chained entry (no amounts or payees in the subject), chain verified",
    billEntries.length === confirmIds.length + 1 + 1 + 2 && (led.body?.ledger_verified ?? led.body?.state?.ledger_verified) === true &&
      billEntries.every((e) => /^bill:[0-9a-f]{4}:(rb_[0-9a-f]{10}|everyday)$/.test(e.subject)),
    { n: billEntries.length, kinds: billEntries.map((e) => e.kind), verified: led.body?.ledger_verified, keys: Object.keys(led.body ?? {}) });

  const offB = await call(off.cookie, "POST", `/api/aa/links/${off.id}/bills`, { id: "everyday", action: "confirm" });
  check("household calculations off: decisions save, but the outlook is not worked out",
    offB.status === 200 && offB.body.bills.outlook.status === "not_allowed", offB.body?.bills?.outlook);
  const otherB = await call(await newSession(), "GET", `/api/aa/links/${hh.id}/bills`);
  check("bills, wrong session: 404, no figures", otherB.status === 404 && !JSON.stringify(otherB.body).includes("amount_paise"));
  check("bills, no session: POST 404", (await call(null, "POST", `/api/aa/links/${hh.id}/bills`, { id: "everyday", action: "confirm" })).status === 404);
  await call(hh.cookie, "POST", `/api/aa/links/${hh.id}/revoke`, {});
  check("bills: after revoke, 404 (suggestions and decisions deleted)", (await call(hh.cookie, "GET", `/api/aa/links/${hh.id}/bills`)).status === 404);

  // 4. Another session, no session, unknown link.
  const other = await newSession();
  const wrong = await call(other, "GET", `/api/aa/links/${full.id}/summary`);
  check("wrong session: 404", wrong.status === 404 && !JSON.stringify(wrong.body).includes("amount_paise"));
  const none = await call(null, "GET", `/api/aa/links/${full.id}/summary`);
  check("no session: 404", none.status === 404);
  const unknown = await call(full.cookie, "GET", `/api/aa/links/aa-00000000-0000-0000-0000-000000000000/summary`);
  check("unknown link in own session: 404", unknown.status === 404);

  // 5. Revoked: data deleted, summary gone.
  await call(full.cookie, "POST", `/api/aa/links/${full.id}/revoke`, {});
  const revoked = await call(full.cookie, "GET", `/api/aa/links/${full.id}/summary`);
  check("after revoke: 404, no figures", revoked.status === 404);
}

try {
  await main();
} catch (error) {
  failed++;
  console.log(`FAIL  ${error.message}`);
  console.log(output.join("").split("\n").slice(-40).join("\n"));
} finally {
  stopAll();
}
console.log(`\n${passed} checks passed${failed ? `, ${failed} failed` : ""}`);
process.exit(failed ? 1 : 0);
