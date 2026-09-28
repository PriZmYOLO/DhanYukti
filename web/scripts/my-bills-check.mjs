#!/usr/bin/env node
/**
 * End-to-end check of "Confirm your bills" on the member's Household Twin:
 * local mock FIU module → Next.js (/api/aa, /api/households/me/*) → FastAPI
 * engines (/api/twin/*). Test data only, not Anumati.
 *
 * Needs a production build first (`npx next build`) and the API's Python
 * requirements installed. Starts all three, runs the journey over HTTP, stops.
 *
 *   npm run test:my-bills
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { connect } from "node:net";

const APP_PORT = Number(process.env.CHECK_APP_PORT ?? 3109);
const MOCK_PORT = Number(process.env.CHECK_MOCK_PORT ?? 4011);
const API_PORT = Number(process.env.CHECK_API_PORT ?? 8011);
const APP = `http://localhost:${APP_PORT}`;
const MOCK = `http://localhost:${MOCK_PORT}`;
const API = `http://127.0.0.1:${API_PORT}`;

const children = [];
const output = [];
let failed = 0;
let passed = 0;

function check(name, ok, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || detail === "" ? "" : `\n      ${JSON.stringify(detail).slice(0, 600)}`}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const portInUse = (port) =>
  new Promise((resolve) => {
    const s = connect(port, "127.0.0.1");
    s.once("connect", () => (s.destroy(), resolve(true)));
    s.once("error", () => resolve(false));
  });

function start(name, cmd, args, env, cwd) {
  const child = spawn(cmd, args, { env: { ...process.env, ...env }, cwd, stdio: ["ignore", "pipe", "pipe"] });
  for (const s of [child.stdout, child.stderr]) s.on("data", (d) => output.push(`[${name}] ${d}`));
  children.push(child);
}

async function waitFor(fn, ms, what) {
  const until = Date.now() + ms;
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch { /* not up yet */ }
    if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
    await sleep(400);
  }
}

async function newSession() {
  const r = await fetch(`${APP}/api/aa/session`, { method: "POST" });
  return r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}
async function call(cookie, method, path, body) {
  const r = await fetch(`${APP}${path}`, {
    method,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

/** Link (household calculations on) → approve at the mock → data arrives. */
async function linked(mobile) {
  const cookie = await newSession();
  const created = await call(cookie, "POST", "/api/aa/links", {
    source_access: true, household_computation: true, viewer_scope: "only_me", alerts_and_actions: true,
  });
  const id = created.body.link.link_id;
  const h = await call(cookie, "POST", `/api/aa/links/${id}/approval`, { mobile_number: mobile });
  const ref = new URL(h.body.redirect_url).searchParams.get("ref");
  await fetch(`${MOCK}/web-redirect/decide?ref=${ref}&d=approve`, { method: "POST" });
  await waitFor(async () => {
    const r = await call(cookie, "GET", `/api/aa/links/${id}`);
    const s = r.body?.link?.import?.status;
    return s === "complete" || s === "partial";
  }, 30_000, "bank data");
  return { cookie, id };
}

const events = (db) => db.river.days.flatMap((d) => d.events.map((e) => ({ ...e, date: d.date })));

async function main() {
  for (const p of [APP_PORT, MOCK_PORT, API_PORT]) if (await portInUse(p)) throw new Error(`port ${p} is in use`);
  const require = createRequire(import.meta.url);
  start("api", "python3", ["-m", "uvicorn", "app.main:app", "--port", String(API_PORT)], {}, "../api");
  start("mock", process.execPath, ["scripts/mock-fiu-module.mjs"], { MOCK_PORT: String(MOCK_PORT), MOCK_APP_URL: APP });
  start("app", process.execPath, [require.resolve("next/dist/bin/next"), "start", "-p", String(APP_PORT)], {
    ANUMATI_BASE_URL: MOCK, ANUMATI_CLIENT_ID: "mock-id", ANUMATI_CLIENT_SECRET: "mock-secret",
    NEXT_PUBLIC_AA_LIVE: "true", API_ORIGIN: API,
    KV_REST_API_URL: "", KV_REST_API_TOKEN: "", UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "", VERCEL: "",
  });
  await waitFor(async () => (await fetch(`${API}/api/health`)).ok, 30_000, "FastAPI");
  await waitFor(async () => (await fetch(MOCK)).status === 404, 20_000, "mock");
  await waitFor(async () => (await call(null, "GET", "/api/aa/status")).body?.credentials_configured, 60_000, "app (run `npx next build` first)");

  const me = await linked("9876543215");
  const db0 = await waitFor(async () => {
    const r = await call(me.cookie, "GET", "/api/households/me/dashboard");
    return r.status === 200 ? r.body : null;
  }, 60_000, "twin");
  check("twin: the member's own dashboard is built", db0.household?.id === "me", db0.household?.id);

  const b0 = await call(me.cookie, "GET", "/api/households/me/bills");
  const v0 = b0.body?.bills;
  check("bills: 200, suggestions from the member's own data", b0.status === 200 && v0?.items.length > 0, b0.body);
  const find = (v, type) => v.items.filter((i) => i.type === type);
  const [rent] = find(v0, "rent");
  const [emi] = find(v0, "emi");
  const [salary] = find(v0, "salary");
  const [fee] = find(v0, "bill"); // electricity, monthly (the quarterly school fee falls after the 45-day horizon)
  check("bills: salary, rent, EMI and electricity found per account, each monthly",
    rent?.every?.months === 1 && emi?.every?.months === 1 && salary?.kind === "income" && fee?.every?.months === 1 &&
      find(v0, "salary").map((i) => i.amount).sort().join() === "30000,35000",
    v0.items.map((i) => [i.type, i.every, i.amount]));
  check("bills: one row per repeating payment (not per date), undecided at first",
    new Set(v0.items.map((i) => i.series)).size === v0.items.length && v0.items.every((i) => i.decision.status === null) && v0.checked === 0);
  check("bills: no narrations or references in the response", !/UPI\/|NACH\/|narration|REF[0-9a-f]{8}/i.test(JSON.stringify(b0.body)));

  const decide = (body) => call(me.cookie, "POST", "/api/households/me/bills", body);
  const c1 = await decide({ series: rent.series, action: "confirm" });
  check("confirm rent: saved with a Value Ledger receipt", c1.status === 200 && /^rcpt_/.test(c1.body.receipt_id ?? "") &&
    c1.body.bills.items.find((i) => i.series === rent.series).decision.status === "confirmed", c1.body);
  const db1 = (await call(me.cookie, "GET", "/api/households/me/dashboard")).body;
  const rentEv = events(db1).filter((e) => e.series === rent.series);
  check("confirm rent: every rent date on the river says 'confirmed by you'", rentEv.length > 0 && rentEv.every((e) => e.checked === "confirmed"), rentEv);

  const c2 = await decide({ series: emi.series, action: "ignore" });
  const db2 = (await call(me.cookie, "GET", "/api/households/me/dashboard")).body;
  check("ignore EMI: it leaves the river (and every engine)", c2.status === 200 && !events(db2).some((e) => e.series === emi.series));
  const low1 = db1.river.days.at(-1).balance;
  const low2 = db2.river.days.at(-1).balance;
  check("ignore EMI: the 30-day end balance rises by the EMIs no longer counted",
    low2 - low1 === emi.amount * events(db1).filter((e) => e.series === emi.series).length, [low1, low2, emi.amount]);

  const c3 = await decide({ series: salary.series, action: "fix", amount: 30000, day: 2 });
  const db3 = (await call(me.cookie, "GET", "/api/households/me/dashboard")).body;
  const sal = events(db3).filter((e) => e.series === salary.series);
  check("fix salary ₹30,000 on the 2nd: every date, marked 'corrected by you'",
    c3.status === 200 && sal.length > 0 && sal.every((e) => e.amount === 30000 && e.date.endsWith("-02") && e.checked === "corrected"), sal);

  const c4 = await decide({ series: "everyday", action: "fix", amount: 400 });
  check("everyday: fixed to ₹400 a day and confirmed", c4.status === 200 && c4.body.bills.everyday.fixed_per_day === 400 && c4.body.bills.everyday.status === "confirmed", c4.body?.bills?.everyday);

  check("refused: ignore everyday (400)", (await decide({ series: "everyday", action: "ignore" })).status === 400);
  check("refused: ₹0 (400), day 32 (400), nothing saved",
    (await decide({ series: fee.series, action: "fix", amount: 0 })).status === 400 &&
      (await decide({ series: fee.series, action: "fix", day: 32 })).status === 400 &&
      (await call(me.cookie, "GET", "/api/households/me/bills")).body.bills.items.find((i) => i.series === fee.series).decision.status === null);
  check("refused: a payment we never suggested (404)", (await decide({ series: "rent_nobody_0000", action: "confirm" })).status === 404);
  check("refused: unknown action (400)", (await decide({ series: rent.series, action: "delete" })).status === 400);

  const u = await decide({ series: emi.series, action: "undo" });
  const db5 = (await call(me.cookie, "GET", "/api/households/me/dashboard")).body;
  check("undo ignore: EMI is back on the river, undecided", u.status === 200 &&
    u.body.bills.items.find((i) => i.series === emi.series).decision.status === null && events(db5).some((e) => e.series === emi.series));

  const st = (await call(me.cookie, "GET", "/api/dpdp/state")).body?.state;
  const bills = (st?.ledger ?? []).filter((e) => e.kind.startsWith("bill_"));
  check("ledger: 5 decisions, hash-chained, subject names no payee or amount",
    bills.length === 5 && st.ledger_verified === true && bills.every((e) => /^bill:[0-9a-f]{10}$/.test(e.subject)) &&
      bills.map((e) => e.kind).join() === "bill_confirmed,bill_ignored,bill_changed,bill_changed,bill_undone",
    bills.map((e) => [e.kind, e.subject]));

  const other = await newSession();
  check("another browser: no twin, 404", (await call(other, "GET", "/api/households/me/bills")).status === 404);
  check("no session: POST 404", (await call(null, "POST", "/api/households/me/bills", { series: rent.series, action: "confirm" })).status === 404);

  await call(me.cookie, "POST", `/api/aa/links/${me.id}/revoke`, {});
  const after = await call(me.cookie, "GET", "/api/households/me/bills");
  check("after revoke: no bills (the twin is gone)", after.status >= 400 && !JSON.stringify(after.body).includes("amount"), after);
}

try {
  await main();
} catch (error) {
  failed++;
  console.log(`FAIL  ${error.message}`);
  console.log(output.join("").split("\n").slice(-40).join("\n"));
} finally {
  for (const c of children) if (c.exitCode === null) c.kill();
}
console.log(`\n${passed} checks passed${failed ? `, ${failed} failed` : ""}`);
process.exit(failed ? 1 : 0);
