import "server-only";

import { purposeById, type PurposeId } from "@/lib/dpdp/notice";
import type { LedgerEntry } from "@/lib/dpdp/notice";
import {
  appendLedger,
  purposeStates,
  readLedger,
} from "@/lib/server/dpdp/ledger";
import {
  deleteConditions,
  deleteProfile,
} from "@/lib/server/engines/cover/store";
import { deleteAllTags } from "@/lib/server/insurance/tags";

/**
 * Grant or withdraw one DPDP purpose. Both are one call, same effort
 * (withdrawing is as easy as granting). Repeating the current state is a
 * no-op that returns the existing receipt. Withdrawing a purpose that is
 * enforced in this build deletes its data immediately.
 */
export async function setConsent(
  sid: string,
  purposeId: string,
  action: "grant" | "withdraw",
): Promise<
  | { ok: true; receipt: LedgerEntry | null; changed: boolean }
  | { ok: false; reason: "unknown_purpose" | "not_in_build" }
> {
  const purpose = purposeById(purposeId);
  if (!purpose) return { ok: false, reason: "unknown_purpose" };
  if (action === "grant" && !purpose.in_build) {
    return { ok: false, reason: "not_in_build" };
  }
  const ledger = await readLedger(sid);
  const current = purposeStates(ledger).find((p) => p.id === purpose.id)!;
  const wanted = action === "grant" ? "granted" : "withdrawn";
  if (
    current.status === wanted ||
    (action === "withdraw" && current.status === "never_asked")
  ) {
    const receipt =
      ledger.find((e) => e.receipt_id === current.receipt_id) ?? null;
    return { ok: true, receipt, changed: false };
  }
  if (action === "withdraw") await deleteDataFor(sid, purpose.id);
  const receipt = await appendLedger(
    sid,
    action === "grant" ? "dpdp_granted" : "dpdp_withdrawn",
    purpose.id,
  );
  // Health conditions only exist alongside the family profile: withdrawing
  // the profile withdraws them too, with their own receipt.
  if (action === "withdraw" && purpose.id === "cover_profile") {
    const conditions = purposeStates(await readLedger(sid)).find(
      (p) => p.id === "health_conditions",
    );
    if (conditions?.status === "granted") {
      await appendLedger(sid, "dpdp_withdrawn", "health_conditions");
    }
  }
  return { ok: true, receipt, changed: true };
}

async function deleteDataFor(sid: string, purpose: PurposeId) {
  if (purpose === "insurance_tags") await deleteAllTags(sid);
  if (purpose === "cover_profile") {
    await deleteProfile(sid);
    await deleteConditions(sid);
  }
  if (purpose === "health_conditions") await deleteConditions(sid);
  // manual_entries / member_profile live in the browser-only demo adapters
  // in this build (not enforced server-side yet; the notice says so).
}
