import "server-only";

import type {
  CoverKind,
  MemberGroup,
  PolicyTags,
} from "@/lib/contracts/insurance-cover";
import {
  KINDS_BY_LICENCE,
  MEMBER_GROUPS,
} from "@/lib/contracts/insurance-cover";
import type { InsurerLicence } from "@/lib/contracts/insurance-cover";
import { kvDel, kvGet, kvSet } from "@/lib/server/aa/store";

/**
 * The member's own statements about each policy (who it covers, what kind),
 * stored only under DPDP consent "insurance_tags". Withdrawing deletes them
 * all at once (see lib/server/dpdp/consents.ts).
 */

const TTL = 90 * 24 * 60 * 60;
const key = (sid: string) => `ins:tags:${sid}`;

export async function readTags(
  sid: string,
): Promise<Record<string, PolicyTags>> {
  return (await kvGet<Record<string, PolicyTags>>(key(sid))) ?? {};
}

export function validTags(
  licence: InsurerLicence,
  input: { covers?: unknown; kind?: unknown },
): { covers: MemberGroup[]; kind: CoverKind } | null {
  const covers = Array.isArray(input.covers)
    ? Array.from(new Set(input.covers as unknown[])).filter(
        (g): g is MemberGroup => MEMBER_GROUPS.includes(g as MemberGroup),
      )
    : [];
  const kind = input.kind as CoverKind;
  if (!covers.length || !KINDS_BY_LICENCE[licence].includes(kind)) return null;
  return { covers, kind };
}

export async function saveTags(
  sid: string,
  policyKey: string,
  tags: { covers: MemberGroup[]; kind: CoverKind },
): Promise<void> {
  const all = await readTags(sid);
  all[policyKey] = { ...tags, tagged_at: new Date().toISOString() };
  await kvSet(key(sid), all, TTL);
}

export async function deleteAllTags(sid: string): Promise<void> {
  await kvDel(key(sid));
}
