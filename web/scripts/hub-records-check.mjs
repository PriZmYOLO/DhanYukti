#!/usr/bin/env node
/**
 * End-to-end check of records from Perfios Hub on the member's Household Twin:
 * local mock FIU module + a local mock of the Hub (same paths, headers and
 * answers as hub.perfios.ai documents) → Next.js (/api/households/me/hub/*)
 * → FastAPI (/api/twin/hub/*, engines). Test data only; no Perfios credits.
 *
 * Needs a production build first (`npx next build`).
 *
 *   npm run test:hub-records
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { connect } from "node:net";

const APP_PORT = Number(process.env.CHECK_APP_PORT ?? 3119);
const MOCK_PORT = Number(process.env.CHECK_MOCK_PORT ?? 4021);
const API_PORT = Number(process.env.CHECK_API_PORT ?? 8021);
const HUB_PORT = Number(process.env.CHECK_HUB_PORT ?? 4022);
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
const ddmmyyyy = (days) => {
  const d = new Date(Date.now() + days * 864e5);
  const ist = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  return ist.replace(/\//g, "-");
};
const isoIn = (days) => ddmmyyyy(days).split("-").reverse().join("-");

/** A local stand-in for hub-test.perfios.ai/ssp/kyc/api (answers shaped like the documented ones). */
const hubCalls = [];
function mockHub() {
  const answers = {
    "/v2/elec": (b) => b.consumer_id === "NOPE1234" ? { "status-code": "103", request_id: "n1" } : {
      "status-code": "101", request_id: "e1", result: { consumer_name: "V SINGH", consumer_number: b.consumer_id, address: "HOUSE 1, RANCHI",
        bill_amount: "1663.2", amount_payable: "1722.04", bill_due_date: ddmmyyyy(10), bill_issue_date: ddmmyyyy(-20), bill_no: "260811223363565",
        mobile_number: "9999999999", email_address: "" } },
    "/v3/rc-advanced": () => ({ statusCode: 101, requestId: "r1", result: { ownerName: "S SHUKLA", chassisNumber: "MBJ11JV4", engineNumber: "2KD97",
      insuranceUpto: ddmmyyyy(5), pucExpiryDate: ddmmyyyy(200), fitnessUpto: ddmmyyyy(900), taxPaidUpto: "31-Dec-2099", financier: "HDFC BANK LTD",
      vehicleClassDescription: "Goods Carrier(LGV)", vehicleCatgory: "LGV", rcStatus: "ACTIVE", blackListStatus: "NA", insurancePolicyNumber: "110522" } }),
    "/v3/rc-challan": () => ({ statusCode: 101, requestId: "c1", result: [
      { totalAmount: 500, challanNo: "X1", challanDate: "2026-06-15 17:54:41", paymentDateAndTime: "", violatorName: "S SHUKLA", status: "Pending" }] }),
    "/v2/epf-get-otp": () => ({ "status-code": "101", request_id: "otp-req-5678", result: { message: "An OTP has been sent" } }),
    "/v2/epf-get-passbook": (b) => b.otp !== "123456" || b.request_id !== "otp-req-5678" ? { "status-code": "102", request_id: "p0" } : {
      "status-code": "101", request_id: "p1", result: { employee_details: { member_name: "X Y", dob: "05-03-1990" },
        est_details: [{ est_name: "ACME", doe_epf: "", pf_balance: { net_balance: 84000 }, passbook: [{ tr_date_my: ddmmyyyy(-30), db_cr_flag: "C" }] }],
        overall_pf_balance: { current_pf_balance: 84000, pension_balance: 30000 } } },
    "/v3/irda-verification": () => ({ statusCode: 101, requestId: "a1", result: [
      { agentName: "VINOD RUBEN", insurer: "MAX LIFE", insurerType: "Life", statusOfAgency: "Active", dateOfAppointment: "14-02-2008" }] }),
  };
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const path = req.url.replace(/^\/ssp\/kyc\/api/, "");
      const body = JSON.parse(raw || "{}");
      hubCalls.push({ path, body, headers: req.headers });
      const f = answers[path];
      res.writeHead(f ? 200 : 404, { "Content-Type": "application/json" });
      res.end(JSON.stringify(f ? f(body) : { status: 404 }));
    });
  });
  server.listen(HUB_PORT);
  return server;
}

async function main() {
  for (const p of [APP_PORT, MOCK_PORT, API_PORT, HUB_PORT]) if (await portInUse(p)) throw new Error(`port ${p} is in use`);
  const hub = mockHub();
  children.push({ exitCode: null, kill: () => hub.close() });
  const require = createRequire(import.meta.url);
  start("api", "python3", ["-m", "uvicorn", "app.main:app", "--port", String(API_PORT)], {
    PERFIOS_SECURE_ID: "mock-user", PERFIOS_SECURE_CREDENTIAL: "mock-pass", PERFIOS_ORG_ID: "Mock_Org",
    PERFIOS_HUB_BASE_URL: `http://127.0.0.1:${HUB_PORT}/ssp/kyc/api`, PERFIOS_BASE_URL: "",
  }, "../api");
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
  check("twin: the member's own dashboard, no records yet", db0.household?.id === "me" && db0.records?.length === 0, db0.records);

  const look = (kind, body) => call(me.cookie, "POST", `/api/households/me/hub/${kind}`, body);
  const noConsent = await look("electricity", { input: { board: "JBVNL", consumer_no: "HW5274", district: "Harmu" } });
  check("no consent: 403 and nothing sent to Perfios", noConsent.status === 403 && hubCalls.length === 0, noConsent);

  const el = await look("electricity", { consent: true, input: { board: "JBVNL", consumer_no: "HW5274", district: "Harmu" } });
  const call0 = hubCalls.at(-1);
  check("electricity: 200 with derived facts only", el.status === 200 && el.body.facts?.electricity?.amount_due === 1722 &&
    !/V SINGH|RANCHI|9999999999|260811223363565/.test(JSON.stringify(el.body)), el.body);
  check("Hub call: documented path, headers and consent", call0.path === "/v2/elec" && call0.headers["x-secure-id"] === "mock-user" &&
    call0.headers["x-secure-cred"] === "mock-pass" && call0.headers["x-organization-id"] === "Mock_Org" &&
    call0.body.consent === "Y" && call0.body.service_provider === "JBVNL" && call0.body.district === "HARMU", call0);
  const db1 = (await call(me.cookie, "GET", "/api/households/me/dashboard")).body;
  const billed = events(db1).filter((e) => e.biller);
  check("river: the biller's due date and amount, marked certain", billed.length === 1 && billed[0].date === isoIn(10) &&
    billed[0].amount === -1722 && billed[0].certainty === "pakka", billed);
  check("dashboard: electricity record listed", db1.records.some((r) => r.kind === "electricity"), db1.records);

  const nf = await look("electricity", { consent: true, input: { board: "BESCOM", consumer_no: "NOPE1234" } });
  check("no record: 404 not_found (no demo data)", nf.status === 404 && nf.body.error?.code === "not_found", nf.body);
  const bad = await look("electricity", { consent: true, input: { board: "JBVNL", consumer_no: "HW5274" } });
  check("JBVNL without district: 422 before any Perfios call", bad.status === 422 && hubCalls.at(-1).body.consumer_id === "NOPE1234", bad.body);

  const rc = await look("rc", { consent: true, input: { reg_no: "mh 04 cy 4545" } });
  check("vehicle: RC + e-challans in one consented lookup", rc.status === 200 && rc.body.facts?.rc?.insurance_upto === isoIn(5) &&
    rc.body.facts?.challan?.pending === 1 && !/SHUKLA|MBJ11|2KD97|110522/.test(JSON.stringify(rc.body)), rc.body);
  const db2 = (await call(me.cookie, "GET", "/api/households/me/dashboard")).body;
  const ids = db2.nba.map((n) => n.id);
  check("tasks: vehicle insurance (work vehicle) and unpaid challan cards", ids.some((i) => i.startsWith("nba_vehicle_insurance")) &&
    ids.some((i) => i.startsWith("nba_challans")) && db2.nba.find((n) => n.id.startsWith("nba_vehicle")).action.type === "link", ids);

  const otp = await look("epf_otp", { consent: true, input: { uan: "100912345678" } });
  check("EPF step 1: OTP sent, request id kept server-side", otp.status === 200 && otp.body.otp_sent === true && !("request_id" in otp.body), otp.body);
  const wrong = await look("epf", { consent: true, input: { otp: "000000" } });
  check("EPF wrong OTP: 422", wrong.status === 422, wrong.body);
  const otp2 = await look("epf_otp", { consent: true, input: { uan: "100912345678" } });
  const epf = await look("epf", { consent: true, input: { otp: "123456" } });
  check("EPF step 2: PF balance, active", otp2.status === 200 && epf.status === 200 && epf.body.facts?.epf?.pf_balance === 84000 && epf.body.facts.epf.active, epf.body);
  const db3 = (await call(me.cookie, "GET", "/api/households/me/dashboard")).body;
  check("EPF: EDLI life cover; PF not counted in days covered",
    db3.protection_detail.find((p) => p.member_id === "me")?.life === true &&
      db3.metrics.resilience_days.value === db2.metrics.resilience_days.value && /not counted/.test(db3.metrics.resilience_days.sub.en), db3.metrics.resilience_days);

  const ag = await look("agent", { input: { pan: "AHAPR6428A" } });
  const facts = (await call(me.cookie, "GET", "/api/households/me/hub")).body.facts;
  check("agent check: answer shown, nothing stored", ag.status === 200 && ag.body.agent?.any_active && !("agent" in facts) &&
    Object.keys(facts).sort().join() === "challan,electricity,epf,rc", facts);

  const st = (await call(me.cookie, "GET", "/api/dpdp/state")).body?.state;
  const granted = st.purposes.filter((p) => p.status === "granted").map((p) => p.id);
  check("ledger: one receipt per record purpose", ["electricity", "rc", "epf"].every((p) => granted.includes(p)) && st.ledger_verified, granted);

  const del = await call(me.cookie, "DELETE", "/api/households/me/hub/electricity");
  const db4 = (await call(me.cookie, "GET", "/api/households/me/dashboard")).body;
  const facts2 = (await call(me.cookie, "GET", "/api/households/me/hub")).body.facts;
  check("withdraw electricity: facts deleted, the river is back to our projection", del.status === 200 && !("electricity" in facts2) &&
    !events(db4).some((e) => e.biller) && !db4.records.some((r) => r.kind === "electricity"), facts2);

  const other = await newSession();
  check("another browser: sees none of it", Object.keys((await call(other, "GET", "/api/households/me/hub")).body.facts).length === 0);

  const gone = await call(me.cookie, "POST", "/api/me/delete", {});
  const facts3 = (await call(me.cookie, "GET", "/api/households/me/hub")).body?.facts ?? {};
  check("delete everything: no records left", gone.status < 300 && Object.keys(facts3).length === 0, [gone.status, facts3]);
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
