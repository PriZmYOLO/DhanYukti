import "server-only";

import { randomUUID } from "node:crypto";

import {
  DEFAULT_FI_TYPES,
  isFiType,
  normaliseFiTypes,
  type FiType,
} from "@/lib/aa/fi-types";
import { LIVE_TERMS, liveTerms } from "@/lib/aa/live-terms";
import type {
  BillDecisionInput,
  BillsView,
  DetectedBills,
} from "@/lib/contracts/aa-bills";
import type { AccountSummary } from "@/lib/contracts/aa-summary";
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
import {
  aaConfig,
  aaConfigured,
  allowedFiTypes,
} from "@/lib/server/aa/config";
import { decryptFI } from "@/lib/server/aa/crypto";
import {
  getData,
  startConsent,
  type FiSession,
  type GetDataResponse,
} from "@/lib/server/aa/fiu-client";
import {
  parseFI,
  type DepositTerms,
  type Holdings,
  type ParsedDepositAccount,
  type ParsedFI,
} from "@/lib/server/aa/rebit";
import {
  buildBillsView,
  checkDecision,
  type BillDecisions,
} from "@/lib/server/aa/bills";
import { detectBills } from "@/lib/server/aa/recurrence";
import { kvDel, kvGet, kvSet, kvSetIfAbsent } from "@/lib/server/aa/store";
import { summariseAccounts } from "@/lib/server/aa/summary";
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
/** Decrypted bank data is deleted 24 hours after it arrives. */
export const RAW_DATA_TTL = 1 * DAY;
/** The few derived facts (reveal summary): until revoke, at most 30 days. */
export const SUMMARY_TTL = 30 * DAY;

export const EXPIRED_MESSAGE =
  "Bank data is deleted 24 hours after fetching. Link again to refresh.";
const SUMMARY_EXPIRED_MESSAGE =
  "The facts saved from this bank link are deleted 30 days after fetching. Link again to refresh.";

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
  /** FI types requested; absent on older records = DEPOSIT. */
  fi_types?: FiType[];
}

const linkFiTypes = (record: Pick<LinkRecord, "fi_types">): FiType[] =>
  record.fi_types?.length ? record.fi_types : DEFAULT_FI_TYPES;

/**
 * What this link may request: the member's choice ∩ the server allow-list
 * (AA_FI_TYPES). No choice → savings only. Empty → nothing to request.
 */
export function resolveFiTypes(choice: unknown): FiType[] {
  const chosen = Array.isArray(choice)
    ? normaliseFiTypes(choice)
    : DEFAULT_FI_TYPES;
  const allowed = allowedFiTypes();
  return chosen.filter((t) => allowed.includes(t));
}

/**
 * What DhanYukti keeps per account. The holder's date of birth is reduced
 * to an age when stored; the date itself is not kept.
 */
export type StoredAccount = Omit<ParsedDepositAccount, "holder_dob"> & {
  fip_id: string | null;
  account_label: string;
  holder_age: number | null;
  /** ReBIT FI type; absent on data stored before FI types = DEPOSIT. */
  fi_type?: FiType;
  /** TERM_DEPOSIT / RECURRING_DEPOSIT only. */
  deposit_terms?: DepositTerms | null;
  /** MUTUAL_FUNDS / EQUITIES / SIP only. */
  holdings?: Holdings | null;
};

/** Savings/current accounts: the only ones the transaction rules read. */
export const isDepositAccount = (a: Pick<StoredAccount, "fi_type">) =>
  (a.fi_type ?? "DEPOSIT") === "DEPOSIT";

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
  summary: (id: string) => `aa:summary:${id}`,
  /** The member's own decisions on suggested bills (Confirm your bills). */
  bills: (id: string) => `aa:bills:${id}`,
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
  const record = await kvGet<LinkRecord>(keys.link(linkId));
  return record ? scrubOldFacts(record) : null;
}

/**
 * The link record outlives the derived facts (it holds the consent trail),
 * so the balances it carries are dropped once they are older than the
 * 30-day limit, like the saved summary.
 */
async function scrubOldFacts(record: LinkRecord): Promise<LinkRecord> {
  const cutoff = Date.now() - SUMMARY_TTL * 1000;
  let changed = false;
  record.accounts = record.accounts.map((a) => {
    if (!a.balance || !a.fetched_at || Date.parse(a.fetched_at) > cutoff) {
      return a;
    }
    changed = true;
    return { ...a, balance: null, balance_as_of: null };
  });
  if (changed) await saveLink(record);
  return record;
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
  await kvDel(
    keys.data(record.link_id),
    keys.summary(record.link_id),
    keys.bills(record.link_id),
    keys.raw(record.link_id),
  );
}

type DataRead =
  | { status: "ready"; data: StoredAccountData }
  /** Data arrived but its 24 hours are over: deleted, not "nothing found". */
  | { status: "expired" }
  | { status: "none" };

async function readData(record: LinkRecord): Promise<DataRead> {
  const data = await kvGet<StoredAccountData>(keys.data(record.link_id));
  if (data && data.accounts.length > 0) return { status: "ready", data };
  const arrived =
    record.import_status === "complete" || record.import_status === "partial";
  return arrived ? { status: "expired" } : { status: "none" };
}

/**
 * Stores decrypted data for 24 hours and, next to it, the derived summary
 * for at most 30 days. Both are deleted on revoke.
 */
export async function storeAccountData(
  record: Pick<LinkRecord, "link_id" | "grants" | "fi_types">,
  data: StoredAccountData,
) {
  await kvSet(keys.data(record.link_id), data, RAW_DATA_TTL);
  const summary: AccountSummary = {
    ...summariseAccounts(data, {
      alertsAllowed: record.grants.alerts_and_actions,
      isSandbox: aaConfig.isSandbox,
      requestedFiTypes: linkFiTypes(record),
    }),
    // E02 suggestions (payee labels and rhythms only), kept with the summary.
    bills: detectBills(data),
  };
  await kvSet(keys.summary(record.link_id), summary, SUMMARY_TTL);
}

function isEnded(status: ConsentStatus) {
  return status === "revoked" || status === "expired" || status === "denied";
}

export function toSourceLink(record: LinkRecord): SourceLink {
  return {
    link_id: record.link_id,
    source_label: `${
      linkFiTypes(record).every((t) => t === "DEPOSIT")
        ? "Savings accounts"
        : "Savings and investments"
    } via Anumati${aaConfig.isSandbox ? " (sandbox test bank)" : ""}`,
    is_demo: false,
    is_sandbox: aaConfig.isSandbox,
    fi_types: linkFiTypes(record),
    terms: liveTerms(linkFiTypes(record)),
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
  const fiTypes = resolveFiTypes(choices.fi_types);
  if (fiTypes.length === 0) throw new Error("no_fi_types");
  const at = now();
  const record: LinkRecord = {
    fi_types: fiTypes,
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

  // The allow-list may have been narrowed (rollback) since the link was made.
  const allowed = allowedFiTypes();
  const fiTypes = linkFiTypes(record).filter((t) => allowed.includes(t));
  if (fiTypes.length === 0) {
    return {
      mode: "unavailable",
      reason:
        "The accounts you chose to share can't be requested on this server right now. Nothing has been sent.",
    };
  }

  // X-Idempotency-Key = link id: a retry returns the same journey.
  const result = await startConsent(mobile, record.link_id, fiTypes);
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

const KIND_LABEL: Record<Exclude<FiType, "DEPOSIT">, string> = {
  TERM_DEPOSIT: "Fixed deposit",
  RECURRING_DEPOSIT: "Recurring deposit",
  MUTUAL_FUNDS: "Mutual funds",
  EQUITIES: "Shares (demat)",
  SIP: "SIPs",
};

function maskedOf(parsed: ParsedFI | null): string | null {
  if (!parsed) return null;
  return parsed.fi_type === "DEPOSIT"
    ? parsed.masked_acc_number
    : parsed.masked_ref;
}

function accountLabel(session: FiSession, parsed: ParsedFI | null) {
  const masked = maskedOf(parsed) ?? session.maskedAccNumber ?? "";
  const last4 = masked.replace(/[^0-9]/g, "").slice(-4);
  const kind =
    parsed && parsed.fi_type !== "DEPOSIT"
      ? KIND_LABEL[parsed.fi_type]
      : `${
          parsed?.account_type?.toUpperCase() === "CURRENT"
            ? "Current"
            : "Savings"
        } account`;
  const bank = session.fipId ?? "bank";
  const sandbox = aaConfig.isSandbox ? " (sandbox test data)" : "";
  return `${kind} · ${bank}${last4 ? ` ··${last4}` : ""}${sandbox}`;
}

/** What DhanYukti keeps from one parsed document (nothing more). */
function toStored(
  parsed: ParsedFI,
  session: FiSession,
): Omit<StoredAccount, "holder_age"> {
  const base = {
    fip_id: session.fipId ?? null,
    account_label: accountLabel(session, parsed),
    fi_type: parsed.fi_type,
  };
  if (parsed.fi_type === "DEPOSIT") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { holder_dob, fi_type, ...facts } = parsed;
    return { ...facts, ...base };
  }
  // Investment accounts: only the typed block, no transactions.
  return {
    ...base,
    masked_acc_number: parsed.masked_ref,
    account_type: null,
    balance_paise: null,
    balance_at: null,
    data_from: parsed.data_from,
    data_to: parsed.data_to,
    transactions: [],
    deposit_terms: "deposit_terms" in parsed ? parsed.deposit_terms : null,
    holdings: "holdings" in parsed ? parsed.holdings : null,
  };
}

function sessionFiType(session: FiSession): FiType | null {
  const raw = session.fiType ?? session.FIType ?? session.fitype;
  const name = typeof raw === "string" ? raw.trim().toUpperCase() : null;
  return isFiType(name) ? name : null;
}

function processSessions(
  response: GetDataResponse,
  fetchedAt: string,
  requested: FiType[] = DEFAULT_FI_TYPES,
) {
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
      const parsed = parseFI(plaintext, sessionFiType(session));
      if (!requested.includes(parsed.fi_type)) {
        // Not part of this consent: not kept (data minimisation).
        accounts.push({
          ...base,
          account_label: accountLabel(session, parsed),
          fi_type: parsed.fi_type,
          error: envelope(
            "not_requested",
            "This account type wasn't part of your consent, so it wasn't kept.",
            false,
          ),
        });
        return;
      }
      stored.push({
        ...toStored(parsed, session),
        holder_age: ageOn(parsed.holder_dob, new Date()),
      });
      const deposit = parsed.fi_type === "DEPOSIT" ? parsed : null;
      const balanceDate = deposit?.balance_at
        ? istDate(new Date(deposit.balance_at))
        : null;
      const balance = deposit?.balance_paise ?? null;
      accounts.push({
        ...base,
        account_label: accountLabel(session, parsed),
        fi_type: parsed.fi_type,
        status: "received",
        data_from: parsed.data_from,
        data_to: parsed.data_to,
        fetched_at: fetchedAt,
        balance:
          balance === null ? null : { amount_paise: balance, currency: "INR" },
        balance_as_of: balance === null ? null : balanceDate,
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
    const processed = processSessions(result.body, at, linkFiTypes(fresh));
    fresh.accounts = processed.accounts;
    fresh.import_status = processed.status;
    if (processed.stored.length) {
      const data: StoredAccountData = {
        link_id: fresh.link_id,
        fetched_at: at,
        accounts: processed.stored,
      };
      await storeAccountData(fresh, data);
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

export type AccountSummaryResult =
  | { status: "ready"; summary: AccountSummary }
  /** Active link in this session, but no fetched data (yet). */
  | { status: "no_data" }
  /** Data arrived, but the saved facts are past their 30 days. */
  | { status: "expired"; safe_message: string }
  | { status: "not_found" };

/**
 * Derived facts from this session's own fetched data for the reveal step.
 * Worked out here; the browser never receives transactions or narrations.
 * The Jan Suraksha part runs only if the member allowed "Alerts and
 * suggested actions" for this source.
 */
export async function accountSummary(
  sid: string,
  linkId: string,
): Promise<AccountSummaryResult> {
  const record = await loadLink(linkId);
  if (!record || record.session_id !== sid) return { status: "not_found" };
  if (record.consent_status !== "active") return { status: "not_found" };
  // The derived copy outlives the decrypted data (30 days vs 24 hours).
  const saved = await kvGet<AccountSummary>(keys.summary(linkId));
  if (saved) {
    // E02 suggestions have their own route (bills), with the member's say.
    const { bills: _bills, ...summary } = saved;
    void _bills;
    return { status: "ready", summary };
  }
  const data = await readAccountData(sid, linkId);
  if (data && data.accounts.length > 0) {
    return {
      status: "ready",
      summary: summariseAccounts(data, {
        alertsAllowed: record.grants.alerts_and_actions,
        isSandbox: aaConfig.isSandbox,
        requestedFiTypes: linkFiTypes(record),
      }),
    };
  }
  const read = await readData(record);
  return read.status === "expired"
    ? { status: "expired", safe_message: SUMMARY_EXPIRED_MESSAGE }
    : { status: "no_data" };
}

/* --------------------------- Confirm your bills --------------------------- */

export type BillsViewResult =
  | { status: "ready"; view: BillsView }
  /** Active link in this session, but no fetched data (yet). */
  | { status: "no_data" }
  /** The data (and the suggestions made from it) are past their time. */
  | { status: "expired"; safe_message: string }
  | { status: "not_found" };

export type BillDecisionResult =
  | { ok: true; view: BillsView }
  | {
      ok: false;
      reason: "not_found" | "no_data" | "expired" | "unknown_item" | "invalid";
    };

const BILLS_EXPIRED_MESSAGE =
  "The suggestions came from bank data that has now been deleted. Connect again to see them.";

/**
 * E02 suggestions for an active link: saved with the summary at arrival,
 * or (for data stored before E02 existed) worked out from the data while
 * its 24 hours last.
 */
async function billInputs(record: LinkRecord): Promise<
  | { status: "ready"; detected: DetectedBills; summary: AccountSummary }
  | { status: "no_data" }
  | { status: "expired" }
> {
  const saved = await kvGet<AccountSummary>(keys.summary(record.link_id));
  if (saved?.bills) {
    return { status: "ready", detected: saved.bills, summary: saved };
  }
  const read = await readData(record);
  if (read.status === "ready") {
    const summary =
      saved ??
      summariseAccounts(read.data, {
        alertsAllowed: record.grants.alerts_and_actions,
        isSandbox: aaConfig.isSandbox,
        requestedFiTypes: linkFiTypes(record),
      });
    return { status: "ready", detected: detectBills(read.data), summary };
  }
  return read.status === "expired" || saved
    ? { status: "expired" }
    : { status: "no_data" };
}

function viewFor(
  record: LinkRecord,
  detected: DetectedBills,
  summary: AccountSummary,
  decisions: BillDecisions,
): BillsView {
  const balanceTimes = summary.balance.accounts
    .map((a) => a.balance_at)
    .filter((t): t is string => t !== null)
    .sort();
  return buildBillsView({
    link_id: record.link_id,
    is_sandbox: aaConfig.isSandbox,
    today: istDate(),
    detected,
    decisions,
    opening_paise: summary.balance.total?.amount_paise ?? null,
    opening_as_of: balanceTimes.length
      ? balanceTimes[balanceTimes.length - 1]
      : null,
    household_computation_allowed: record.grants.household_computation,
  });
}

/**
 * "Confirm your bills": what E02 suggests from this link's own data, the
 * member's decisions so far, and (only from confirmed items, and only if
 * the member allowed "Use in household calculations") their 30 days.
 */
export async function billsView(
  sid: string,
  linkId: string,
): Promise<BillsViewResult> {
  const record = await loadLink(linkId);
  if (!record || record.session_id !== sid) return { status: "not_found" };
  if (record.consent_status !== "active") return { status: "not_found" };
  const inputs = await billInputs(record);
  if (inputs.status === "expired") {
    return { status: "expired", safe_message: BILLS_EXPIRED_MESSAGE };
  }
  if (inputs.status === "no_data") return { status: "no_data" };
  const decisions = (await kvGet<BillDecisions>(keys.bills(linkId))) ?? {};
  return {
    status: "ready",
    view: viewFor(record, inputs.detected, inputs.summary, decisions),
  };
}

/**
 * Saves the member's decision on one suggestion (confirm, fix, ignore or
 * undo) and writes it to the Value Ledger. The ledger subject names the
 * item only by its id: no amounts, no payee.
 */
export async function decideBill(
  sid: string,
  linkId: string,
  input: BillDecisionInput,
): Promise<BillDecisionResult> {
  const record = await loadLink(linkId);
  if (!record || record.session_id !== sid) {
    return { ok: false, reason: "not_found" };
  }
  if (record.consent_status !== "active") {
    return { ok: false, reason: "not_found" };
  }
  const inputs = await billInputs(record);
  if (inputs.status !== "ready") return { ok: false, reason: inputs.status };
  const checked = checkDecision(inputs.detected, input, now());
  if (!checked.ok) return { ok: false, reason: checked.reason };

  const decisions = (await kvGet<BillDecisions>(keys.bills(linkId))) ?? {};
  let receipt: string | null = null;
  try {
    const entry = await appendLedger(
      sid,
      `bill_${checked.kind}`,
      `bill:${record.link_id.slice(-4)}:${input.id}`,
    );
    receipt = entry.receipt_id;
  } catch (error) {
    log("ledger_failed", {
      kind: `bill_${checked.kind}`,
      reason: error instanceof Error ? error.message : "?",
    });
  }
  if (checked.decision) {
    decisions[input.id] = { ...checked.decision, receipt_id: receipt };
  } else {
    delete decisions[input.id];
  }
  // Same limit as the derived summary; deleted with it on revoke.
  await kvSet(keys.bills(linkId), decisions, SUMMARY_TTL);
  log("bill_decided", { link: shortRef(linkId), action: input.action });
  return {
    ok: true,
    view: viewFor(record, inputs.detected, inputs.summary, decisions),
  };
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
  const read = await readData(record);
  if (read.status === "expired") {
    return { status: "expired", safe_message: EXPIRED_MESSAGE };
  }
  if (read.status === "none") return { status: "no_data" };
  const accounts = read.data.accounts.filter(isDepositAccount);
  if (accounts.length === 0) return { status: "no_data" };
  const taggingAllowed = await hasConsent(sid, "insurance_tags");
  const tags = taggingAllowed ? await readTags(sid) : {};
  const policies = detectPolicies(accounts, tags);
  return {
    ...checkJanSuraksha(accounts, { isSandbox: aaConfig.isSandbox }),
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
  | {
      ok: false;
      reason: "not_found" | "consent_required" | "invalid" | "expired";
    }
> {
  const record = await loadLink(linkId);
  if (!record || record.session_id !== sid)
    return { ok: false, reason: "not_found" };
  if (record.consent_status !== "active")
    return { ok: false, reason: "not_found" };
  if (!(await hasConsent(sid, "insurance_tags"))) {
    return { ok: false, reason: "consent_required" };
  }
  const read = await readData(record);
  if (read.status === "expired") return { ok: false, reason: "expired" };
  const data = read.status === "ready" ? read.data : null;
  const policy = detectPolicies(
    (data?.accounts ?? []).filter(isDepositAccount),
  ).find(
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
  let bankData: "ready" | "expired" | "none" = "none";
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
    const read = await readData(record);
    if (read.status !== "ready") {
      if (read.status === "expired" && bankData === "none") {
        bankData = "expired";
      }
      continue;
    }
    bankData = "ready";
    const accounts = read.data.accounts.filter(isDepositAccount);
    for (const p of detectPolicies(accounts, tags)) {
      policies.push({ ...p, link_id: id });
    }
    const check = checkJanSuraksha(accounts);
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
  return {
    policies,
    pmjjby,
    pmsby,
    // Expired data is deleted data: the hints above stay "unknown".
    bank_data: bankData,
    expired_message: bankData === "expired" ? EXPIRED_MESSAGE : null,
  };
}

/**
 * "Delete everything" for this session: every link is revoked the same
 * way as the revoke route (data and derived summary deleted), then the
 * link, its module reference and the session index are removed, so late
 * webhooks find nothing and are refused. Value Ledger receipts stay.
 */
export async function deleteSessionLinks(
  sid: string,
): Promise<{ ref: string; was: ConsentStatus }[]> {
  const removed: { ref: string; was: ConsentStatus }[] = [];
  for (const id of await sessionLinkIds(sid)) {
    const record = await loadLink(id);
    if (!record || record.session_id !== sid) continue;
    const was = record.consent_status;
    if (was === "active" || was === "paused") {
      await revokeLink(sid, id);
    } else if (!isEnded(was)) {
      await ledger(sid, "aa_ended", record);
    }
    await purgeData(record);
    await kvDel(
      keys.link(id),
      keys.lock(id),
      ...(record.module_reference ? [keys.ref(record.module_reference)] : []),
    );
    removed.push({ ref: shortRef(id)!, was });
  }
  await kvDel(keys.session(sid));
  return removed;
}
