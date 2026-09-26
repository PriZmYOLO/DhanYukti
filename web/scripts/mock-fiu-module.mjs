#!/usr/bin/env node
/**
 * LOCAL MOCK of the Anumati FIU module (Integration Guide v1.1), for
 * developing and rehearsing the AA flow before/without real credentials.
 * It is NOT Anumati: never point a deployed app at it, never demo it as live.
 *
 * What it does, like the guide describes:
 *   POST /module/initiate/consent  → 202 { moduleReference, consentHandle,
 *                                     status, redirectUrl }  (idempotent)
 *   GET  /web-redirect?ref=…       → a stand-in consent page (Approve/Decline)
 *   on approve → consent webhook ACTIVE, then encrypts test ReBIT DEPOSIT
 *                data per account (curve25519 ECDH → HKDF → AES-GCM, UAT key
 *                escrow) and calls the data-ready webhook with id + secret
 *   POST /module/fi/fetch          → the encrypted payload, single-use
 *
 * Run (from web/):
 *   node scripts/mock-fiu-module.mjs            # port 4010
 *   MOCK_APP_URL=http://localhost:3000 node scripts/mock-fiu-module.mjs
 * and start the app with:
 *   ANUMATI_BASE_URL=http://localhost:4010 ANUMATI_CLIENT_ID=mock-id \
 *   ANUMATI_CLIENT_SECRET=mock-secret NEXT_PUBLIC_AA_LIVE=true npm run dev
 *
 * Mobile number ending in 0 → the second account "fails to deliver"
 * (to rehearse the partial state).
 */
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";

import { encryptFI, generateKeyMaterial } from "../lib/server/aa/crypto.ts";

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const APP = (process.env.MOCK_APP_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const CLIENT_ID = process.env.MOCK_CLIENT_ID ?? "mock-id";
const CLIENT_SECRET = process.env.MOCK_CLIENT_SECRET ?? "mock-secret";

const journeys = new Map(); // moduleReference → journey
const byIdempotency = new Map();
const payloads = new Map(); // id → { secret, body, expires }

const ALLOWED = {
  101: "PERIODIC",
  102: "PERIODIC",
  104: "PERIODIC",
  103: "ONETIME",
  105: "ONETIME",
};

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

async function post(path, body) {
  try {
    const r = await fetch(`${APP}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log(`[mock] webhook ${path} → ${r.status}`);
  } catch (e) {
    console.log(`[mock] webhook ${path} failed: ${e.message}`);
  }
}

/** Twelve months of a salaried household's savings account (test data). */
function rebitDeposit(masked, seed) {
  const today = new Date();
  const txns = [];
  let balance = 18_000 + seed * 7_000;
  const start = new Date(today);
  start.setMonth(start.getMonth() - 12);
  const push = (date, type, mode, amount, narration) => {
    balance += type === "CREDIT" ? amount : -amount;
    txns.push({
      type,
      mode,
      amount: amount.toFixed(2),
      currentBalance: balance.toFixed(2),
      transactionTimestamp: date.toISOString(),
      valueDate: date.toISOString().slice(0, 10),
      txnId: `M${randomBytes(6).toString("hex")}`,
      narration,
      reference: `REF${randomBytes(4).toString("hex")}`,
    });
  };
  for (let m = 0; m < 12; m++) {
    const d = (day) => {
      const x = new Date(start);
      x.setMonth(start.getMonth() + m + 1, day);
      return x;
    };
    if (d(1) > today) break;
    push(
      d(1),
      "CREDIT",
      "NEFT",
      30_000 + seed * 5_000,
      "SALARY ACME TEXTILES PVT LTD",
    );
    push(d(5), "DEBIT", "UPI", 9_000, "UPI/RENT/ANIL KUMAR");
    push(d(7), "DEBIT", "ACH", 4_200, "ACH/NACH BAJAJ FIN EMI");
    push(
      d(12),
      "DEBIT",
      "UPI",
      1_450 + (m % 3) * 120,
      "UPI/BESCOM ELECTRICITY BILL",
    );
    for (let k = 0; k < 8; k++) {
      push(
        d(8 + k * 2),
        "DEBIT",
        "UPI",
        350 + ((k * 137 + m * 59) % 900),
        "UPI/KIRANA STORE",
      );
    }
    if (m % 3 === 2)
      push(d(20), "DEBIT", "UPI", 5_000, "UPI/SCHOOL FEE/ST MARYS");
  }
  return JSON.stringify({
    Account: {
      type: "deposit",
      maskedAccNumber: masked,
      linkedAccRef: randomUUID(),
      version: "1.1",
      Profile: { Holders: { type: "SINGLE", Holder: { name: "TEST USER" } } },
      Summary: {
        currentBalance: balance.toFixed(2),
        currency: "INR",
        balanceDateTime: today.toISOString(),
        type: "SAVINGS",
        status: "ACTIVE",
      },
      Transactions: {
        startDate: start.toISOString().slice(0, 10),
        endDate: today.toISOString().slice(0, 10),
        Transaction: txns,
      },
    },
  });
}

async function deliver(journey) {
  await post("/api/aa/webhooks/consent", {
    moduleReference: journey.moduleReference,
    consentHandle: journey.consentHandle,
    consentId: `cid_${randomBytes(6).toString("hex")}`,
    status: "ACTIVE",
    timestamp: new Date().toISOString(),
  });
  // UAT key escrow: the FIU key pair is made here and returned with the data.
  const fiu = generateKeyMaterial("weierstrass");
  const accounts = [
    { fipId: "SBI-FIP-UAT", masked: "XXXXXXXX9648" },
    { fipId: "HDFC-FIP-UAT", masked: "XXXXXXXX2231" },
  ];
  const sessions = accounts.map((a, i) => {
    if (i === 1 && journey.mobile.endsWith("0")) {
      return {
        fipId: a.fipId,
        linkRefNumber: `lrn-${i + 1}`,
        maskedAccNumber: a.masked,
        status: "DELIVERY_FAILED",
      };
    }
    const fip = generateKeyMaterial("weierstrass");
    return {
      fipId: a.fipId,
      linkRefNumber: `lrn-${i + 1}`,
      maskedAccNumber: a.masked,
      encryptedFI: encryptFI({
        fipPrivateKey: fip.privateKeyPem,
        fipNonce: fip.nonce,
        ourPublicKey: fiu.publicKeyPem,
        ourNonce: fiu.nonce,
        plaintext: rebitDeposit(a.masked, i),
      }),
      fipKeyMaterial: {
        cryptoAlg: "ECDH",
        curve: "Curve25519",
        Nonce: fip.nonce,
        DHPublicKey: {
          KeyValue: fip.publicKeyPem,
          expiry: new Date(Date.now() + 864e5).toISOString(),
        },
      },
    };
  });
  const id = `dr_${randomBytes(6).toString("hex")}`;
  const secret = `s_${randomBytes(8).toString("hex")}`;
  const expires = new Date(Date.now() + 30 * 60 * 1000);
  payloads.set(id, {
    secret,
    expires,
    body: {
      moduleReference: journey.moduleReference,
      consentHandle: journey.consentHandle,
      sessions,
      uatKeyMaterial: { privateKey: fiu.privateKeyPem, nonce: fiu.nonce },
    },
  });
  await new Promise((r) => setTimeout(r, 1500)); // the banks take a moment
  await post("/api/aa/webhooks/data-ready", {
    moduleReference: journey.moduleReference,
    consentHandle: journey.consentHandle,
    id,
    secret,
    sessionCount: sessions.length,
    expiresAt: expires.toISOString(),
  });
}

const page = (title, body) => `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<body style="font-family:system-ui;max-width:28rem;margin:2rem auto;padding:0 1rem">
<p style="background:#fde68a;padding:.5rem;border-radius:.4rem"><b>LOCAL MOCK — not Anumati.</b> Stand-in consent page for development.</p>
${body}</body>`;

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (
    req.method === "POST" &&
    ["/module/initiate/consent", "/module/consent"].includes(url.pathname)
  ) {
    if (
      req.headers["x-client-id"] !== CLIENT_ID ||
      req.headers["x-client-secret"] !== CLIENT_SECRET
    ) {
      return json(res, 401, { error: "UNAUTHENTICATED" });
    }
    const body = await readBody(req);
    const c = body?.consent;
    const mobile = body?.customer?.mobileNumber;
    if (
      !c ||
      !/^\d{10}$/.test(mobile ?? "") ||
      ALLOWED[c.purposeCode] !== c.fetchType
    ) {
      return json(res, 400, {
        error: "INVALID_REQUEST",
        message: "purpose/fetchType or customer invalid",
      });
    }
    const key = req.headers["x-idempotency-key"];
    if (key && byIdempotency.has(key))
      return json(res, 202, byIdempotency.get(key));
    const moduleReference = `mr_${randomBytes(8).toString("base64url")}`;
    const journey = {
      moduleReference,
      consentHandle: randomUUID(),
      mobile,
      state: "PENDING",
    };
    journeys.set(moduleReference, journey);
    const response = {
      moduleReference,
      consentHandle: journey.consentHandle,
      status: "CONSENT_REQUESTED",
      redirectUrl: `http://localhost:${PORT}/web-redirect?ref=${moduleReference}`,
    };
    if (key) byIdempotency.set(key, response);
    console.log(
      `[mock] consent requested ${moduleReference} purpose ${c.purposeCode}`,
    );
    return json(res, 202, response);
  }

  if (req.method === "GET" && url.pathname === "/web-redirect") {
    const j = journeys.get(url.searchParams.get("ref"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    if (!j) return res.end(page("Not found", "<p>Unknown request.</p>"));
    if (j.state !== "PENDING")
      return res.end(
        page(
          "Done",
          `<p>Already ${j.state.toLowerCase()}. You can close this tab.</p>`,
        ),
      );
    return res.end(
      page(
        "Approve consent",
        `<h1>DhanYukti requests your bank data</h1>
<p>Purpose: aggregated statement · Savings accounts · 12 months · once.</p>
<p>Accounts found for ${j.mobile.replace(/^(\d{2})\d{6}/, "$1******")}: SBI ••9648, HDFC ••2231</p>
<form method="post" action="/web-redirect/decide?ref=${j.moduleReference}&d=approve"><button style="font-size:1.1rem;padding:.6rem 1rem">Approve</button></form>
<form method="post" action="/web-redirect/decide?ref=${j.moduleReference}&d=reject" style="margin-top:.5rem"><button>Decline</button></form>`,
      ),
    );
  }

  if (req.method === "POST" && url.pathname === "/web-redirect/decide") {
    const j = journeys.get(url.searchParams.get("ref"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    if (!j || j.state !== "PENDING")
      return res.end(page("Done", "<p>Nothing to do.</p>"));
    if (url.searchParams.get("d") === "approve") {
      j.state = "APPROVED";
      res.end(
        page(
          "Approved",
          "<p>Approved. Return to DhanYukti — it updates by itself.</p>",
        ),
      );
      deliver(j);
    } else {
      j.state = "REJECTED";
      res.end(page("Declined", "<p>Declined. Return to DhanYukti.</p>"));
      post("/api/aa/webhooks/consent", {
        moduleReference: j.moduleReference,
        consentHandle: j.consentHandle,
        status: "REJECTED",
        timestamp: new Date().toISOString(),
      });
    }
    return;
  }

  if (
    req.method === "POST" &&
    ["/module/fi/fetch", "/module/getdata"].includes(url.pathname)
  ) {
    if (
      req.headers["x-client-id"] !== CLIENT_ID ||
      req.headers["x-client-secret"] !== CLIENT_SECRET
    ) {
      return json(res, 401, { error: "UNAUTHENTICATED" });
    }
    const body = await readBody(req);
    const entry = payloads.get(body?.id);
    if (!entry || entry.secret !== body?.secret || entry.expires < new Date()) {
      return json(res, 410, { error: "EXPIRED" });
    }
    payloads.delete(body.id); // single-use
    return json(res, 200, entry.body);
  }

  json(res, 404, { error: "NOT_FOUND" });
}).listen(PORT, () => {
  console.log(
    `[mock] FIU module mock on http://localhost:${PORT} → webhooks to ${APP}`,
  );
});
