/**
 * FI types (DEPOSIT, TERM_DEPOSIT, RECURRING_DEPOSIT, MUTUAL_FUNDS,
 * EQUITIES, SIP): parsers, consent body, storage, summary and revoke.
 * In process, in-memory store, FIU module stubbed at fetch(). Test data.
 *
 *   tsx --conditions=react-server scripts/aa-fi-types-check.ts
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { deepStrictEqual } from "node:assert";

import { encryptFI, generateKeyMaterial } from "../src/lib/server/aa/crypto";
import { parseDepositFI, parseFI } from "../src/lib/server/aa/rebit";
import { investmentXml, MOCK_INVESTMENTS } from "./mock-rebit-xml.mjs";

process.env.ANUMATI_BASE_URL = "http://fiu.test.invalid";
process.env.ANUMATI_CLIENT_ID = "test-client";
process.env.ANUMATI_CLIENT_SECRET = "test-only";
for (const k of [
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "VERCEL",
  "AA_FI_TYPES",
]) {
  delete process.env[k];
}

const ALL = [
  "DEPOSIT",
  "TERM_DEPOSIT",
  "RECURRING_DEPOSIT",
  "MUTUAL_FUNDS",
  "SIP",
  "EQUITIES",
] as const;
const DIR = "scripts/fixtures/rebit/";
const fixture = (f: string) => readFileSync(DIR + f, "utf8");
const paise = (rupees: string) => Math.round(Number(rupees) * 100);

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail: unknown = "") {
  if (ok) passed++;
  else failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${ok || detail === "" ? "" : `\n      ${JSON.stringify(detail)}`}`,
  );
}
function same(name: string, actual: unknown, expected: unknown) {
  try {
    deepStrictEqual(actual, expected);
    check(name, true);
  } catch {
    check(name, false, { actual, expected });
  }
}

/* ----------------------------- 1. parsers ----------------------------- */

function parsers() {
  const expected = JSON.parse(fixture("deposit.expected.json"));
  for (const f of ["deposit.xml", "deposit-prefixed.xml", "deposit.json"]) {
    same(
      `DEPOSIT ${f}: output identical to the verified parser`,
      parseDepositFI(fixture(f)),
      expected[f],
    );
  }
  const dep = parseFI(fixture("deposit.xml"));
  check(
    "DEPOSIT xml via parseFI: fi_type DEPOSIT, 4 transactions, ₹12,345.50",
    dep.fi_type === "DEPOSIT" &&
      dep.transactions.length === 4 &&
      dep.balance_paise === 1234550,
  );

  const td = parseFI(fixture("term_deposit.xml"));
  same(
    "TERM_DEPOSIT: masked, current, principal, maturity, rate",
    td.fi_type === "TERM_DEPOSIT" ? td.deposit_terms : null,
    {
      masked_acc_number: "XXXXXXXX7001",
      current_value_paise: 10425075,
      principal_paise: 10000000,
      maturity_amount_paise: 11255000,
      maturity_date: "2027-03-15",
      interest_rate: "7.10",
      recurring_amount_paise: null,
      recurring_day: null,
    },
  );
  // v2.0.0 names the current value currentBalance.
  const td2 = parseFI(
    fixture("term_deposit.xml").replace(
      'currentValue="104250.75"',
      'currentBalance="104250.75"',
    ),
  );
  check(
    "TERM_DEPOSIT v2.0.0 (currentBalance) read the same",
    td2.fi_type === "TERM_DEPOSIT" &&
      td2.deposit_terms.current_value_paise === 10425075,
  );
  const tdMissing = parseFI(
    fixture("term_deposit.xml")
      .replace('currentValue="104250.75"', 'currentValue=""')
      .replace('maturityDate="2027-03-15"', ""),
  );
  check(
    "TERM_DEPOSIT missing value and date stay null, never 0",
    tdMissing.fi_type === "TERM_DEPOSIT" &&
      tdMissing.deposit_terms.current_value_paise === null &&
      tdMissing.deposit_terms.maturity_date === null,
  );

  const rd = parseFI(fixture("recurring_deposit.xml"));
  same(
    "RECURRING_DEPOSIT: adds instalment amount and due day",
    rd.fi_type === "RECURRING_DEPOSIT" ? rd.deposit_terms : null,
    {
      masked_acc_number: "XXXXXXXX7002",
      current_value_paise: 3114020,
      principal_paise: 3000000,
      maturity_amount_paise: 6321000,
      maturity_date: "2027-09-10",
      interest_rate: "6.75",
      recurring_amount_paise: 250000,
      recurring_day: 10,
    },
  );

  const mf = parseFI(fixture("mutual_funds.xml"));
  const mfh =
    mf.fi_type === "MUTUAL_FUNDS" && mf.holdings.kind === "mutual_funds"
      ? mf.holdings
      : null;
  check(
    "MUTUAL_FUNDS: account current and cost value",
    mfh?.current_value_paise === 17123456 && mfh.cost_value_paise === 15000000,
    mfh,
  );
  same(
    "MUTUAL_FUNDS: per scheme AMC, name, units, NAV, as-of",
    mfh?.schemes[0],
    {
      amc: "TEST AMC ONE",
      scheme_name: "TEST LARGE CAP FUND - DIRECT GROWTH",
      scheme_code: "TST001",
      isin: "INF000T01010",
      units: "1234.567",
      nav: "85.4321",
      current_value_paise: null,
      cost_value_paise: null,
      as_of: "2026-09-25",
    },
  );
  check(
    "MUTUAL_FUNDS: empty NAV stays null",
    mfh?.schemes[1].nav === null && mfh.schemes[1].as_of === null,
  );

  const eq = parseFI(fixture("equities.xml"));
  const eqh =
    eq.fi_type === "EQUITIES" && eq.holdings.kind === "equities"
      ? eq.holdings
      : null;
  same(
    "EQUITIES: per holding issuer, ISIN, units, last price",
    eqh?.holdings[0],
    {
      issuer: "TEST INDUSTRIES LTD",
      isin: "INE000T01011",
      units: "50",
      last_price: "1250.40",
      current_value_paise: null,
    },
  );
  check(
    "EQUITIES: account value ₹84,500; empty price stays null",
    eqh?.current_value_paise === 8450000 && eqh.holdings[1].last_price === null,
  );

  const sip = parseFI(fixture("sip.xml"));
  const sips =
    sip.fi_type === "SIP" && sip.holdings.kind === "sip"
      ? sip.holdings.sips
      : [];
  same("SIP: scheme, amount, frequency, next/last date, status", sips, [
    {
      amc: "TEST AMC ONE",
      scheme: "TEST LARGE CAP FUND - DIRECT GROWTH",
      isin: "INF000T01010",
      amount_paise: 500000,
      frequency: "Monthly",
      next_date: "2026-10-05",
      last_date: "2026-09-05",
      status: "active",
    },
    {
      amc: "TEST AMC ONE",
      scheme: "TEST SHORT DURATION FUND",
      isin: "INF000T02026",
      amount_paise: 200000,
      frequency: "Monthly",
      next_date: null,
      last_date: "2025-11-01",
      status: "ceased",
    },
  ]);

  // JSON if it comes: same parser, attributes as keys.
  const mfJson = parseFI(
    JSON.stringify({
      Account: {
        type: "mutualfunds",
        maskedFolioNo: "XXXXX4567",
        Summary: {
          costValue: "10.00",
          currentValue: "12.50",
          Investment: {
            Holdings: {
              Holding: {
                amc: "A",
                isinDescription: "S",
                closingUnits: "1.5",
                nav: "8.3333",
                navDate: "2026-09-25",
                unknownField: "ignored",
              },
            },
          },
        },
      },
    }),
  );
  check(
    "MUTUAL_FUNDS as JSON (one holding, unknown field ignored)",
    mfJson.fi_type === "MUTUAL_FUNDS" &&
      mfJson.holdings.kind === "mutual_funds" &&
      mfJson.holdings.current_value_paise === 1250 &&
      mfJson.holdings.schemes.length === 1 &&
      !("unknownField" in mfJson.holdings.schemes[0]),
  );
}

/* ----------------------- stubbed FIU module ---------------------- */

const consentBodies: { consent: Record<string, unknown> }[] = [];
const payloads = new Map<string, unknown>();

/** One payload with one escrow key pair for every session. */
function payload(
  moduleReference: string,
  docs: { xml: string; fipId: string }[],
) {
  const fiu = generateKeyMaterial("weierstrass");
  const sessions = docs.map(({ xml, fipId }) => {
    const fip = generateKeyMaterial("weierstrass");
    return {
      fipId,
      encryptedFI: encryptFI({
        fipPrivateKey: fip.privateKeyPem,
        fipNonce: fip.nonce,
        ourPublicKey: fiu.publicKeyPem,
        ourNonce: fiu.nonce,
        plaintext: xml,
      }),
      fipKeyMaterial: {
        Nonce: fip.nonce,
        DHPublicKey: { KeyValue: fip.publicKeyPem },
      },
    };
  });
  return {
    moduleReference,
    sessions,
    uatKeyMaterial: { privateKey: fiu.privateKeyPem, nonce: fiu.nonce },
  };
}

globalThis.fetch = (async (
  input: string | URL | Request,
  init?: RequestInit,
) => {
  const url = String(input instanceof Request ? input.url : input);
  const body = JSON.parse(String(init?.body ?? "{}"));
  const json = (status: number, value: unknown) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  if (url.endsWith("/module/initiate/consent")) {
    consentBodies.push(body);
    const moduleReference = `mr_${randomUUID()}`;
    return json(202, {
      moduleReference,
      consentHandle: randomUUID(),
      status: "CONSENT_REQUESTED",
      redirectUrl: `http://fiu.test.invalid/r?ref=${moduleReference}`,
    });
  }
  if (url.endsWith("/module/fi/fetch")) {
    const p = payloads.get(body.id);
    payloads.delete(body.id);
    return p ? json(200, p) : json(410, { error: "EXPIRED" });
  }
  return json(404, { error: "NOT_FOUND" });
}) as typeof fetch;

type Entry = { value: string; expires: number | null };
const memory = () =>
  (globalThis as unknown as { __dyAaMemory: Map<string, Entry> }).__dyAaMemory;
const has = (key: string) => memory().has(key);

async function main() {
  parsers();

  const links = await import("../src/lib/server/aa/links");
  const grants = {
    source_access: true as const,
    household_computation: false,
    viewer_scope: "only_me" as const,
    alerts_and_actions: true,
  };

  async function approve(sid: string, fiTypes?: string[]) {
    const link = await links.createLink(sid, {
      ...grants,
      ...(fiTypes ? { fi_types: fiTypes as never } : {}),
    });
    const before = consentBodies.length;
    const handoff = await links.startApproval(sid, link.link_id, "9876543210");
    return {
      link,
      handoff,
      body:
        consentBodies.length > before
          ? consentBodies[consentBodies.length - 1]
          : null,
    };
  }

  /* 2. consent body */
  const sid = randomUUID();
  let r = await approve(sid, [...ALL]);
  same("AA_FI_TYPES unset: link keeps DEPOSIT only", r.link.fi_types, [
    "DEPOSIT",
  ]);
  same(
    "AA_FI_TYPES unset: consent body fiTypes = [DEPOSIT]",
    r.body?.consent.fiTypes,
    ["DEPOSIT"],
  );
  const c = r.body?.consent ?? {};
  const range = c.dataRange as { from: string; to: string };
  const months =
    (Date.parse(range.to) - Date.parse(range.from)) / (86400000 * 30.44);
  check(
    "verified terms unchanged: 103, ONETIME, 12-month range, dataLife 12 MONTH, frequency 1 MONTH",
    c.purposeCode === "103" &&
      c.fetchType === "ONETIME" &&
      Math.round(months) === 12 &&
      JSON.stringify(c.dataLife) ===
        JSON.stringify({ unit: "MONTH", value: 12 }) &&
      JSON.stringify(c.frequency) ===
        JSON.stringify({ unit: "MONTH", value: 1 }),
    c,
  );
  r = await approve(sid);
  same("no choice sent: DEPOSIT only", r.body?.consent.fiTypes, ["DEPOSIT"]);
  same("live terms list exactly the requested types", r.link.terms.fi_types, [
    "DEPOSIT",
  ]);

  process.env.AA_FI_TYPES = ALL.join(",");
  r = await approve(sid, [
    "DEPOSIT",
    "TERM_DEPOSIT",
    "RECURRING_DEPOSIT",
    "MUTUAL_FUNDS",
    "EQUITIES",
  ]);
  same(
    "member unticks SIP: SIP not in the consent body",
    r.body?.consent.fiTypes,
    [
      "DEPOSIT",
      "TERM_DEPOSIT",
      "RECURRING_DEPOSIT",
      "MUTUAL_FUNDS",
      "EQUITIES",
    ],
  );
  r = await approve(sid, ["MUTUAL_FUNDS", "DEPOSIT", "BONDS", "DEPOSIT"]);
  same(
    "unknown and duplicate types dropped, canonical order",
    r.body?.consent.fiTypes,
    ["DEPOSIT", "MUTUAL_FUNDS"],
  );

  process.env.AA_FI_TYPES = "DEPOSIT, MUTUAL_FUNDS";
  same(
    "allow-list DEPOSIT,MUTUAL_FUNDS: choice ∩ allow-list",
    links.resolveFiTypes(["DEPOSIT", "SIP", "MUTUAL_FUNDS"]),
    ["DEPOSIT", "MUTUAL_FUNDS"],
  );
  let threw = false;
  try {
    await links.createLink(sid, { ...grants, fi_types: ["SIP"] });
  } catch {
    threw = true;
  }
  check("nothing left after the allow-list: link refused", threw);

  // Rollback: link made while MF was allowed, allow-list narrowed before approval.
  const early = await links.createLink(sid, {
    ...grants,
    fi_types: ["DEPOSIT", "MUTUAL_FUNDS"],
  });
  process.env.AA_FI_TYPES = "DEPOSIT";
  const before = consentBodies.length;
  await links.startApproval(sid, early.link_id, "9876543210");
  same(
    "rollback (AA_FI_TYPES=DEPOSIT) applies to links not yet sent",
    consentBodies[before]?.consent.fiTypes,
    ["DEPOSIT"],
  );

  /* 3. storage, summary, revoke */
  process.env.AA_FI_TYPES = ALL.join(",");
  const me = randomUUID();
  const full = await approve(me, [...ALL]);
  if (full.handoff.mode !== "redirect") throw new Error("approval failed");
  const ref = new URL(full.handoff.redirect_url).searchParams.get("ref")!;
  await links.handleConsentLifecycle({
    moduleReference: ref,
    status: "ACTIVE",
  });
  const docs = [
    { xml: fixture("deposit.xml"), fipId: "SBI-FIP-UAT" },
    ...(
      [
        "TERM_DEPOSIT",
        "RECURRING_DEPOSIT",
        "MUTUAL_FUNDS",
        "EQUITIES",
        "SIP",
      ] as const
    ).map((t) => ({ xml: investmentXml(t) as string, fipId: "ACME-FIP-UAT" })),
  ];
  const id = `dr_${randomUUID()}`;
  payloads.set(id, payload(ref, docs));
  const ready = await links.handleDataReady({
    moduleReference: ref,
    id,
    secret: "s",
  });
  await links.collectIfPending(ready.record!);

  const stored = JSON.parse(
    memory().get(`aa:data:${full.link.link_id}`)!.value,
  ) as { accounts: { fi_type: string; transactions: unknown[] }[] };
  same(
    "stored: one account per FI type, each with its fi_type",
    stored.accounts.map((a) => a.fi_type).sort(),
    [...ALL].sort(),
  );
  check(
    "stored: investment accounts keep no transactions",
    stored.accounts
      .filter((a) => a.fi_type !== "DEPOSIT")
      .every((a) => a.transactions.length === 0),
  );

  const s = await links.accountSummary(me, full.link.link_id);
  const si = s.status === "ready" ? s.summary.savings_investments : null;
  const m = MOCK_INVESTMENTS;
  check(
    "summary: FD+RD total = the mock's current values",
    si?.deposits.status === "ready" &&
      si.deposits.total_current_value?.amount_paise ===
        paise(m.TERM_DEPOSIT.current) + paise(m.RECURRING_DEPOSIT.current),
    si?.deposits,
  );
  check(
    "summary: next maturity is the FD (sooner), with its maturity amount",
    si?.deposits.status === "ready" &&
      si.deposits.next_maturity?.fi_type === "TERM_DEPOSIT" &&
      si.deposits.next_maturity.amount?.amount_paise ===
        paise(m.TERM_DEPOSIT.maturityAmount),
    si?.deposits,
  );
  check(
    "summary: MF market value and cost from the mock",
    si?.mutual_funds.status === "ready" &&
      si.mutual_funds.current_value?.amount_paise ===
        paise(m.MUTUAL_FUNDS.current) &&
      si.mutual_funds.cost_value?.amount_paise === paise(m.MUTUAL_FUNDS.cost) &&
      si.mutual_funds.schemes === 2,
    si?.mutual_funds,
  );
  check(
    "summary: shares market value from the mock",
    si?.equities.status === "ready" &&
      si.equities.current_value?.amount_paise === paise(m.EQUITIES.current) &&
      si.equities.holdings === 2,
    si?.equities,
  );
  check(
    "summary: one active SIP (₹5,000, next date set); the ceased one isn't active",
    si?.sips.status === "ready" &&
      si.sips.active.length === 1 &&
      si.sips.active[0].amount?.amount_paise === paise(m.SIP.active.amount) &&
      si.sips.active[0].next_date !== null &&
      si.sips.ceased === 1,
    si?.sips,
  );
  check(
    "summary: savings facts read DEPOSIT only (FD interest isn't a salary or a bill)",
    s.status === "ready" &&
      s.summary.balance.accounts.length === 1 &&
      s.summary.window.transaction_count === 4,
  );

  await links.revokeLink(me, full.link.link_id);
  check(
    "revoke deletes the data and summary for every type",
    !has(`aa:data:${full.link.link_id}`) &&
      !has(`aa:summary:${full.link.link_id}`),
  );

  // A delivered type that wasn't requested is not kept.
  const narrow = randomUUID();
  const n = await approve(narrow, ["DEPOSIT", "MUTUAL_FUNDS"]);
  if (n.handoff.mode !== "redirect") throw new Error("approval failed");
  const nref = new URL(n.handoff.redirect_url).searchParams.get("ref")!;
  await links.handleConsentLifecycle({
    moduleReference: nref,
    status: "ACTIVE",
  });
  const nid = `dr_${randomUUID()}`;
  payloads.set(
    nid,
    payload(nref, [
      { xml: fixture("deposit.xml"), fipId: "SBI-FIP-UAT" },
      { xml: investmentXml("MUTUAL_FUNDS") as string, fipId: "ACME-FIP-UAT" },
      { xml: investmentXml("EQUITIES") as string, fipId: "ACME-FIP-UAT" },
    ]),
  );
  const nready = await links.handleDataReady({
    moduleReference: nref,
    id: nid,
    secret: "s",
  });
  const after = await links.collectIfPending(nready.record!);
  const nstored = JSON.parse(
    memory().get(`aa:data:${n.link.link_id}`)!.value,
  ) as { accounts: { fi_type: string }[] };
  same(
    "unrequested EQUITIES delivered: not stored",
    nstored.accounts.map((a) => a.fi_type).sort(),
    ["DEPOSIT", "MUTUAL_FUNDS"],
  );
  check(
    "unrequested account shows 'not_requested', not a value",
    after.accounts.some(
      (a) =>
        a.fi_type === "EQUITIES" &&
        a.status === "failed" &&
        a.error?.code === "not_requested",
    ),
  );
  const ns = await links.accountSummary(narrow, n.link.link_id);
  check(
    "not requested ≠ zero: SIP/shares 'not_requested', FD/RD 'not_requested'",
    ns.status === "ready" &&
      ns.summary.savings_investments.sips.status === "not_requested" &&
      ns.summary.savings_investments.equities.status === "not_requested" &&
      ns.summary.savings_investments.deposits.status === "not_requested",
  );
}

main()
  .catch((error) => {
    failed++;
    console.log(`FAIL  ${error instanceof Error ? error.stack : error}`);
  })
  .finally(() => {
    console.log(
      `\n${passed} checks passed${failed ? `, ${failed} failed` : ""}`,
    );
    process.exit(failed ? 1 : 0);
  });
