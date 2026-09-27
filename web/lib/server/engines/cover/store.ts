import "server-only";

import { createHash } from "node:crypto";

import type { MoneyPaise } from "@/lib/contracts/common";
import {
  CONDITIONS,
  DEFAULT_FILTERS,
  RELATIONS,
  type Condition,
  type CoverFilters,
  type CoverProfile,
  type DeclaredCover,
  type MemberConditions,
  type ProfileMember,
} from "@/lib/contracts/cover-engine";
import { kvDel, kvGet, kvSet } from "@/lib/server/aa/store";
import { RULESET_VERSION } from "@/lib/server/engines/cover/engine";

/**
 * Family cover profile and declared conditions, each stored only under its
 * own DPDP consent ("cover_profile", "health_conditions"). Input is
 * validated strictly: ids must be opaque (m1, c1…), so nothing like an
 * insurer name can reach the engine even by accident (FIREWALL).
 */

const TTL = 90 * 24 * 60 * 60;
const profileKey = (sid: string) => `cover:profile:${sid}`;
const conditionsKey = (sid: string) => `cover:conditions:${sid}`;

const MEMBER_ID = /^m\d{1,3}$/;
const COVER_ID = /^c\d{1,3}$/;
const MAX_PAISE = 1_000 * 10_000_000 * 100; // ₹1,000 crore

function money(value: unknown): MoneyPaise | null {
  if (!value || typeof value !== "object") return null;
  const paise = (value as { amount_paise?: unknown }).amount_paise;
  return typeof paise === "number" &&
    Number.isSafeInteger(paise) &&
    paise >= 0 &&
    paise <= MAX_PAISE
    ? { amount_paise: paise, currency: "INR" }
    : null;
}

function age(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 120
    ? value
    : null;
}

function ids(value: unknown, pattern: RegExp, allowed?: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.filter(
        (v): v is string =>
          typeof v === "string" &&
          pattern.test(v) &&
          (!allowed || allowed.has(v)),
      ),
    ),
  );
}

export function sanitizeProfile(input: unknown): CoverProfile | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const members: ProfileMember[] = (
    Array.isArray(raw.members) ? raw.members : []
  )
    .slice(0, 12)
    .flatMap((m: Record<string, unknown>) => {
      if (!m || typeof m.id !== "string" || !MEMBER_ID.test(m.id)) return [];
      if (!RELATIONS.includes(m.relation as ProfileMember["relation"]))
        return [];
      const earns = m.earns === true;
      return [
        {
          id: m.id,
          relation: m.relation as ProfileMember["relation"],
          age: age(m.age),
          earns,
          annual_income: earns ? money(m.annual_income) : null,
        },
      ];
    });
  const memberIds = new Set(members.map((m) => m.id));
  if (members.filter((m) => m.relation === "self").length > 1) return null;

  const existing: DeclaredCover[] = (
    Array.isArray(raw.existing) ? raw.existing : []
  )
    .slice(0, 20)
    .flatMap((c: Record<string, unknown>) => {
      if (!c || typeof c.id !== "string" || !COVER_ID.test(c.id)) return [];
      if (!["health", "life", "accident"].includes(c.kind as string)) return [];
      const covers = ids(c.member_ids, MEMBER_ID, memberIds);
      if (!covers.length) return [];
      return [
        {
          id: c.id,
          kind: c.kind as DeclaredCover["kind"],
          member_ids: covers,
          sum_insured: money(c.sum_insured),
          employer: c.employer === true,
          source: c.source === "aa_detected" ? "aa_detected" : "declared",
        },
      ];
    });

  const f = (raw.filters ?? {}) as Partial<CoverFilters>;
  const filters: CoverFilters = {
    room_rent_no_cap: f.room_rent_no_cap !== false,
    copay_max_pct: [0, 10, 20].includes(f.copay_max_pct as number)
      ? (f.copay_max_pct as 0 | 10 | 20)
      : DEFAULT_FILTERS.copay_max_pct,
    ped_wait_max_months: [12, 24, 36].includes(f.ped_wait_max_months as number)
      ? (f.ped_wait_max_months as 12 | 24 | 36)
      : DEFAULT_FILTERS.ped_wait_max_months,
    restore_benefit: f.restore_benefit !== false,
    maternity: f.maternity === true,
    opd: f.opd === true,
    term_riders: (Array.isArray(f.term_riders) ? f.term_riders : []).filter(
      (r): r is CoverFilters["term_riders"][number] =>
        ["accidental_death", "critical_illness", "waiver_of_premium"].includes(
          r as string,
        ),
    ),
  };

  const tier = raw.city_tier;
  return {
    version: 1,
    city_tier:
      tier === "metro" || tier === "tier2" || tier === "tier3" ? tier : null,
    members,
    annual_expenses: money(raw.annual_expenses),
    loans_outstanding: money(raw.loans_outstanding),
    liquid_savings: money(raw.liquid_savings),
    existing,
    pmjjby_member_ids: ids(raw.pmjjby_member_ids, MEMBER_ID, memberIds),
    pmsby_member_ids: ids(raw.pmsby_member_ids, MEMBER_ID, memberIds),
    vay_vandana_member_ids: ids(
      raw.vay_vandana_member_ids,
      MEMBER_ID,
      memberIds,
    ),
    filters,
    updated_at: new Date().toISOString(),
  };
}

export function sanitizeConditions(
  input: unknown,
  profile: CoverProfile,
): MemberConditions {
  const out: MemberConditions = {};
  if (!input || typeof input !== "object") return out;
  for (const m of profile.members) {
    const list = (input as Record<string, unknown>)[m.id];
    if (!Array.isArray(list)) continue;
    const clean = Array.from(
      new Set(
        list.filter((c): c is Condition => CONDITIONS.includes(c as Condition)),
      ),
    );
    if (clean.length) out[m.id] = clean;
  }
  return out;
}

export async function readProfile(sid: string) {
  return kvGet<CoverProfile>(profileKey(sid));
}
export async function saveProfile(sid: string, profile: CoverProfile) {
  await kvSet(profileKey(sid), profile, TTL);
}
export async function deleteProfile(sid: string) {
  await kvDel(profileKey(sid));
}
export async function readConditions(sid: string) {
  return (await kvGet<MemberConditions>(conditionsKey(sid))) ?? {};
}
export async function saveConditions(sid: string, c: MemberConditions) {
  await kvSet(conditionsKey(sid), c, TTL);
}
export async function deleteConditions(sid: string) {
  await kvDel(conditionsKey(sid));
}

/** Stable hash of exactly what the engine sees, for audit and replay. */
export function inputHash(profile: CoverProfile, conditions: MemberConditions) {
  const { updated_at: _ignored, ...rest } = profile;
  void _ignored;
  return createHash("sha256")
    .update(JSON.stringify({ r: RULESET_VERSION, p: rest, c: conditions }))
    .digest("hex");
}
