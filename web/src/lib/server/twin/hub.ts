import "server-only";

import type { PurposeId } from "@/lib/dpdp/notice";
import { purposeStates, readLedger } from "@/lib/server/dpdp/ledger";
import { kvDel, kvGet, kvSet } from "@/lib/server/aa/store";

/**
 * Records a member adds through Perfios Hub (bills, ration card, EPF, vehicle,
 * licence). Only the derived facts the engines return are kept (no names,
 * addresses, phone numbers or photos), per session, for 30 days, and each
 * kind only while its own DPDP purpose is granted: withdrawing deletes it.
 */
export type HubKind = "electricity" | "png" | "ration" | "epf" | "rc" | "challan" | "dl";
export type HubFacts = Partial<Record<HubKind, Record<string, unknown>>>;

/** Lookups the member can start, and the DPDP purpose each needs. `agent` stores nothing. */
export const LOOKUPS = {
  electricity: { purpose: "electricity", stores: ["electricity"] },
  png: { purpose: "gas", stores: ["png"] },
  ration: { purpose: "ration", stores: ["ration"] },
  epf_otp: { purpose: "epf", stores: [] },
  epf: { purpose: "epf", stores: ["epf"] },
  rc: { purpose: "rc", stores: ["rc", "challan"] },
  dl: { purpose: "dl", stores: ["dl"] },
  agent: { purpose: null, stores: [] },
} as const satisfies Record<string, { purpose: PurposeId | null; stores: readonly HubKind[] }>;
export type LookupKind = keyof typeof LOOKUPS;

export const PURPOSE_KINDS: Partial<Record<PurposeId, HubKind[]>> = {
  electricity: ["electricity"],
  gas: ["png"],
  ration: ["ration"],
  epf: ["epf"],
  rc: ["rc", "challan"],
  dl: ["dl"],
};

const DAY = 24 * 60 * 60;
export const HUB_TTL = 30 * DAY;
/** A member can't burn through the sandbox credits by accident (or on purpose). */
export const HUB_DAILY_LIMIT = 20;

const keys = {
  facts: (sid: string) => `hub:${sid}`,
  epfRequest: (sid: string) => `hub:epf:${sid}`,
  count: (sid: string) => `hub:count:${sid}`,
};

async function readAll(sid: string): Promise<HubFacts> {
  return (await kvGet<HubFacts>(keys.facts(sid))) ?? {};
}

/** Facts the engines may use now: only kinds whose purpose is still granted. */
export async function readHubFacts(sid: string): Promise<HubFacts> {
  const all = await readAll(sid);
  if (!Object.keys(all).length) return {};
  const granted = new Set(purposeStates(await readLedger(sid)).filter((p) => p.status === "granted").map((p) => p.id));
  const out: HubFacts = {};
  for (const [purpose, kinds] of Object.entries(PURPOSE_KINDS) as [PurposeId, HubKind[]][]) {
    if (!granted.has(purpose)) continue;
    for (const k of kinds) if (all[k]) out[k] = all[k];
  }
  return out;
}

export async function saveHubFacts(sid: string, facts: HubFacts): Promise<void> {
  const all = await readAll(sid);
  await kvSet(keys.facts(sid), { ...all, ...facts }, HUB_TTL);
}

export async function deleteHubFacts(sid: string, kinds?: HubKind[]): Promise<void> {
  if (!kinds) {
    await kvDel(keys.facts(sid), keys.epfRequest(sid));
    return;
  }
  const all = await readAll(sid);
  for (const k of kinds) delete all[k];
  if (kinds.includes("epf")) await kvDel(keys.epfRequest(sid));
  if (Object.keys(all).length) await kvSet(keys.facts(sid), all, HUB_TTL);
  else await kvDel(keys.facts(sid));
}

/** The EPFO OTP request id lives only between "send OTP" and "check OTP" (10 minutes). */
export async function saveEpfRequest(sid: string, requestId: string) {
  await kvSet(keys.epfRequest(sid), requestId, 600);
}
export async function takeEpfRequest(sid: string): Promise<string | null> {
  return kvGet<string>(keys.epfRequest(sid));
}
export async function clearEpfRequest(sid: string) {
  await kvDel(keys.epfRequest(sid));
}

/** true while this session is under its daily lookup limit (counts this lookup). */
export async function underDailyLimit(sid: string): Promise<boolean> {
  const n = ((await kvGet<number>(keys.count(sid))) ?? 0) + 1;
  if (n > HUB_DAILY_LIMIT) return false;
  await kvSet(keys.count(sid), n, DAY);
  return true;
}
