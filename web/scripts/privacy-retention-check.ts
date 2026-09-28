/**
 * Retention and "Delete everything" checks, in process, on the in-memory
 * store (no Redis) with the FIU module stubbed at fetch(). Test data only.
 *
 *   tsx --conditions=react-server scripts/privacy-retention-check.ts
 *
 * Checks: decrypted data lives 24 hours and the derived summary 30 days;
 * expired data gives "expired" (never "not seen" or 0); revoke deletes both;
 * "Delete everything" removes this session's links, DPDP data and reports,
 * keeps its Value Ledger, refuses late results and leaves other sessions alone.
 */
import { randomUUID } from "node:crypto";

import { encryptFI, generateKeyMaterial } from "../src/lib/server/aa/crypto";

process.env.ANUMATI_BASE_URL = "http://fiu.test.invalid";
process.env.ANUMATI_CLIENT_ID = "test-client";
process.env.ANUMATI_CLIENT_SECRET = "test-only";
for (const k of [
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "VERCEL",
]) {
  delete process.env[k];
}

const DAY = 24 * 60 * 60;
let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail: unknown = "") {
  if (ok) passed++;
  else failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${ok || detail === "" ? "" : `\n      ${JSON.stringify(detail)}`}`,
  );
}

/* ------------------------- stubbed FIU module ------------------------- */

const payloads = new Map<string, unknown>();

function deposit(masked: string): string {
  const today = new Date();
  const txns = [];
  for (let m = 3; m >= 1; m--) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - m, 3);
    const date = d.toISOString().slice(0, 10);
    txns.push({
      type: "CREDIT",
      amount: "30000.00",
      valueDate: date,
      narration: "SALARY ACME",
    });
    txns.push({
      type: "DEBIT",
      amount: "9000.00",
      valueDate: date,
      narration: "UPI/RENT/ANIL KUMAR",
    });
  }
  const from = new Date(today);
  from.setMonth(from.getMonth() - 4);
  return JSON.stringify({
    Account: {
      maskedAccNumber: masked,
      Profile: { Holders: { Holder: { dob: "1994-03-15" } } },
      Summary: {
        currentBalance: "12345.00",
        balanceDateTime: today.toISOString(),
        type: "SAVINGS",
      },
      Transactions: {
        startDate: from.toISOString().slice(0, 10),
        endDate: today.toISOString().slice(0, 10),
        Transaction: txns,
      },
    },
  });
}

function fiPayload(moduleReference: string) {
  const fiu = generateKeyMaterial("weierstrass");
  const fip = generateKeyMaterial("weierstrass");
  const good = {
    fipId: "TEST-FIP",
    maskedAccNumber: "XXXXXXXX9648",
    encryptedFI: encryptFI({
      fipPrivateKey: fip.privateKeyPem,
      fipNonce: fip.nonce,
      ourPublicKey: fiu.publicKeyPem,
      ourNonce: fiu.nonce,
      plaintext: deposit("XXXXXXXX9648"),
    }),
    fipKeyMaterial: {
      Nonce: fip.nonce,
      DHPublicKey: { KeyValue: fip.publicKeyPem },
    },
  };
  // A second account that can't be opened: its ciphertext is kept 24 hours.
  const broken = {
    ...good,
    fipId: "TEST-FIP-2",
    maskedAccNumber: "XXXXXXXX2231",
    encryptedFI: "bm90LWNpcGhlcnRleHQ=",
  };
  return {
    moduleReference,
    sessions: [good, broken],
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

/* ------------------------------- helpers ------------------------------- */

type Entry = { value: string; expires: number | null };
const memory = () =>
  (globalThis as unknown as { __dyAaMemory: Map<string, Entry> }).__dyAaMemory;
const ttlOf = (key: string) => {
  const e = memory().get(key);
  return e?.expires ? Math.round((e.expires - Date.now()) / 1000) : null;
};
const has = (key: string) => memory().has(key);
const expire = (key: string) => {
  const e = memory().get(key);
  if (e) e.expires = Date.now() - 1;
};
const near = (actual: number | null, expected: number) =>
  actual !== null && Math.abs(actual - expected) <= 5;

async function main() {
  const links = await import("../src/lib/server/aa/links");
  const { deleteEverything } = await import("../src/lib/server/me/delete");
  const { setConsent } = await import("../src/lib/server/dpdp/consents");
  const { dpdpState, readLedger } =
    await import("../src/lib/server/dpdp/ledger");
  const { saveAnswers } = await import("../src/lib/server/onboarding/store");
  const { EMPTY_ANSWERS } = await import("../src/lib/onboarding/answers");
  const { fileReport, listReports } =
    await import("../src/lib/server/reports/store");

  /** A live link through the real code path: approval, webhooks, collect. */
  async function linkWithData(sid: string, alerts: boolean) {
    const link = await links.createLink(sid, {
      source_access: true,
      household_computation: false,
      viewer_scope: "only_me",
      alerts_and_actions: alerts,
    });
    const handoff = await links.startApproval(sid, link.link_id, "9876543210");
    if (handoff.mode !== "redirect")
      throw new Error(`approval: ${handoff.mode}`);
    const moduleReference = new URL(handoff.redirect_url).searchParams.get(
      "ref",
    )!;
    await links.handleConsentLifecycle({ moduleReference, status: "ACTIVE" });
    const id = `dr_${randomUUID()}`;
    payloads.set(id, fiPayload(moduleReference));
    const ready = await links.handleDataReady({
      moduleReference,
      id,
      secret: "s",
    });
    await links.collectIfPending(ready.record!);
    return { id: link.link_id, moduleReference };
  }

  // 1. TTLs as stated.
  const sid = randomUUID();
  const a = await linkWithData(sid, true);
  check(
    "decrypted data (aa:data) TTL = 24 hours",
    near(ttlOf(`aa:data:${a.id}`), DAY),
    ttlOf(`aa:data:${a.id}`),
  );
  check(
    "derived summary (aa:summary) TTL = 30 days",
    near(ttlOf(`aa:summary:${a.id}`), 30 * DAY),
    ttlOf(`aa:summary:${a.id}`),
  );
  check(
    "undecryptable payload (aa:raw) still kept 24 hours",
    near(ttlOf(`aa:raw:${a.id}`), DAY),
    ttlOf(`aa:raw:${a.id}`),
  );
  const fresh = await links.accountSummary(sid, a.id);
  check("summary ready while data is fresh", fresh.status === "ready", fresh);

  // 2. After 24 hours: expired, never "not seen" or 0.
  expire(`aa:data:${a.id}`);
  const scheme = await links.schemeCheck(sid, a.id);
  check(
    "scheme check after 24h → expired with the message",
    scheme?.status === "expired" &&
      scheme.safe_message ===
        "Bank data is deleted 24 hours after fetching. Link again to refresh.",
    scheme,
  );
  const hints = await links.coverHints(sid);
  check(
    "cover hints after 24h → bank_data expired, PMJJBY/PMSBY stay unknown",
    hints.bank_data === "expired" &&
      hints.pmjjby === "unknown" &&
      hints.pmsby === "unknown" &&
      hints.expired_message !== null,
    hints,
  );
  await setConsent(sid, "insurance_tags", "grant");
  const tag = await links.tagPolicy(sid, a.id, "any", {});
  check(
    "tag policy after 24h → expired",
    !tag.ok && tag.reason === "expired",
    tag,
  );
  check(
    "readAccountData after 24h → null (unknown, not zero)",
    (await links.readAccountData(sid, a.id)) === null,
  );
  const derived = await links.accountSummary(sid, a.id);
  check(
    "summary after 24h comes from the derived copy",
    derived.status === "ready" &&
      derived.summary.monthly_inflow.status !== undefined,
    derived.status,
  );
  expire(`aa:summary:${a.id}`);
  const gone = await links.accountSummary(sid, a.id);
  check("summary after 30 days → expired", gone.status === "expired", gone);

  // 3. Revoke deletes both keys.
  const b = await linkWithData(sid, true);
  check(
    "before revoke: data and summary stored",
    has(`aa:data:${b.id}`) && has(`aa:summary:${b.id}`),
  );
  await links.revokeLink(sid, b.id);
  check(
    "revoke deletes aa:data and aa:summary",
    !has(`aa:data:${b.id}`) &&
      !has(`aa:summary:${b.id}`) &&
      !has(`aa:raw:${b.id}`),
  );
  check(
    "after revoke: summary not found",
    (await links.accountSummary(sid, b.id)).status === "not_found",
  );

  // 4. Delete everything, for one session only.
  const me = randomUUID();
  const other = randomUUID();
  const mine = await linkWithData(me, true);
  const theirs = await linkWithData(other, true);
  await setConsent(me, "member_profile", "grant");
  await setConsent(me, "insurance_tags", "grant");
  await saveAnswers(me, EMPTY_ANSWERS);
  await fileReport(me, { card_id: "card-1", engine: "e03", reason: "unclear" });
  const before = (await readLedger(me)).length;
  const answersKeys = () =>
    [...memory().keys()].filter((k) => k.startsWith("onb:") && k.includes(me));
  check(
    "setup: answers and report stored",
    answersKeys().length > 0 && (await listReports(me)).length === 1,
  );

  const result = await deleteEverything(me);
  check(
    "delete: link, data, summary, reference and session index gone",
    !has(`aa:link:${mine.id}`) &&
      !has(`aa:data:${mine.id}`) &&
      !has(`aa:summary:${mine.id}`) &&
      !has(`aa:ref:${mine.moduleReference}`) &&
      !has(`aa:session:${me}`),
  );
  check(
    "delete: every granted DPDP purpose withdrawn",
    (await dpdpState(me)).purposes.every((p) => p.status !== "granted"),
  );
  check("delete: onboarding answers deleted", answersKeys().length === 0);
  check("delete: reports deleted", (await listReports(me)).length === 0);
  const ledger = await readLedger(me);
  check(
    "delete: Value Ledger kept, with the withdrawal and revoke receipts",
    ledger.length > before &&
      ledger.some((e) => e.kind === "dpdp_withdrawn") &&
      ledger.some((e) => e.kind === "aa_revoked") &&
      result.kept.receipts === ledger.length,
  );
  check(
    "delete: result lists the link, both purposes and the report",
    result.deleted.some((d) => d.kind === "aa_link") &&
      result.deleted.filter((d) => d.kind === "dpdp_purpose").length === 2 &&
      result.deleted.some((d) => d.kind === "reports" && d.count === 1),
    result.deleted,
  );
  const late = await links.handleDataReady({
    moduleReference: mine.moduleReference,
    id: "late",
    secret: "s",
  });
  check(
    "delete: a late data-ready is refused and stores nothing",
    late.accepted === false && !has(`aa:data:${mine.id}`),
  );
  check(
    "delete: another session's link and data untouched",
    has(`aa:link:${theirs.id}`) &&
      has(`aa:data:${theirs.id}`) &&
      has(`aa:session:${other}`),
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
