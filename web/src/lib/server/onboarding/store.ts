import "server-only";

import { randomBytes } from "node:crypto";

import {
  FREQUENCIES,
  GOALS,
  OWN_INCOME,
  WORK_KINDS,
  withDefaults,
  type Answer,
  type Invite,
  type InviteRole,
  type OnboardingAnswers,
} from "@/lib/onboarding/answers";
import { kvDel, kvGet, kvSet } from "@/lib/server/aa/store";

/**
 * Onboarding answers and household invites, stored only under DPDP consent
 * "member_profile" (checked by the routes). Keyed by the same httpOnly
 * session cookie as the AA links. Withdrawing the consent deletes both.
 */

const TTL = 90 * 24 * 60 * 60;
const INVITE_TTL = 7 * 24 * 60 * 60;
const answersKey = (sid: string) => `onb:answers:${sid}`;
const invitesKey = (sid: string) => `onb:invites:${sid}`;
const inviteKey = (code: string) => `onb:invite:${code}`;
/** Server-only: which session (household) an invite joins. Never returned by any route. */
const inviteOwnerKey = (code: string) => `onb:invite:owner:${code}`;

function count(input: unknown, max: number): Answer<number> {
  const a = input as { state?: unknown; value?: unknown } | null;
  if (!a || typeof a !== "object") return { state: "unanswered" };
  if (a.state === "dont_know") return { state: "dont_know" };
  if (a.state === "none") return { state: "none" };
  if (a.state === "answered" && typeof a.value === "number" && Number.isInteger(a.value) && a.value >= 0 && a.value <= max) {
    return { state: "answered", value: a.value };
  }
  return { state: "unanswered" };
}

function pick<T extends string>(input: unknown, allowed: readonly T[]): Answer<T> {
  const a = input as { state?: unknown; value?: unknown } | null;
  if (!a || typeof a !== "object") return { state: "unanswered" };
  if (a.state === "dont_know") return { state: "dont_know" };
  if (a.state === "none") return { state: "none" };
  if (a.state === "answered" && allowed.includes(a.value as T)) return { state: "answered", value: a.value as T };
  return { state: "unanswered" };
}

function yesNo(input: unknown): Answer<boolean> {
  const a = input as { state?: unknown; value?: unknown } | null;
  if (!a || typeof a !== "object") return { state: "unanswered" };
  if (a.state === "dont_know") return { state: "dont_know" };
  if (a.state === "answered" && typeof a.value === "boolean") return { state: "answered", value: a.value };
  return { state: "unanswered" };
}

function rupees(input: unknown, max = 10_00_00_000): Answer<number> {
  const a = input as { state?: unknown; value?: unknown } | null;
  if (!a || typeof a !== "object") return { state: "unanswered" };
  if (a.state === "dont_know") return { state: "dont_know" };
  if (a.state === "none") return { state: "none" };
  if (a.state === "answered" && typeof a.value === "number" && Number.isInteger(a.value) && a.value >= 0 && a.value <= max) {
    return { state: "answered", value: a.value };
  }
  return { state: "unanswered" };
}

function isoDay(input: unknown): Answer<string> {
  const a = input as { state?: unknown; value?: unknown } | null;
  if (!a || typeof a !== "object") return { state: "unanswered" };
  if (a.state === "dont_know") return { state: "dont_know" };
  if (a.state === "none") return { state: "none" };
  if (a.state === "answered" && typeof a.value === "string" && /^20\d\d-[01]\d-[0-3]\d$/.test(a.value) && !Number.isNaN(Date.parse(a.value))) {
    return { state: "answered", value: a.value };
  }
  return { state: "unanswered" };
}

function shortText(input: unknown): Answer<string> {
  const a = input as { state?: unknown; value?: unknown } | null;
  if (!a || typeof a !== "object") return { state: "unanswered" };
  if (a.state === "none") return { state: "none" };
  if (a.state === "answered" && typeof a.value === "string") {
    const v = a.value.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 40);
    return v ? { state: "answered", value: v } : { state: "unanswered" };
  }
  return { state: "unanswered" };
}

/** Strict: unknown fields are dropped, bad values become "unanswered". */
export function sanitizeAnswers(input: unknown): OnboardingAnswers | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const dep = (raw.dependents ?? {}) as Record<string, unknown>;
  const m = (raw.money ?? {}) as Record<string, unknown>;
  return {
    version: 2,
    members: count(raw.members, 30),
    earners: count(raw.earners, 30),
    dependents: {
      children: count(dep.children, 20),
      children_in_school: count(dep.children_in_school, 20),
      elders: count(dep.elders, 20),
      other: count(dep.other, 20),
    },
    work: pick(raw.work, WORK_KINDS),
    own_income: pick(raw.own_income, OWN_INCOME),
    loans: yesNo(raw.loans),
    goal: pick(raw.goal, GOALS),
    money: {
      cash: rupees(m.cash),
      income_amount: rupees(m.income_amount),
      income_frequency: pick(m.income_frequency, FREQUENCIES),
      next_pay: isoDay(m.next_pay),
      bill_name: shortText(m.bill_name),
      bill_amount: rupees(m.bill_amount),
      bill_due: isoDay(m.bill_due),
    },
    updated_at: new Date().toISOString(),
  };
}

export async function readAnswers(sid: string): Promise<OnboardingAnswers | null> {
  const stored = await kvGet<OnboardingAnswers>(answersKey(sid));
  return stored ? withDefaults(stored) : null;
}

export async function saveAnswers(sid: string, answers: OnboardingAnswers) {
  await kvSet(answersKey(sid), answers, TTL);
}

/* -------------------------------- invites -------------------------------- */

export async function listInvites(sid: string): Promise<Invite[]> {
  return (await kvGet<Invite[]>(invitesKey(sid))) ?? [];
}

export async function createInvite(sid: string, role: unknown, label: unknown): Promise<Invite | null> {
  if (role !== "earning_adult" && role !== "non_earning_adult") return null;
  const cleanLabel = typeof label === "string" ? label.replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 24) || null : null;
  const invites = await listInvites(sid);
  if (invites.filter((i) => i.status === "open").length >= 6) return null;
  // Unambiguous alphabet: no 0/O, 1/I/L.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  const at = new Date();
  const invite: Invite = {
    code,
    role: role as InviteRole,
    label: cleanLabel,
    created_at: at.toISOString(),
    expires_at: new Date(at.getTime() + INVITE_TTL * 1000).toISOString(),
    status: "open",
  };
  await kvSet(invitesKey(sid), [...invites, invite].slice(-20), TTL);
  // The public lookup holds only the role and label: never the inviter's
  // answers, bank data or session.
  await kvSet(inviteKey(code), { role: invite.role, label: invite.label, expires_at: invite.expires_at }, INVITE_TTL);
  await kvSet(inviteOwnerKey(code), sid, INVITE_TTL);
  return invite;
}

export async function cancelInvite(sid: string, code: string): Promise<boolean> {
  const invites = await listInvites(sid);
  const found = invites.find((i) => i.code === code);
  if (!found) return false;
  found.status = "cancelled";
  await kvSet(invitesKey(sid), invites, TTL);
  await kvDel(inviteKey(code), inviteOwnerKey(code));
  return true;
}

export async function lookupInvite(code: string): Promise<{ role: InviteRole; label: string | null; expires_at: string } | null> {
  if (!/^[A-Z2-9]{8}$/.test(code)) return null;
  return kvGet(inviteKey(code));
}

/** DPDP withdrawal of "member_profile": answers and every invite go. */
export async function deleteMemberProfile(sid: string) {
  const invites = await listInvites(sid);
  await kvDel(answersKey(sid), invitesKey(sid), ...invites.flatMap((i) => [inviteKey(i.code), inviteOwnerKey(i.code)]));
}

/** Server-only: the household an open invite joins, with what the inviter chose. */
export async function resolveInvite(code: string): Promise<{ owner: string; role: InviteRole; label: string | null } | null> {
  const c = code.toUpperCase();
  if (!/^[A-Z2-9]{8}$/.test(c)) return null;
  const [pub, owner] = await Promise.all([lookupInvite(c), kvGet<string>(inviteOwnerKey(c))]);
  if (!pub || !owner) return null;
  const inv = (await listInvites(owner)).find((i) => i.code === c);
  if (!inv || inv.status !== "open") return null;
  return { owner, role: pub.role, label: pub.label };
}

/** An invite is single-use: once someone links from it, the code stops working. */
export async function markInviteJoined(owner: string, code: string, sharing: NonNullable<Invite["joined_sharing"]>) {
  const invites = await listInvites(owner);
  const inv = invites.find((i) => i.code === code);
  if (inv) {
    inv.status = "joined";
    inv.joined_sharing = sharing;
    inv.joined_at = new Date().toISOString();
    await kvSet(invitesKey(owner), invites, TTL);
  }
  await kvDel(inviteKey(code), inviteOwnerKey(code));
}

/** The joined member tightened their level: the inviter's list shows the current one. */
export async function updateJoinedSharing(owner: string, code: string, sharing: NonNullable<Invite["joined_sharing"]>) {
  const invites = await listInvites(owner);
  const inv = invites.find((i) => i.code === code);
  if (!inv) return;
  inv.joined_sharing = sharing;
  await kvSet(invitesKey(owner), invites, TTL);
}
