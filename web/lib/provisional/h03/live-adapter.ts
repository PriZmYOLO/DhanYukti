/**
 * LIVE ConsentPort: real Account Aggregator linking through the Anumati FIU
 * module, via DhanYukti's own server routes under /api/aa/*.
 *
 * The browser never holds provider credentials, consent handles or module
 * references; the server keeps those and returns only `SourceLink`. The
 * session is an httpOnly cookie set by the server (not authentication).
 *
 * Report intake has no backend yet, so it still goes to the labelled demo
 * adapter (receipts say "demo_not_sent"). Fact corrections are not part of
 * this port; they go through the H07 CorrectionPort (lib/provisional/h07).
 * H07's picture status has no backend either: after a revoke this adapter
 * flips the h07 demo picture to "recalculating", like the demo adapter.
 */
import { LIVE_TERMS } from "@/lib/aa/live-terms";
import type { ErrorEnvelope } from "@/lib/contracts/common";
import { demoConsentAdapter } from "@/lib/provisional/h03/demo-adapter";
import type { ConsentPort } from "@/lib/provisional/h03/port";
import { markDemoRecalculation } from "@/lib/provisional/h07/demo-adapter";
import type {
  ApprovalHandoff,
  RequestConsentResult,
  SourceLink,
} from "@/lib/provisional/h03/types";

class AaRequestError extends Error {
  constructor(
    readonly status: number,
    readonly envelope: ErrorEnvelope | null,
  ) {
    super(envelope?.safe_message ?? "Bank linking is unavailable right now.");
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    credentials: "same-origin",
  });
  const body = (await response.json().catch(() => null)) as
    (T & { error?: ErrorEnvelope }) | null;
  if (!response.ok) {
    throw new AaRequestError(response.status, body?.error ?? null);
  }
  return body as T;
}

export const liveConsentAdapter: ConsentPort = {
  implementation: "h03",

  async getRequestTerms() {
    return LIVE_TERMS;
  },

  async listLinks() {
    return (await api<{ links: SourceLink[] }>("/api/aa/links")).links;
  },

  async getLink(linkId) {
    try {
      const { link } = await api<{ link: SourceLink }>(
        `/api/aa/links/${encodeURIComponent(linkId)}`,
      );
      return link;
    } catch (error) {
      if (error instanceof AaRequestError && error.status === 404) return null;
      throw error;
    }
  },

  async requestConsent(choices) {
    return api<RequestConsentResult>("/api/aa/links", {
      method: "POST",
      body: JSON.stringify(choices),
    });
  },

  async startApproval(linkId, details) {
    try {
      return await api<ApprovalHandoff>(
        `/api/aa/links/${encodeURIComponent(linkId)}/approval`,
        {
          method: "POST",
          body: JSON.stringify({ mobile_number: details?.mobile_number }),
        },
      );
    } catch (error) {
      return {
        mode: "unavailable",
        reason:
          error instanceof Error
            ? error.message
            : "Approval can't start right now.",
      };
    }
  },

  async revoke(linkId) {
    const { link } = await api<{ link: SourceLink }>(
      `/api/aa/links/${encodeURIComponent(linkId)}/revoke`,
      { method: "POST" },
    );
    // Home/Why must not reuse figures built with revoked data. Stands in
    // for H07's recompute until it exists.
    if (link.consent.status === "revoked") {
      await markDemoRecalculation("source_revoked");
    }
    return link;
  },

  reportRecommendation: (draft) =>
    demoConsentAdapter.reportRecommendation(draft),
};
