/**
 * ============================================================
 *  DEMO — NO BANK, NO ACCOUNT AGGREGATOR, NO BACKEND
 * ============================================================
 *
 * Development stand-in for H03/N04/H07 so the L04 screens can be used before
 * the backend exists. Replace it; do not extend it into a real system.
 *
 * - State lives in this browser tab's sessionStorage, keyed to the current
 *   demo member (from the h01 demo session). A new session sees nothing
 *   from the previous one.
 * - No network calls, no invented API routes, no consent handles, tokens or
 *   provider secrets are created or stored.
 * - Approval is simulated (see `demoConsentControls`). Nothing is fetched:
 *   an approved link stays "processing" with no balance.
 * - Revoke only flips the status, and marks the h07 demo picture as
 *   "recalculating". There is no plan data to remove or recompute here.
 * - Balances appear only in the labelled "every state" examples.
 */
import type { IsoDate, IsoTimestamp } from "@/lib/contracts/common";
import { onboardingPort } from "@/lib/provisional/h01";
import type { ConsentPort } from "@/lib/provisional/h03/port";
import { markDemoRecalculation } from "@/lib/provisional/h07/demo-adapter";
import type {
  ConsentRequestTerms,
  FeedbackReceipt,
  SourceLink,
} from "@/lib/provisional/h03/types";

const STORAGE_KEY = "dhanyukti.l04-demo-consent.v1";

interface StoredState {
  version: 1;
  member_id: string;
  links: SourceLink[];
  receipts: FeedbackReceipt[];
}

/** Provisional request terms; the real ones come from the backend. */
const DEMO_TERMS: ConsentRequestTerms = {
  partner_name: null,
  data_kind: "savings_account_transactions",
  history_months: 12,
  purposes: ["budgeting", "bill_protection"],
  fetch_frequency: "on_approval_then_daily",
  consent_months: 12,
  retention: "while_consent_active",
  is_provisional: true,
};

// Fallback when sessionStorage is unavailable (private mode, blocked storage).
let memoryState: StoredState | null = null;

async function currentMemberId(): Promise<string | null> {
  const snapshot = await onboardingPort.loadSnapshot();
  return snapshot.session?.member_id ?? null;
}

function readStored(): StoredState | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryState;
    const stored = JSON.parse(raw) as Partial<StoredState>;
    return stored.version === 1 && stored.member_id && stored.links
      ? (stored as StoredState)
      : null;
  } catch {
    return memoryState;
  }
}

/** This member's state; another member's stored links are never returned. */
async function read(): Promise<StoredState> {
  const memberId = await currentMemberId();
  if (!memberId) throw new Error("No demo session in this tab.");
  const stored = readStored();
  return stored?.member_id === memberId
    ? { ...stored, receipts: stored.receipts ?? [] }
    : { version: 1, member_id: memberId, links: [], receipts: [] };
}

function write(state: StoredState): StoredState {
  memoryState = state;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: keep the in-memory copy for this page only.
  }
  return state;
}

function demoId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

const now = (): IsoTimestamp => new Date().toISOString();

/** Today's calendar date in Asia/Kolkata (Guide §2). */
function todayIst(): IsoDate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

function addMonths(date: IsoDate, months: number): IsoDate {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + months, d)).toISOString().slice(0, 10);
}

async function updateLink(
  linkId: string,
  change: (link: SourceLink) => SourceLink,
): Promise<SourceLink> {
  const state = await read();
  const link = state.links.find((candidate) => candidate.link_id === linkId);
  if (!link) throw new Error("No such demo link in this session.");
  const next = change(link);
  write({
    ...state,
    links: state.links.map((candidate) =>
      candidate.link_id === linkId ? next : candidate,
    ),
  });
  return next;
}

async function saveReceipt(): Promise<FeedbackReceipt> {
  const state = await read();
  const receipt: FeedbackReceipt = {
    receipt_id: demoId("demo-receipt"),
    kind: "recommendation_report",
    status: "demo_not_sent",
    saved_at: now(),
  };
  // Only the receipt is kept; the typed text never leaves the form.
  write({ ...state, receipts: [...state.receipts, receipt] });
  return receipt;
}

export const demoConsentAdapter: ConsentPort = {
  implementation: "demo",

  async getRequestTerms() {
    return DEMO_TERMS;
  },

  async listLinks() {
    if (!(await currentMemberId())) return [];
    return (await read()).links;
  },

  async getLink(linkId) {
    if (!(await currentMemberId())) return null;
    return (await read()).links.find((link) => link.link_id === linkId) ?? null;
  },

  async requestConsent(choices) {
    if (!choices.source_access) {
      return { ok: false, reason: "source_access_required" };
    }
    const state = await read();
    const at = now();
    const link: SourceLink = {
      link_id: demoId("demo-link"),
      source_label: "Savings accounts via Account Aggregator (demo)",
      is_demo: true,
      terms: DEMO_TERMS,
      grants: {
        household_computation: choices.household_computation,
        viewer_scope: choices.viewer_scope,
        alerts_and_actions: choices.alerts_and_actions,
      },
      consent: {
        status: "requested",
        requested_at: at,
        status_changed_at: at,
        active_from: null,
        expires_on: null,
      },
      import: { status: "not_started", last_attempt_at: null, accounts: [] },
    };
    write({ ...state, links: [...state.links, link] });
    return { ok: true, link };
  },

  async startApproval(linkId) {
    const link = await updateLink(linkId, (current) =>
      current.consent.status === "requested"
        ? {
            ...current,
            consent: {
              ...current.consent,
              status: "awaiting_approval",
              status_changed_at: now(),
            },
          }
        : current,
    );
    return { mode: "simulated", link };
  },

  async revoke(linkId) {
    let revoked = false;
    const link = await updateLink(linkId, (current) => {
      if (current.consent.status !== "active") return current;
      revoked = true;
      return {
        ...current,
        consent: {
          ...current.consent,
          status: "revoked",
          status_changed_at: now(),
        },
      };
    });
    // Stands in for the backend's recompute after a revoke.
    if (revoked) await markDemoRecalculation("source_revoked");
    return link;
  },

  async reportRecommendation() {
    return saveReceipt();
  },
};

/* ----------------------------------------------------------------------- */
/* Demo-only controls. Not part of ConsentPort; a real adapter has none.    */
/* ----------------------------------------------------------------------- */

const t = (value: string): IsoTimestamp => value;

function exampleLink(
  id: string,
  source_label: string,
  consent: SourceLink["consent"],
  importState: SourceLink["import"],
  grants: SourceLink["grants"] = {
    household_computation: true,
    viewer_scope: "only_me",
    alerts_and_actions: false,
  },
): SourceLink {
  return {
    link_id: `demo-example-${id}`,
    source_label,
    is_demo: true,
    terms: DEMO_TERMS,
    grants,
    consent,
    import: importState,
  };
}

const NOT_STARTED: SourceLink["import"] = {
  status: "not_started",
  last_attempt_at: null,
  accounts: [],
};

/** One labelled example link per state, with fixed fixture dates. */
function everyStateExamples(): SourceLink[] {
  return [
    exampleLink(
      "requested",
      "Demo Bank D · savings (fixture)",
      {
        status: "requested",
        requested_at: t("2026-09-25T10:05:00+05:30"),
        status_changed_at: t("2026-09-25T10:05:00+05:30"),
        active_from: null,
        expires_on: null,
      },
      NOT_STARTED,
    ),
    exampleLink(
      "awaiting",
      "Demo Bank E · savings (fixture)",
      {
        status: "awaiting_approval",
        requested_at: t("2026-09-25T09:40:00+05:30"),
        status_changed_at: t("2026-09-25T09:41:00+05:30"),
        active_from: null,
        expires_on: null,
      },
      NOT_STARTED,
    ),
    exampleLink(
      "processing",
      "Demo Bank F · savings (fixture)",
      {
        status: "active",
        requested_at: t("2026-09-25T08:10:00+05:30"),
        status_changed_at: t("2026-09-25T08:12:00+05:30"),
        active_from: "2026-09-25",
        expires_on: "2027-09-25",
      },
      {
        status: "processing",
        last_attempt_at: t("2026-09-25T08:13:00+05:30"),
        accounts: [
          {
            account_id: "demo-acct-f",
            account_label: "Savings account · Demo Bank F (fixture)",
            status: "processing",
            data_from: null,
            data_to: null,
            fetched_at: null,
            balance: null,
            balance_as_of: null,
            error: null,
          },
        ],
      },
    ),
    exampleLink(
      "active",
      "Demo Bank A · savings (fixture)",
      {
        status: "active",
        requested_at: t("2026-09-10T19:02:00+05:30"),
        status_changed_at: t("2026-09-10T19:04:00+05:30"),
        active_from: "2026-09-10",
        expires_on: "2027-09-10",
      },
      {
        status: "complete",
        last_attempt_at: t("2026-09-24T06:30:00+05:30"),
        accounts: [
          {
            account_id: "demo-acct-a",
            account_label: "Savings account · Demo Bank A (fixture)",
            status: "received",
            data_from: "2025-09-10",
            data_to: "2026-09-24",
            fetched_at: t("2026-09-24T06:30:00+05:30"),
            balance: { amount_paise: 1_845_000, currency: "INR" },
            balance_as_of: "2026-09-24",
            error: null,
          },
        ],
      },
      {
        household_computation: true,
        viewer_scope: "household_adults",
        alerts_and_actions: true,
      },
    ),
    exampleLink(
      "partial",
      "Demo Banks B and C · savings (fixture)",
      {
        status: "active",
        requested_at: t("2026-09-20T12:00:00+05:30"),
        status_changed_at: t("2026-09-20T12:03:00+05:30"),
        active_from: "2026-09-20",
        expires_on: "2027-09-20",
      },
      {
        status: "partial",
        last_attempt_at: t("2026-09-23T07:15:00+05:30"),
        accounts: [
          {
            account_id: "demo-acct-b",
            account_label: "Savings account · Demo Bank B (fixture)",
            status: "received",
            data_from: "2025-09-20",
            data_to: "2026-09-23",
            fetched_at: t("2026-09-23T07:15:00+05:30"),
            balance: { amount_paise: 920_000, currency: "INR" },
            balance_as_of: "2026-09-23",
            error: null,
          },
          {
            account_id: "demo-acct-c",
            account_label: "Savings account · Demo Bank C (fixture)",
            status: "failed",
            data_from: null,
            data_to: null,
            fetched_at: null,
            balance: null,
            balance_as_of: null,
            error: {
              request_id: "demo-req-partial-c",
              code: "provider_unavailable",
              safe_message:
                "Demo Bank C did not respond. Nothing has been assumed for this account.",
              retryable: true,
            },
          },
        ],
      },
    ),
    exampleLink(
      "failed",
      "Demo Bank G · savings (fixture)",
      {
        status: "active",
        requested_at: t("2026-09-22T16:20:00+05:30"),
        status_changed_at: t("2026-09-22T16:22:00+05:30"),
        active_from: "2026-09-22",
        expires_on: "2027-09-22",
      },
      {
        status: "failed",
        last_attempt_at: t("2026-09-22T16:40:00+05:30"),
        accounts: [
          {
            account_id: "demo-acct-g",
            account_label: "Savings account · Demo Bank G (fixture)",
            status: "failed",
            data_from: null,
            data_to: null,
            fetched_at: null,
            balance: null,
            balance_as_of: null,
            error: {
              request_id: "demo-req-failed-g",
              code: "provider_unavailable",
              safe_message:
                "The data could not be fetched. Nothing has been assumed in its place.",
              retryable: true,
            },
          },
        ],
      },
    ),
    exampleLink(
      "denied",
      "Demo Bank H · savings (fixture)",
      {
        status: "denied",
        requested_at: t("2026-09-21T18:15:00+05:30"),
        status_changed_at: t("2026-09-21T18:20:00+05:30"),
        active_from: null,
        expires_on: null,
      },
      NOT_STARTED,
    ),
    exampleLink(
      "expired",
      "Demo Bank J · savings (fixture)",
      {
        status: "expired",
        requested_at: t("2025-09-01T11:00:00+05:30"),
        status_changed_at: t("2026-09-01T00:00:00+05:30"),
        active_from: "2025-09-01",
        expires_on: "2026-09-01",
      },
      NOT_STARTED,
    ),
    exampleLink(
      "revoked",
      "Demo Bank K · savings (fixture)",
      {
        status: "revoked",
        requested_at: t("2026-08-02T09:00:00+05:30"),
        status_changed_at: t("2026-09-18T20:45:00+05:30"),
        active_from: "2026-08-02",
        expires_on: "2027-08-02",
      },
      NOT_STARTED,
    ),
  ];
}

export const demoConsentControls = {
  /** Stands in for the member's decision inside the Account Aggregator app. */
  async simulateDecision(
    linkId: string,
    decision: "approve" | "decline",
  ): Promise<SourceLink> {
    return updateLink(linkId, (link) => {
      if (link.consent.status !== "awaiting_approval") return link;
      const at = now();
      if (decision === "decline") {
        return {
          ...link,
          consent: { ...link.consent, status: "denied", status_changed_at: at },
        };
      }
      const today = todayIst();
      return {
        ...link,
        consent: {
          ...link.consent,
          status: "active",
          status_changed_at: at,
          active_from: today,
          expires_on: addMonths(today, link.terms.consent_months),
        },
        // Nothing is fetched in the demo, so the import never completes.
        import: {
          status: "processing",
          last_attempt_at: at,
          accounts: [
            {
              account_id: demoId("demo-acct"),
              account_label: "Savings account (demo, nothing fetched)",
              status: "processing",
              data_from: null,
              data_to: null,
              fetched_at: null,
              balance: null,
              balance_as_of: null,
              error: null,
            },
          ],
        },
      };
    });
  },

  /** Replaces this member's links with one labelled example per state. */
  async loadEveryState(): Promise<SourceLink[]> {
    const state = await read();
    return write({ ...state, links: everyStateExamples() }).links;
  },

  async clear(): Promise<SourceLink[]> {
    const state = await read();
    return write({ ...state, links: [] }).links;
  },
};
