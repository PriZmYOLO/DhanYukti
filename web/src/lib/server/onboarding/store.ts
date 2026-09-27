import "server-only";

import { randomBytes } from "node:crypto";

import {
  EMPTY_ANSWERS,
  GOALS,
  WORK_KINDS,
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

/** Strict: unknown fields are dropped, bad values become "unanswered". */
export function sanitizeAnswers(input: unknown): OnboardingAnswers | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const dep = (raw.dependents ?? {}) as Record<string, unknown>;
  return {
    version: 1,
    members: count(raw.members, 30),
    earners: count(raw.earners, 30),
    dependents: {
      children: count(dep.children, 20),
      children_in_school: count(dep.children_in_school, 20),
      elders: count(dep.elders, 20),
      other: count(dep.other, 20),
    },
    work: pick(raw.work, WORK_KINDS),
    loans: yesNo(raw.loans),
    goal: pick(raw.goal, GOALS),
    updated_at: new Date().toISOString(),
  };
}

export async function readAnswers(sid: string): Promise<OnboardingAnswers | null> {
  const stored = await kvGet<OnboardingAnswers>(answersKey(sid));
  return stored ? { ...EMPTY_ANSWERS, ...stored } : null;
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
  return invite;
}

export async function cancelInvite(sid: string, code: string): Promise<boolean> {
  const invites = await listInvites(sid);
  const found = invites.find((i) => i.code === code);
  if (!found) return false;
  found.status = "cancelled";
  await kvSet(invitesKey(sid), invites, TTL);
  await kvDel(inviteKey(code));
  return true;
}

export async function lookupInvite(code: string): Promise<{ role: InviteRole; label: string | null; expires_at: string } | null> {
  if (!/^[A-Z2-9]{8}$/.test(code)) return null;
  return kvGet(inviteKey(code));
}

/** DPDP withdrawal of "member_profile": answers and every invite go. */
export async function deleteMemberProfile(sid: string) {
  const invites = await listInvites(sid);
  await kvDel(answersKey(sid), invitesKey(sid), ...invites.map((i) => inviteKey(i.code)));
}
