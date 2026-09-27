import "server-only";

import { createHash, randomUUID } from "node:crypto";

import {
  NOTICE_PURPOSES,
  NOTICE_VERSION,
  type DpdpState,
  type LedgerEntry,
  type PurposeId,
  type PurposeState,
} from "@/lib/dpdp/notice";
import { kvDel, kvGet, kvSet, kvSetIfAbsent } from "@/lib/server/aa/store";

/**
 * Value Ledger: an append-only, hash-chained record of every consent event
 * for one person (DPDP grants/withdrawals and AA link events). Each entry
 * carries the hash of the one before, so any edit or deletion in the middle
 * breaks the chain and shows as "not verified".
 *
 * Keyed by the same httpOnly session cookie as the AA links (not
 * authentication; H01 sign-in replaces it). Holds no financial data.
 */

const TTL = 365 * 24 * 60 * 60;
const GENESIS = "GENESIS";
const key = (sid: string) => `vl:${sid}`;
const lockKey = (sid: string) => `vl:lock:${sid}`;

/** Hash of the notice text the person was shown (all purposes, this version). */
export const NOTICE_HASH = createHash("sha256")
  .update(JSON.stringify({ v: NOTICE_VERSION, p: NOTICE_PURPOSES }))
  .digest("hex");

function entryHash(entry: Omit<LedgerEntry, "hash">): string {
  const { seq, at, kind, subject, receipt_id, notice_version, notice_hash } =
    entry;
  return createHash("sha256")
    .update(
      JSON.stringify([
        seq,
        at,
        kind,
        subject,
        receipt_id,
        notice_version,
        notice_hash,
        entry.prev_hash,
      ]),
    )
    .digest("hex");
}

export function verifyChain(entries: LedgerEntry[]): boolean {
  let prev = GENESIS;
  return entries.every((entry, index) => {
    const ok =
      entry.seq === index + 1 &&
      entry.prev_hash === prev &&
      entry.hash === entryHash(entry);
    prev = entry.hash;
    return ok;
  });
}

export async function readLedger(sid: string): Promise<LedgerEntry[]> {
  return (await kvGet<LedgerEntry[]>(key(sid))) ?? [];
}

export async function appendLedger(
  sid: string,
  kind: LedgerEntry["kind"],
  subject: string,
): Promise<LedgerEntry> {
  // Short lock so two quick taps can't fork the chain.
  for (let i = 0; i < 20; i++) {
    if (await kvSetIfAbsent(lockKey(sid), 1, 5)) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  try {
    const entries = await readLedger(sid);
    const dpdp = kind === "dpdp_granted" || kind === "dpdp_withdrawn";
    const base: Omit<LedgerEntry, "hash"> = {
      seq: entries.length + 1,
      at: new Date().toISOString(),
      kind,
      subject,
      receipt_id: `rcpt_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
      notice_version: dpdp ? NOTICE_VERSION : null,
      notice_hash: dpdp ? NOTICE_HASH : null,
      prev_hash: entries.length ? entries[entries.length - 1].hash : GENESIS,
    };
    const entry: LedgerEntry = { ...base, hash: entryHash(base) };
    await kvSet(key(sid), [...entries, entry], TTL);
    return entry;
  } finally {
    await kvDel(lockKey(sid));
  }
}

export function purposeStates(entries: LedgerEntry[]): PurposeState[] {
  return NOTICE_PURPOSES.map(({ id }) => {
    const last = [...entries]
      .reverse()
      .find(
        (e) =>
          e.subject === id &&
          (e.kind === "dpdp_granted" || e.kind === "dpdp_withdrawn"),
      );
    return {
      id,
      status: !last
        ? "never_asked"
        : last.kind === "dpdp_granted"
          ? "granted"
          : "withdrawn",
      since: last?.at ?? null,
      receipt_id: last?.receipt_id ?? null,
    };
  });
}

export async function dpdpState(sid: string | null): Promise<DpdpState> {
  const ledger = sid ? await readLedger(sid) : [];
  return {
    notice_version: NOTICE_VERSION,
    purposes: purposeStates(ledger),
    ledger,
    ledger_verified: verifyChain(ledger),
  };
}

export async function hasConsent(
  sid: string,
  purpose: PurposeId,
): Promise<boolean> {
  const state = purposeStates(await readLedger(sid)).find(
    (p) => p.id === purpose,
  );
  return state?.status === "granted";
}
