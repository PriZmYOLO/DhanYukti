#!/usr/bin/env node
/**
 * End-to-end check of ONE household made of several people's own bank links:
 * mock FIU module → Next.js (/api/aa, /api/households/me/*) → FastAPI engines.
 *
 *  - "Whose account is this?": a family member's account linked on the same phone,
 *    shown "Sirf total" (money counts, payees hidden), then tightened to Private.
 *  - Showing MORE is refused (the owner must link again with their own OTP).
 *  - An invite used on the member's OWN phone joins the inviter's household at the
 *    level they chose; single use; the joiner sees only their own picture; revoking removes it.
 *
 * Test data only, not Anumati. Needs `npx next build` first.
 *
 *   npm run test:household
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { connect } from "node:net";

const APP_PORT = Number(process.env.CHECK_APP_PORT ?? 3119);
const MOCK_PORT = Number(process.env.CHECK_MOCK_PORT ?? 4021);
const API_PORT = Number(process.env.CHECK_API_PORT ?? 8021);
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

/** Link → approve at the mock → data arrives. `extra` carries member / invite_code. */
async function linked(mobile, { cookie = null, extra = {} } = {}) {
  cookie = cookie ?? (await newSession());
  const created = await call(cookie, "POST", "/api/aa/links", {
    source_access: true, household_computation: true, viewer_scope: "only_me", alerts_and_actions: true, ...extra,
  });
  if (created.status !== 201) return { cookie, error: created };
  const id = created.body.link.link_id;
  const h = await call(cookie, "POST", `/api/aa/links/${id}/approval`, { mobile_number: mobile });
  const ref = new URL(h.body.redirect_url).searchParams.get("ref");
  await fetch(`${MOCK}/web-redirect/decide?ref=${ref}&d=approve`, { method: "POST" });
  await waitFor(async () => {
    const r = await call(cookie, "GET", `/api/aa/links/${id}`);
    const s = r.body?.link?.import?.status;
    return s === "complete" || s === "partial";
  }, 30_000, "bank data");
  return { cookie, id, link: created.body.link };
}

const SECRETS = ["METRO", "VERMA", "SHARMA", "SECRETPAYEE"];
const leaks = (x) => SECRETS.filter((w) => JSON.stringify(x).toUpperCase().includes(w));
const members = (db) => Object.fromEntries(db.household.members.map((m) => [m.id, m]));

/** The dashboard once it reflects `pred` (the twin rebuilds in the background). */
async function dashboardWhen(cookie, pred, what) {
  return waitFor(async () => {
    const r = await call(cookie, "GET", "/api/households/me/dashboard");
    return r.status === 200 && pred(r.body) ? r.body : null;
  }, 60_000, what);
}

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

  // 1) The phone's owner links their own account (no member choice = "mine").
  const a = await linked("9876543211");
  const db0 = await dashboardWhen(a.cookie, () => true, "owner's twin");
  check("owner: own account is 'me', shown in full", members(db0).me?.account_holder === true && a.link.member?.self === true, a.link.member);

  // 2) Same phone, a family member's account: the level is required, then "Sirf total".
  const noLevel = await call(a.cookie, "POST", "/api/aa/links", { source_access: true, member: { who: "family", relation: "Pati" } });
  check("family account without a level is refused (no default)", noLevel.status === 400 && noLevel.body?.error?.code === "sharing_required", noLevel.body);
  const fam = await linked("9876543218", { cookie: a.cookie, extra: { member: { who: "family", relation: "Pati", role: "earning_adult", sharing: "sirf_total" } } });
  check("family link is tagged with its member and level", fam.link.member?.self === false && fam.link.member?.sharing === "sirf_total" && fam.link.member?.relation === "Pati", fam.link.member);
  const famId = fam.link.member.id;
  const db1 = await dashboardWhen(a.cookie, (d) => members(d)[famId], "household with Pati");
  const pati = members(db1)[famId];
  check("household: Pati is a member with their own account, earning, 'Sirf total'",
    pati?.account_holder && pati?.earner && pati?.sharing === "sirf_total" && pati?.relation === "Pati" && pati?.name === "Sunil", pati);
  check("Sirf total: none of Pati's payees appear anywhere in the dashboard", leaks(db1).length === 0, leaks(db1));
  const hiddenEv = db1.river.days.flatMap((d) => d.events).filter((e) => /\(totals only\)/.test(e.label?.en ?? ""));
  check("Sirf total: Pati's money still counts (salary/rent on the river, labelled 'totals only')",
    hiddenEv.some((e) => e.amount === 22000) && hiddenEv.some((e) => e.amount === -6000), hiddenEv.map((e) => [e.label.en, e.amount]));
  check("owner's own payees still show", JSON.stringify(db1).includes("Acme"));
  const hh1 = await call(a.cookie, "GET", "/api/aa/household");
  check("household listing: two accounts, ids and tags only",
    hh1.status === 200 && hh1.body.accounts.length === 2 && !/narration|balance|transactions/i.test(JSON.stringify(hh1.body)), hh1.body);

  // 3) Showing more is refused; showing less is instant.
  const looser = await call(a.cookie, "POST", `/api/aa/links/${fam.id}/sharing`, { sharing: "poora" });
  check("showing MORE is refused: Pati must link again with their own OTP", looser.status === 409 && looser.body?.error?.code === "needs_member", looser.body);
  const tighter = await call(a.cookie, "POST", `/api/aa/links/${fam.id}/sharing`, { sharing: "private" });
  check("showing less (Private) is accepted", tighter.status === 200 && tighter.body.link.member.sharing === "private", tighter.body);
  const db2 = await dashboardWhen(a.cookie, (d) => !members(d)[famId], "household without Pati");
  check("Private: Pati's account leaves the household picture (balance back to the owner's alone)",
    !members(db2)[famId] && db2.river.days[0].balance < db1.river.days[0].balance, [db2.river.days[0].balance, db1.river.days[0].balance]);
  const self = await call(a.cookie, "POST", `/api/aa/links/${a.id}/sharing`, { sharing: "private" });
  check("the owner's own account has no sharing switch (stop the link instead)", self.status === 409 && self.body?.error?.code === "self", self.body);

  // 4) Invite → the member's OWN phone → joins at the level they choose.
  await call(a.cookie, "POST", "/api/dpdp/consents/member_profile", { action: "grant" });
  const inv = await call(a.cookie, "POST", "/api/onboarding/invites", { role: "earning_adult", label: "Bhai" });
  const code = inv.body?.invite?.code;
  check("invite created", inv.status === 201 && /^[A-Z2-9]{8}$/.test(code ?? ""), inv.body);
  const pub = await call(null, "GET", `/api/invite/${code}`);
  check("public invite lookup: role and label only", pub.status === 200 && Object.keys(pub.body.invite).sort().join() === "expires_at,label,role", pub.body);
  const own = await call(a.cookie, "POST", "/api/aa/links", { source_access: true, invite_code: code, member: { who: "self", sharing: "poora" } });
  check("inviter can't use their own invite", own.status === 400 && own.body?.error?.code === "own_invite", own.body);
  const bNoLevel = await call(await newSession(), "POST", "/api/aa/links", { source_access: true, invite_code: code });
  check("joining without choosing a level is refused", bNoLevel.status === 400 && bNoLevel.body?.error?.code === "sharing_required", bNoLevel.body);
  const b = await linked("9876543218", { extra: { invite_code: code, member: { who: "self", sharing: "poora" } } });
  check("joiner's link: their own account, joined to the inviter's household", b.link.household === "joined" && b.link.member?.id === `inv-${code}`, b.link);
  const again = await call(null, "GET", `/api/invite/${code}`);
  check("invite is single use", again.status === 404, again.body);
  const db3 = await dashboardWhen(a.cookie, (d) => members(d)[`inv-${code}`], "household with Bhai");
  const bhai = members(db3)[`inv-${code}`];
  check("inviter's household: Bhai joined from their own phone, 'Poora', earning", bhai?.sharing === "poora" && bhai?.earner && bhai?.relation === "Bhai", bhai);
  check("Poora: Bhai's payees do show to the household", leaks(db3).includes("METRO"), leaks(db3));
  const invites = await call(a.cookie, "GET", "/api/onboarding");
  const joinedInv = invites.body?.invites?.find((i) => i.code === code);
  check("inviter's invite list: joined, with the level Bhai chose", joinedInv?.status === "joined" && joinedInv?.joined_sharing === "poora", joinedInv);
  const hh3 = await call(a.cookie, "GET", "/api/aa/household");
  check("household listing marks Bhai's account as linked from their own phone", hh3.body.accounts.some((x) => x.from === "their_phone" && x.member?.id === `inv-${code}`), hh3.body);
  const dbB = await dashboardWhen(b.cookie, () => true, "joiner's own picture");
  check("joiner sees only their OWN picture, none of the inviter's data",
    dbB.household.id === "me" && !JSON.stringify(dbB).includes("Acme") && JSON.stringify(dbB).toUpperCase().includes("METRO"), dbB.household);

  // 5) Bhai tightens from their own phone → the inviter's picture follows.
  const bt = await call(b.cookie, "POST", `/api/aa/links/${b.id}/sharing`, { sharing: "sirf_total" });
  check("Bhai makes it 'Sirf total' from their own phone", bt.status === 200, bt.body);
  const db4 = await dashboardWhen(a.cookie, (d) => members(d)[`inv-${code}`]?.sharing === "sirf_total", "Bhai at sirf total");
  check("inviter's picture: Bhai's payees now hidden", leaks(db4).length === 0, leaks(db4));

  // 6) Bhai stops the link: gone from the inviter's household.
  const rv = await call(b.cookie, "POST", `/api/aa/links/${b.id}/revoke`, {});
  check("Bhai stops the link", rv.status === 200 && rv.body.link.consent.status === "revoked", rv.body);
  const db5 = await dashboardWhen(a.cookie, (d) => !members(d)[`inv-${code}`], "household without Bhai");
  check("revoked: Bhai's account leaves the inviter's household", !members(db5)[`inv-${code}`]);
  check("the inviter can't stop Bhai's link (it's Bhai's)", (await call(a.cookie, "POST", `/api/aa/links/${b.id}/revoke`, {})).status === 404);
}

main()
  .catch((e) => { failed++; console.log(`FAIL  ${e.message}`); console.log(output.slice(-40).join("")); })
  .finally(() => {
    for (const c of children) c.kill("SIGTERM");
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
