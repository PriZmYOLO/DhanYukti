import "server-only";

import { randomUUID } from "node:crypto";

import { LIVE_TERMS } from "@/lib/aa/live-terms";
import type { ErrorEnvelope, IsoTimestamp } from "@/lib/contracts/common";
import type { SchemeCheckResult } from "@/lib/contracts/scheme-check";
import type {
  ConsentChoices,
  ConsentStatus,
  ImportStatus,
  ImportedAccount,
  LinkActivity,
  SourceLink,
} from "@/lib/provisional/h03/types";
import { aaConfig, aaConfigured } from "@/lib/server/aa/config";
import { decryptFI } from "@/lib/server/aa/crypto";
import {
  getData,
  startConsent,
  type FiSession,
  type GetDataResponse,
} from "@/lib/server/aa/fiu-client";
import {
  parseDepositFI,
  type ParsedDepositAccount,
} from "@/lib/server/aa/rebit";
import { kvDel, kvGet, kvSet, kvSetIfAbsent } from "@/lib/server/aa/store";
import { appendLedger, hasConsent } from "@/lib/server/dpdp/ledger";
import { detectPolicies, summariseCover } from "@/lib/server/insurance/cover";
import { readTags, saveTags, validTags } from "@/lib/server/insurance/tags";
import { checkJanSuraksha } from "@/lib/server/schemes/jan-suraksha";

/**
 * Live Account Aggregator links (Anumati FIU module). This is the server
 * side of the ConsentPort: the browser only ever receives `SourceLink`,
 * which carries no consent handle, module reference, token or secret.
 */

const DAY = 24 * 60 * 60;
const LINK_TTL = 90 * DAY;
/** DhanYukti's own retention for fetched data (shorter than dataLife). */
const DATA_TTL = 30 * DAY;

interface PendingRetrieval {
  id: string;
  secret: string;
  expires_at: string | null;
  received_at: string;
}

interface LinkRecord {
  link_id: string;
  session_id: string;
  grants: SourceLink["grants"];
  consent_status: ConsentStatus;
  provider_status: string | null;
  requested_at: IsoTimestamp;
  status_changed_at: IsoTimestamp;
  active_from: string | null;
  expires_on: string | null;
  import_status: ImportStatus;
  last_attempt_at: IsoTimestamp | null;
  accounts: ImportedAccount[];
  activity: LinkActivity[];
  module_reference: string | null;
  consent_handle: string | null;
  consent_id: string | null;
  redirect_url: string | null;
  pending: PendingRetrieval | null;
}

/**
 * What DhanYukti keeps per account. The holder's date of birth is reduced
 * to an age when stored; the date itself is not kept.
 */
export type StoredAccount = Omit<ParsedDepositAccount, "holder_dob"> & {
  fip_id: string | null;
  account_label: string;
  holder_age: number | null;
};

export interface StoredAccountData {
  link_id: string;
  fetched_at: string;
  accounts: StoredAccount[];
}

const keys = {
  session: (sid: string) => `aa:session:${sid}`,
  link: (id: string) => `aa:link:${id}`,
  ref: (moduleReference: string) => `aa:ref:${moduleReference}`,
  data: (id: string) => `aa:data:${id}`,
  raw: (id: string) => `aa:raw:${id}`,
  lock: (id: string) => `aa:lock:${id}`,
};

const now = (): IsoTimestamp => new Date().toISOString();

function istDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    date,
  );
}

function shortRef(value: string | null): string | null {
  return value ? `…${value.slice(-4)}` : null;
}

/** Value Ledger subject for an AA link (short, non-secret). */
function aaSubject(record: { link_id: string }) {
  return `aa:${record.link_id.slice(-4)}`;
}

/** Ledger writes never block the AA flow. */
async function ledger(
  sid: string,
  kind: "aa_requested" | "aa_approved" | "aa_revoked" | "aa_ended",
  record: { link_id: string },
) {
  try {
    await appendLedger(sid, kind, aaSubject(record));
  } catch (error) {
    log("ledger_failed", {
      kind,
      reason: error instanceof Error ? error.message : "?",
    });
  }
}

function envelope(code: string, safe_message: string, retryable = true) {
  const error: ErrorEnvelope = {
    request_id: randomUUID(),
    code,
    safe_message,
    retryable,
  };
  return error;
}

function log(event: string, detail: Record<string, unknown>) {
  // Server logs only: references are shortened, never secrets or data.
  console.info(`[aa] ${event}`, JSON.stringify(detail));
}

/* ------------------------------ persistence ------------------------------ */

async function saveLink(record: LinkRecord) {
  await kvSet(keys.link(record.link_id), record, LINK_TTL);
}

async function loadLink(linkId: string): Promise<LinkRecord | null> {
  if (!/^aa-[0-9a-f-]{36}$/.test(linkId)) return null;
  return kvGet<LinkRecord>(keys.link(linkId));
}

async function sessionLinkIds(sid: string): Promise<string[]> {
  return (await kvGet<string[]>(keys.session(sid))) ?? [];
}

function addActivity(
  record: LinkRecord,
  event: LinkActivity["event"],
  ref: string | null = null,
) {
  record.activity = [...record.activity, { at: now(), event, ref }].slice(-30);
}

function setConsent(record: LinkRecord, status: ConsentStatus) {
  if (record.consent_status !== status) {
    record.consent_status = status;
    record.status_changed_at = now();
  }
}

/** Data from an ended consent is deleted and later results are refused. */
async function purgeData(record: LinkRecord) {
  record.pending = null;
  record.accounts = [];
  record.import_status = "not_started";
  await kvDel(keys.data(record.link_id), keys.raw(record.link_id));
}

function isEnded(status: ConsentStatus) {
  return status === "revoked" || status === "expired" || status === "denied";
}

export function toSourceLink(record: LinkRecord): SourceLink {
  return {
    link_id: record.link_id,
    source_label: aaConfig.isSandbox
      ? "Savings accounts via Anumati (sandbox test bank)"
      : "Savings accounts via Anumati",
    is_demo: false,
    is_sandbox: aaConfig.isSandbox,
    terms: LIVE_TERMS,
    grants: record.grants,
    consent: {
      status: record.consent_status,
      requested_at: record.requested_at,
      status_changed_at: record.status_changed_at,
      active_from: record.active_from,
      expires_on: record.expires_on,
    },
    import: {
      status: record.import_status,
      last_attempt_at: record.last_attempt_at,
      accounts: isEnded(record.consent_status) ? [] : record.accounts,
    },
    activity: record.activity,
  };
}

/* --------------------------- session operations -------------------------- */

export async function listLinks(sid: string): Promise<SourceLink[]> {
  const ids = await sessionLinkIds(sid);
  const records = await Promise.all(ids.map((id) => loadLink(id)));
  const owned = records.filter(
    (r): r is LinkRecord => r !== null && r.session_id === sid,
  );
  await Promise.all(owned.map((r) => collectIfPending(r)));
  return owned.map(toSourceLink);
}

export async function getLink(
  sid: string,
  linkId: string,
): Promise<SourceLink | null> {
  const record = await loadLink(linkId);
  if (!record || record.session_id !== sid) return null;
  return toSourceLink(await collectIfPending(record));
}

export async function createLink(
  sid: string,
  choices: ConsentChoices,
): Promise<SourceLink> {
  const at = now();
  const record: LinkRecord = {
    link_id: `aa-${randomUUID()}`,
    session_id: sid,
    grants: {
      household_computation: Boolean(choices.household_computation),
      viewer_scope:
        choices.viewer_scope === "household_adults"
          ? "household_adults"
          : "only_me",
      alerts_and_actions: Boolean(choices.alerts_and_actions),
    },
    consent_status: "requested",
    provider_status: null,
    requested_at: at,
    status_changed_at: at,
    active_from: null,
    expires_on: null,
    import_status: "not_started",
    last_attempt_at: null,
    accounts: [],
    activity: [{ at, event: "requested", ref: null }],
    module_reference: null,
    consent_handle: null,
    consent_id: null,
    redirect_url: null,
    pending: null,
  };
  await saveLink(record);
  await ledger(sid, "aa_requested", record);
  const ids = await sessionLinkIds(sid);
  await kvSet(keys.session(sid), [...ids, record.link_id].slice(-20), LINK_TTL);
  return toSourceLink(record);
}

export type StartApprovalResult =
  | { mode: "redirect"; link: SourceLink; redirect_url: string }
  | { mode: "needs_details"; link: SourceLink }
  | { mode: "unavailable"; reason: string }
  | { mode: "not_found" };

export async function startApproval(
  sid: string,
  linkId: string,
  mobileNumber: string | null,
): Promise<StartApprovalResult> {
  const record = await loadLink(linkId);
  if (!record || record.session_id !== sid) return { mode: "not_found" };

  // Already handed off: reopen the same Anumati page (idempotent).
  if (record.redirect_url && record.consent_status === "awaiting_approval") {
    return {
      mode: "redirect",
      link: toSourceLink(record),
      redirect_url: record.redirect_url,
    };
  }
  if (record.consent_status !== "requested") {
    return { mode: "unavailable", reason: "This request has moved on." };
  }
  if (!aaConfigured()) {
    return {
      mode: "unavailable",
      reason:
        "The Account Aggregator connection isn't set up on this server yet (credentials pending from Anumati). Nothing has been sent.",
    };
  }
  const mobile = (mobileNumber ?? "").replace(/\D/g, "").slice(-10);
  if (!/^\d{10}$/.test(mobile)) {
    return { mode: "needs_details", link: toSourceLink(record) };
  }

  // X-Idempotency-Key = link id: a retry returns the same journey.
  const result = await startConsent(mobile, record.link_id);
  if (!result.ok || !result.body?.redirectUrl) {
    log("consent_start_failed", {
      link: shortRef(record.link_id),
      status: result.status,
      provider: result.providerMessage,
    });
    const reason =
      result.status === 401 || result.status === 403
        ? "The Account Aggregator did not accept DhanYukti's credentials. Nothing has been sent."
        : result.status === 400
          ? "The Account Aggregator rejected the request. Nothing has been sent."
          : "The Account Aggregator couldn't be reached. Nothing has been sent; try again in a moment.";
    return { mode: "unavailable", reason };
  }

  const body = result.body;
  record.module_reference = body.moduleReference;
  record.consent_handle = body.consentHandle ?? null;
  record.provider_status = body.status ?? "CONSENT_REQUESTED";
  record.redirect_url = body.redirectUrl;
  setConsent(record, "awaiting_approval");
  addActivity(record, "sent_to_aa", shortRef(body.moduleReference));
  await kvSet(keys.ref(body.moduleReference), record.link_id, LINK_TTL);
  await saveLink(record);
  log("consent_started", { link: shortRef(record.link_id) });
  return {
    mode: "redirect",
    link: toSourceLink(record),
    redirect_url: body.redirectUrl,
  };
}

/**
 * Stops DhanYukti using this source: data deleted, pending retrievals
 * dropped and late results refused. The FIU module has no revoke call, so
 * the consent at the Account Aggregator is ended in the Anumati app.
 */
export async function revokeLink(
  sid: string,
  linkId: string,
): Promise<SourceLink | null> {
  const record = await loadLink(linkId);
  if (!record || record.session_id !== sid) return null;
  if (
    record.consent_status === "active" ||
    record.consent_status === "paused"
  ) {
    setConsent(record, "revoked");
    addActivity(record, "revoked");
    await purgeData(record);
    await saveLink(record);
    await ledger(sid, "aa_revoked", record);
  }
  return toSourceLink(record);
}

/* ------------------------------- webhooks -------------------------------- */

async function linkByReference(moduleReference: unknown) {
  if (typeof moduleReference !== "string" || !moduleReference) return null;
  const linkId = await kvGet<string>(keys.ref(moduleReference));
  return linkId ? loadLink(linkId) : null;
}

const LIFECYCLE: Record<string, ConsentStatus> = {
  ACTIVE: "active",
  REJECTED: "denied",
  REVOKED: "revoked",
  EXPIRED: "expired",
  PAUSED: "paused",
  FAILED: "failed",
};

const LIFECYCLE_EVENT: Record<ConsentStatus, LinkActivity["event"] | null> = {
  requested: null,
  awaiting_approval: null,
  active: "approved",
  denied: "declined",
  revoked: "revoked",
  expired: "expired",
  paused: "paused",
  failed: "consent_failed",
};

/** true when this call moved the consent to active. */
function markActive(record: LinkRecord): boolean {
  if (record.consent_status === "active") return false;
  setConsent(record, "active");
  const today = istDate();
  record.active_from ??= today;
  if (!record.expires_on) {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + LIVE_TERMS.consent_months);
    record.expires_on = istDate(expiry);
  }
  if (record.import_status === "not_started") {
    record.import_status = "processing";
  }
  addActivity(record, "approved");
  return true;
}

export async function handleConsentLifecycle(payload: unknown) {
  const body = (payload ?? {}) as Record<string, unknown>;
  const record = await linkByReference(body.moduleReference);
  if (!record) return { accepted: false };
  const providerStatus = String(body.status ?? "").toUpperCase();
  const status = LIFECYCLE[providerStatus];
  record.provider_status = providerStatus || record.provider_status;
  if (typeof body.consentId === "string") record.consent_id = body.consentId;
  if (status === "active") {
    if (markActive(record)) {
      await ledger(record.session_id, "aa_approved", record);
    }
  } else if (status && status !== record.consent_status) {
    setConsent(record, status);
    const event = LIFECYCLE_EVENT[status];
    if (event) addActivity(record, event);
    if (isEnded(status)) {
      await purgeData(record);
      await ledger(record.session_id, "aa_ended", record);
    }
  }
  await saveLink(record);
  log("lifecycle", { link: shortRef(record.link_id), status: providerStatus });
  return { accepted: true };
}

/**
 * Data-ready: remember the retrieval credentials first (so nothing is lost
 * if the collection below is interrupted), then collect.
 */
export async function handleDataReady(payload: unknown) {
  const body = (payload ?? {}) as Record<string, unknown>;
  const record = await linkByReference(body.moduleReference);
  if (!record) return { accepted: false, record: null };
  if (isEnded(record.consent_status)) {
    log("data_ready_refused", { link: shortRef(record.link_id) });
    return { accepted: true, record: null }; // late result after revoke
  }
  if (typeof body.id !== "string" || typeof body.secret !== "string") {
    return { accepted: false, record: null };
  }
  if (markActive(record)) {
    await ledger(record.session_id, "aa_approved", record);
  }
  record.pending = {
    id: body.id,
    secret: body.secret,
    expires_at: typeof body.expiresAt === "string" ? body.expiresAt : null,
    received_at: now(),
  };
  record.import_status = "processing";
  addActivity(
    record,
    "data_ready",
    typeof body.sessionCount === "number" ? String(body.sessionCount) : null,
  );
  await saveLink(record);
  return { accepted: true, record };
}

/* ---------------------------- collect + decrypt --------------------------- */

function findEscrow(
  ...sources: unknown[]
): { privateKey: string; nonce: string } | null {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const escrow =
      (source as Record<string, unknown>).uatKeyMaterial ??
      (source as Record<string, unknown>).UatKeyMaterial;
    if (!escrow || typeof escrow !== "object") continue;
    const entries = Object.entries(escrow as Record<string, unknown>);
    const privateKey = entries.find(
      ([k, v]) => /private/i.test(k) && typeof v === "string",
    )?.[1] as string | undefined;
    const nonce = entries.find(
      ([k, v]) => /nonce/i.test(k) && typeof v === "string",
    )?.[1] as string | undefined;
    if (privateKey && nonce) return { privateKey, nonce };
  }
  return null;
}

/** Whole years between an ISO date of birth and `on`; null if unknown. */
function ageOn(dob: string | null, on: Date): number | null {
  if (!dob) return null;
  const [y, m, d] = dob.split("-").map(Number);
  if (!y || !m || !d) return null;
  const [ty, tm, td] = istDate(on).split("-").map(Number);
  const age = ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
  return age >= 0 && age < 130 ? age : null;
}

function accountLabel(session: FiSession, parsed: ParsedDepositAccount | null) {
  const masked = parsed?.masked_acc_number ?? session.maskedAccNumber ?? "";
  const last4 = masked.replace(/[^0-9]/g, "").slice(-4);
  const kind =
    parsed?.account_type?.toUpperCase() === "CURRENT" ? "Current" : "Savings";
  const bank = session.fipId ?? "bank";
  const sandbox = aaConfig.isSandbox ? " (sandbox test data)" : "";
  return `${kind} account · ${bank}${last4 ? ` ··${last4}` : ""}${sandbox}`;
}

function processSessions(response: GetDataResponse, fetchedAt: string) {
  const sessions = Array.isArray(response.sessions) ? response.sessions : [];
  const accounts: ImportedAccount[] = [];
  const stored: StoredAccountData["accounts"] = [];
  let decryptFailures = 0;

  sessions.forEach((session, index) => {
    const accountId = `acct-${index + 1}`;
    const base: ImportedAccount = {
      account_id: accountId,
      account_label: accountLabel(session, null),
      status: "failed",
      data_from: null,
      data_to: null,
      fetched_at: null,
      balance: null,
      balance_as_of: null,
      error: null,
    };
    if (!session.encryptedFI || !session.fipKeyMaterial) {
      accounts.push({
        ...base,
        error: envelope(
          "account_not_delivered",
          "This account did not send data. Nothing has been assumed for it.",
        ),
      });
      return;
    }
    const escrow = findEscrow(session, response);
    if (!escrow) {
      decryptFailures++;
      accounts.push({
        ...base,
        error: envelope(
          "no_key_material",
          "The data arrived but couldn't be opened here. Nothing has been assumed for it.",
          false,
        ),
      });
      return;
    }
    try {
      const plaintext = decryptFI({
        ourPrivateKey: escrow.privateKey,
        ourNonce: escrow.nonce,
        fipPublicKey: session.fipKeyMaterial.DHPublicKey.KeyValue,
        fipNonce: session.fipKeyMaterial.Nonce,
        encryptedFI: session.encryptedFI,
      });
      const parsed = parseDepositFI(plaintext);
      const { holder_dob, ...facts } = parsed;
      stored.push({
        ...facts,
        fip_id: session.fipId ?? null,
        account_label: accountLabel(session, parsed),
        holder_age: ageOn(holder_dob, new Date()),
      });
      const balanceDate = parsed.balance_at
        ? istDate(new Date(parsed.balance_at))
        : null;
      accounts.push({
        ...base,
        account_label: accountLabel(session, parsed),
        status: "received",
        data_from: parsed.data_from,
        data_to: parsed.data_to,
        fetched_at: fetchedAt,
        balance:
          parsed.balance_paise === null
            ? null
            : { amount_paise: parsed.balance_paise, currency: "INR" },
        balance_as_of: parsed.balance_paise === null ? null : balanceDate,
      });
    } catch (error) {
      decryptFailures++;
      log("decrypt_failed", {
        account: accountId,
        reason: error instanceof Error ? error.message : "unknown",
      });
      accounts.push({
        ...base,
        error: envelope(
          "decrypt_failed",
          "The data arrived but couldn't be opened. Nothing has been assumed for it.",
          false,
        ),
      });
    }
  });

  const received = accounts.filter((a) => a.status === "received").length;
  const status: ImportStatus =
    received === 0
      ? "failed"
      : received === accounts.length
        ? "complete"
        : "partial";
  return { accounts, stored, status, decryptFailures };
}

/** Collects once (single-use), decrypts, stores; safe to call repeatedly. */
export async function collectIfPending(
  record: LinkRecord,
): Promise<LinkRecord> {
  if (!record.pending || isEnded(record.consent_status)) return record;
  if (!(await kvSetIfAbsent(keys.lock(record.link_id), 1, 60))) return record;
  try {
    const fresh = (await loadLink(record.link_id)) ?? record;
    if (!fresh.pending) return fresh;
    const { id, secret } = fresh.pending;
    const at = now();
    fresh.last_attempt_at = at;
    const result = await getData(id, secret);

    if (!result.ok || !result.body) {
      // 410: expired / already collected / wrong credentials.
      const gone = result.status === 410;
      if (gone) fresh.pending = null;
      fresh.import_status = gone ? "failed" : "processing";
      if (gone) {
        fresh.accounts = [
          {
            account_id: "acct-1",
            account_label: "Bank data",
            status: "failed",
            data_from: null,
            data_to: null,
            fetched_at: null,
            balance: null,
            balance_as_of: null,
            error: envelope(
              "data_expired",
              "The data expired before it could be collected. Nothing has been assumed in its place.",
            ),
          },
        ];
      }
      addActivity(fresh, "fetch_failed", String(result.status || "network"));
      log("getdata_failed", {
        link: shortRef(fresh.link_id),
        status: result.status,
        provider: result.providerMessage,
      });
      await saveLink(fresh);
      return fresh;
    }

    fresh.pending = null; // single-use: the module has purged it
    const processed = processSessions(result.body, at);
    fresh.accounts = processed.accounts;
    fresh.import_status = processed.status;
    if (processed.stored.length) {
      const data: StoredAccountData = {
        link_id: fresh.link_id,
        fetched_at: at,
        accounts: processed.stored,
      };
      await kvSet(keys.data(fresh.link_id), data, DATA_TTL);
    }
    if (processed.decryptFailures) {
      // Keep the still-encrypted payload briefly so it can be re-opened
      // with Anumati's jar (scripts/aa-crosscheck.mjs). It is ciphertext.
      await kvSet(keys.raw(fresh.link_id), result.body, DAY);
      addActivity(fresh, "decrypt_failed", String(processed.decryptFailures));
    }
    addActivity(
      fresh,
      "fetched",
      String(processed.accounts.filter((a) => a.status === "received").length),
    );
    await saveLink(fresh);
    log("collected", {
      link: shortRef(fresh.link_id),
      status: processed.status,
      accounts: processed.accounts.length,
    });
    return fresh;
  } finally {
    await kvDel(keys.lock(record.link_id));
  }
}

/**
 * Server-side read of fetched account data for the financial engines.
 * Only for an active consent; null otherwise (unknown is not zero).
 */
export async function readAccountData(
  sid: string,
  linkId: string,
): Promise<StoredAccountData | null> {
  const record = await loadLink(linkId);
  if (!record || record.session_id !== sid) return null;
  if (record.consent_status !== "active") return null;
  return kvGet<StoredAccountData>(keys.data(linkId));
}

/**
 * Jan Suraksha check (Job 2a) for one of this session's links. Runs only
 * when the member allowed "Alerts and suggested actions" for this source.
 */
export async function schemeCheck(
  sid: string,
  linkId: string,
): Promise<SchemeCheckResult | null> {
  const record = await loadLink(linkId);
  if (!record || record.session_id !== sid) return null;
  if (!record.grants.alerts_and_actions) return { status: "not_allowed" };
  if (record.consent_status !== "active") return { status: "no_data" };
  const data = await kvGet<StoredAccountData>(keys.data(linkId));
  if (!data || data.accounts.length === 0) return { status: "no_data" };
  const taggingAllowed = await hasConsent(sid, "insurance_tags");
  const tags = taggingAllowed ? await readTags(sid) : {};
  const policies = detectPolicies(data.accounts, tags);
  return {
    ...checkJanSuraksha(data.accounts, { isSandbox: aaConfig.isSandbox }),
    existing_cover: {
      policies,
      summary: summariseCover(policies),
      tagging_allowed: taggingAllowed,
    },
  };
}

/**
 * Saves who a detected policy covers, as the member says. Requires DPDP
 * consent "insurance_tags"; the kind must be one the insurer's IRDAI
 * licence allows (a life insurer can't sell motor cover).
 */
export async function tagPolicy(
  sid: string,
  linkId: string,
  policyKey: string,
  input: { covers?: unknown; kind?: unknown },
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_found" | "consent_required" | "invalid" }
> {
  const record = await loadLink(linkId);
  if (!record || record.session_id !== sid)
    return { ok: false, reason: "not_found" };
  if (record.consent_status !== "active")
    return { ok: false, reason: "not_found" };
  if (!(await hasConsent(sid, "insurance_tags"))) {
    return { ok: false, reason: "consent_required" };
  }
  const data = await kvGet<StoredAccountData>(keys.data(linkId));
  const policy = detectPolicies(data?.accounts ?? []).find(
    (p) => p.policy_key === policyKey,
  );
  if (!policy) return { ok: false, reason: "not_found" };
  const tags = validTags(policy.licence, input);
  if (!tags) return { ok: false, reason: "invalid" };
  await saveTags(sid, policyKey, tags);
  return { ok: true };
}

/**
 * Hints for the family cover profile from this session's own active bank
 * links: private policies detected (with the member's tags) and whether
 * PMJJBY/PMSBY premiums were seen. Insurer names are for the member to
 * recognise their policy; the engine itself never receives them.
 */
export async function coverHints(sid: string) {
  const policies: (ReturnType<typeof detectPolicies>[number] & {
    link_id: string;
  })[] = [];
  let pmjjby: "seen" | "not_seen" | "unknown" = "unknown";
  let pmsby: "seen" | "not_seen" | "unknown" = "unknown";
  const tags = (await hasConsent(sid, "insurance_tags"))
    ? await readTags(sid)
    : {};
  for (const id of await sessionLinkIds(sid)) {
    const record = await loadLink(id);
    if (
      !record ||
      record.session_id !== sid ||
      record.consent_status !== "active"
    ) {
      continue;
    }
    const data = await kvGet<StoredAccountData>(keys.data(id));
    if (!data) continue;
    for (const p of detectPolicies(data.accounts, tags)) {
      policies.push({ ...p, link_id: id });
    }
    const check = checkJanSuraksha(data.accounts);
    for (const f of check.findings) {
      const status =
        f.status === "premium_seen"
          ? "seen"
          : f.status === "not_seen"
            ? "not_seen"
            : "unknown";
      if (f.scheme === "pmjjby" && pmjjby !== "seen") pmjjby = status;
      if (f.scheme === "pmsby" && pmsby !== "seen") pmsby = status;
    }
  }
  return { policies, pmjjby, pmsby };
}
