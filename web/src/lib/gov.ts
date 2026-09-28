/**
 * Browser calls for the governance layer served by this Next app's own
 * route handlers (not FastAPI): live AA links, Jan Suraksha check, DPDP
 * consents and Value Ledger, family cover engine, onboarding answers,
 * invites, recommendation reports and Bhashini voice. The server decides
 * and records; these only fetch. Nothing secret is sent or returned.
 */
import type { ErrorEnvelope } from "@/lib/contracts/common";
import type { CoverPlan, CoverProfile, MemberConditions } from "@/lib/contracts/cover-engine";
import type { DetectedPolicy } from "@/lib/contracts/insurance-cover";
import type { SchemeCheckResult } from "@/lib/contracts/scheme-check";
import type { DpdpState, LedgerEntry, PurposeId } from "@/lib/dpdp/notice";
import type { Invite, InviteRole, OnboardingAnswers } from "@/lib/onboarding/answers";
import type { ConsentChoices, SourceLink } from "@/lib/provisional/h03/types";
import { ensureSession } from "@/lib/session";

export class GovError extends Error {
  constructor(readonly status: number, readonly envelope: ErrorEnvelope | null) {
    super(envelope?.safe_message ?? `Request failed (${status})`);
  }
  get code() { return this.envelope?.code ?? `http_${this.status}`; }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "same-origin",
  });
  const body = (await res.json().catch(() => null)) as (T & { error?: ErrorEnvelope }) | null;
  if (!res.ok || !body) throw new GovError(res.status, body?.error ?? null);
  return body;
}
/** Writes first make sure the one session cookie exists, so parallel first calls can't split it. */
const send = async <T,>(path: string, method: string, body?: unknown) => {
  await ensureSession();
  return call<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
};

export type AaStatus = {
  credentials_configured: boolean; sandbox: boolean; storage: "redis" | "memory"; storage_ready: boolean; live_ui_enabled: boolean;
};

export type ApprovalResult =
  | { mode: "redirect"; link: SourceLink; redirect_url: string }
  | { mode: "needs_details"; link: SourceLink }
  | { mode: "unavailable"; reason: string };

export type CoverHints = {
  policies: (DetectedPolicy & { link_id: string })[];
  pmjjby: "seen" | "not_seen" | "unknown";
  pmsby: "seen" | "not_seen" | "unknown";
  /** "expired": bank data was deleted 24 hours after fetching (not "nothing found"). */
  bank_data: "ready" | "expired" | "none";
  expired_message: string | null;
};

export type Report = {
  report_id: string; card_id: string; engine: string; reason: ReportReason; details: string;
  saved_at: string; status: "received"; receipt_id: string | null;
};
export type ReportReason = "wrong_fact" | "not_suitable" | "unclear" | "privacy" | "other";

export type SpeakResult = { mode: "live"; processor: string; lang: string; language: string; sent_text: string; text: string; hindi: string | null; audio: { base64: string; mime: string } };

export const gov = {
  aaStatus: () => call<AaStatus>("/api/aa/status"),
  links: async () => (await call<{ links: SourceLink[] }>("/api/aa/links")).links,
  link: async (id: string) => (await call<{ link: SourceLink }>(`/api/aa/links/${id}`)).link,
  createLink: (choices: ConsentChoices) => send<{ ok: true; link: SourceLink } | { ok: false; reason: string }>("/api/aa/links", "POST", choices),
  approve: (id: string, mobile: string) => send<ApprovalResult>(`/api/aa/links/${id}/approval`, "POST", { mobile_number: mobile }),
  revokeLink: async (id: string) => (await send<{ link: SourceLink }>(`/api/aa/links/${id}/revoke`, "POST")).link,
  schemeCheck: async (id: string) => (await call<{ check: SchemeCheckResult }>(`/api/aa/links/${id}/scheme-check`)).check,
  tagPolicy: (linkId: string, policyKey: string, covers: string[], kind: string) =>
    send<{ ok: true }>(`/api/aa/links/${linkId}/policies/${encodeURIComponent(policyKey)}`, "PUT", { covers, kind }),

  dpdp: async () => (await call<{ state: DpdpState }>("/api/dpdp/state")).state,
  setDpdp: (purpose: PurposeId, action: "grant" | "withdraw") =>
    send<{ receipt: LedgerEntry | null; changed: boolean; state: DpdpState }>(`/api/dpdp/consents/${purpose}`, "POST", { action }),

  coverProfile: () => call<{ consents: { cover_profile: boolean; health_conditions: boolean }; profile: CoverProfile | null; conditions: MemberConditions }>("/api/engine/cover/profile"),
  saveCoverProfile: (profile: CoverProfile, conditions: MemberConditions) => send<{ ok: true; profile: CoverProfile }>("/api/engine/cover/profile", "PUT", { profile, conditions }),
  coverHints: async () => (await call<{ hints: CoverHints }>("/api/engine/cover/prefill")).hints,
  runCover: async () => (await send<{ plan: CoverPlan }>("/api/engine/cover/run", "POST")).plan,

  onboarding: () => call<{ consent: boolean; answers: OnboardingAnswers | null; invites: Invite[] }>("/api/onboarding"),
  saveOnboarding: (answers: OnboardingAnswers) => send<{ ok: true; answers: OnboardingAnswers }>("/api/onboarding", "PUT", answers),
  invite: async (role: InviteRole, label: string) => (await send<{ invite: Invite }>("/api/onboarding/invites", "POST", { role, label })).invite,
  cancelInvite: (code: string) => send<{ ok: true }>(`/api/onboarding/invites/${code}`, "DELETE"),
  lookupInvite: async (code: string) => (await call<{ invite: { role: InviteRole; label: string | null; expires_at: string } }>(`/api/invite/${code}`)).invite,

  reports: async () => (await call<{ reports: Report[] }>("/api/report")).reports,
  report: async (input: { card_id: string; engine: string; reason: ReportReason; details: string }) =>
    (await send<{ report: Report }>("/api/report", "POST", input)).report,

  speak: (text: string, lang = "hi") => send<SpeakResult>("/api/voice/speak", "POST", { text, lang }),
  voiceLanguages: () => call<{ configured: boolean; languages: { code: string; name: string; en: string; hi: string }[] }>("/api/voice/languages"),
};

/** Latest link worth showing: active first, then the newest. */
export function pickLink(links: SourceLink[]): SourceLink | null {
  if (!links.length) return null;
  const active = [...links].reverse().find((l) => l.consent.status === "active");
  return active ?? links[links.length - 1];
}

export const paise = (m: { amount_paise: number } | null | undefined) => (m ? Math.round(m.amount_paise / 100) : null);
export const toPaise = (rupees: number) => ({ amount_paise: Math.round(rupees) * 100, currency: "INR" as const });
