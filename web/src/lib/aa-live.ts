/**
 * Browser client for the LIVE Anumati Account Aggregator flow.
 *
 * These calls go to the Next.js route handlers in src/app/api/aa/* (server
 * code in src/lib/server/aa), not to FastAPI. The browser never sees a
 * consent handle, token or secret: only a link id and its public state.
 *
 * Live terms (must match src/lib/aa/live-terms.ts and ONBOARDING_CONSENT in
 * src/lib/server/aa/fiu-client.ts): savings account (DEPOSIT) transactions,
 * 12 months of history, fetched once on approval, consent valid 12 months.
 */
import type { AccountSummary } from "@/lib/contracts/aa-summary";
import type { ConsentChoices, SourceLink } from "@/lib/provisional/h03/types";
import type { L } from "@/lib/types";
import { ensureSession } from "@/lib/session";

export type { AccountSummary, SourceLink };

export type AaStatus = {
  credentials_configured: boolean;
  storage_ready: boolean;
  live_ui_enabled: boolean;
  sandbox: boolean;
};

export type Handoff =
  | { mode: "redirect"; link: SourceLink; redirect_url: string }
  | { mode: "needs_details"; link: SourceLink }
  | { mode: "unavailable"; reason: string }
  | { mode: "simulated"; link: SourceLink };

/** Same terms the live request sends. One place for every screen to read. */
export const LIVE_CONSENT = {
  history_months: 12,
  consent_months: 12,
  see: { hi: "Aapke savings khaate ka 12 mahine ka len-den", en: "12 months of your savings account transactions" } as L,
  why: { hi: "Taaki mahine ke aakhir mein paise kam na padein", en: "So you don't run short at month-end" } as L,
  until: { hi: "12 mahine. Data ek baar aata hai. Kabhi bhi band kar sakte hain", en: "12 months. Data is fetched once. Stop anytime" } as L,
};

const PENDING_KEY = "dy.aa.pendingLink";

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body as { error?: { safe_message?: string } } | null)?.error?.safe_message;
    throw new Error(msg ?? `${res.status}`);
  }
  return body as T;
}

const opts = (method: "GET" | "POST", body?: unknown): RequestInit => ({
  method,
  cache: "no-store",
  credentials: "same-origin",
  headers: body === undefined ? undefined : { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const aaLive = {
  /** True only when this deployment has Anumati credentials, storage and the live flag on. */
  async available(): Promise<boolean> {
    try {
      const s = await json<AaStatus>(await fetch("/api/aa/status", opts("GET")));
      return s.credentials_configured && s.storage_ready && s.live_ui_enabled;
    } catch {
      return false;
    }
  },

  async list(): Promise<SourceLink[]> {
    const r = await json<{ links: SourceLink[] }>(await fetch("/api/aa/links", opts("GET")));
    return r.links;
  },

  /**
   * Records the member's choices. Fetches nothing until they approve at
   * Anumati. The three grants beside source access are the member's own
   * decisions and start off (default deny); the caller passes what they chose.
   */
  async create(grants: Omit<ConsentChoices, "source_access">): Promise<SourceLink> {
    await ensureSession();
    const r = await json<{ ok: boolean; link?: SourceLink; reason?: string }>(
      await fetch("/api/aa/links", opts("POST", { source_access: true, ...grants })),
    );
    if (!r.ok || !r.link) throw new Error(r.reason ?? "could_not_create");
    return r.link;
  },

  /** Starts the consent at Anumati. Mobile goes in the body, never the URL, and isn't stored. */
  async approve(linkId: string, mobile: string): Promise<Handoff> {
    return json<Handoff>(await fetch(`/api/aa/links/${linkId}/approval`, opts("POST", { mobile_number: mobile })));
  },

  async get(linkId: string): Promise<SourceLink> {
    const r = await json<{ link: SourceLink }>(await fetch(`/api/aa/links/${linkId}`, opts("GET")));
    return r.link;
  },

  /** Facts worked out on the server from this link's data (no transactions). */
  async summary(linkId: string): Promise<AccountSummary> {
    const r = await json<{ summary: AccountSummary }>(await fetch(`/api/aa/links/${linkId}/summary`, opts("GET")));
    return r.summary;
  },

  async revoke(linkId: string): Promise<SourceLink> {
    const r = await json<{ link: SourceLink }>(await fetch(`/api/aa/links/${linkId}/revoke`, opts("POST", {})));
    return r.link;
  },

  /** Remember the link being approved, so a reload or "back" from Anumati resumes it. */
  rememberPending(linkId: string | null) {
    try {
      if (linkId) localStorage.setItem(PENDING_KEY, linkId);
      else localStorage.removeItem(PENDING_KEY);
    } catch { /* private mode */ }
  },
  pending(): string | null {
    try { return localStorage.getItem(PENDING_KEY); } catch { return null; }
  },
};

/** Where a live link is, as one of the steps shown while connecting. */
export type LiveStage = "sent" | "approved" | "received" | "done" | "ended";

export function liveStage(link: SourceLink): LiveStage {
  const c = link.consent.status;
  if (c === "denied" || c === "revoked" || c === "expired" || c === "failed") return "ended";
  if (c !== "active") return "sent";
  const i = link.import.status;
  if (i === "complete" || i === "partial") return "done";
  if (i === "processing") return "received";
  return "approved";
}

export const LIVE_STEPS: { key: LiveStage; label: L }[] = [
  { key: "sent", label: { hi: "Anumati par consent bheja", en: "Consent sent to Anumati" } },
  { key: "approved", label: { hi: "Aapne manzoor kiya", en: "You approved it" } },
  { key: "received", label: { hi: "Bank se data aaya (encrypted)", en: "Bank data received (encrypted)" } },
  { key: "done", label: { hi: "Data khola, hisaab taiyaar", en: "Decrypted, your picture is ready" } },
];

/** Plain-language status for a live link, for the Consent Passport. */
export function liveStatusLabel(link: SourceLink): L {
  switch (link.consent.status) {
    case "active": return { hi: "Chalu", en: "Active" };
    case "requested":
    case "awaiting_approval": return { hi: "Manzoori baaki", en: "Waiting for approval" };
    case "denied": return { hi: "Mana kiya", en: "Declined" };
    case "revoked": return { hi: "Band kiya", en: "Revoked" };
    case "expired": return { hi: "Samay khatam", en: "Expired" };
    default: return { hi: "Sthiti pata nahi", en: "Status not known" };
  }
}

/** A live link in the Consent Passport's card shape (ConsentArtefact). */
export function liveArtefact(link: SourceLink, member: { id: string; name: string } | undefined): import("@/lib/types").ConsentArtefact {
  const status: Record<string, string> = {
    active: "ACTIVE", revoked: "REVOKED", expired: "EXPIRED", denied: "REJECTED",
    requested: "PENDING", awaiting_approval: "PENDING", paused: "PAUSED", failed: "FAILED",
  };
  const expiry = link.consent.expires_on ?? (() => {
    const d = new Date(link.consent.requested_at); d.setMonth(d.getMonth() + LIVE_CONSENT.consent_months);
    return d.toISOString().slice(0, 10);
  })();
  return {
    handle: link.link_id,
    member_id: member?.id ?? "me",
    member_name: member?.name ?? "You",
    aa: link.is_sandbox ? "Anumati (live sandbox)" : "Anumati",
    status: status[link.consent.status] ?? "UNKNOWN",
    purpose: { hi: "Khaate ka saar (Aggregated statement)", en: "Aggregated statement" },
    fi_types: ["DEPOSIT"],
    range_months: LIVE_CONSENT.history_months,
    fetch: "ONETIME",
    expiry,
    data_life: { hi: "Bank data aane ke 24 ghante baad delete; kuch nikaale gaye tathya consent band karne tak, zyada se zyada 30 din", en: "Bank data deleted 24 hours after it arrives; a few derived facts kept until you revoke, at most 30 days" },
    created_at: link.consent.requested_at,
  };
}
