import "server-only";

import type {
  DeleteEverythingResult,
  DeletedItem,
} from "@/lib/contracts/delete-everything";
import { deleteSessionLinks } from "@/lib/server/aa/links";
import { setConsent } from "@/lib/server/dpdp/consents";
import { purposeStates, readLedger } from "@/lib/server/dpdp/ledger";
import { deleteReports } from "@/lib/server/reports/store";

/**
 * "Delete everything" for ONE browser session, never anyone else's:
 *   1. every bank link revoked (data, derived facts, link and reference
 *      deleted; late results refused);
 *   2. every granted DPDP purpose withdrawn through setConsent, so each
 *      purpose's own deletion runs (answers, invites, cover profile,
 *      conditions, insurance tags);
 *   3. this session's reports deleted.
 * The Value Ledger stays: it holds no financial data and proves the
 * withdrawals above.
 */
export async function deleteEverything(
  sid: string,
): Promise<DeleteEverythingResult> {
  const deleted: DeletedItem[] = [];

  for (const link of await deleteSessionLinks(sid)) {
    deleted.push({ kind: "aa_link", ref: link.ref, was: link.was });
  }

  const granted = purposeStates(await readLedger(sid)).filter(
    (p) => p.status === "granted",
  );
  for (const { id } of granted) {
    // Withdrawing one purpose can withdraw another (cover_profile takes
    // health_conditions with it); setConsent reports that as unchanged.
    const result = await setConsent(sid, id, "withdraw");
    if (result.ok) deleted.push({ kind: "dpdp_purpose", purpose: id });
  }

  const reports = await deleteReports(sid);
  if (reports > 0) deleted.push({ kind: "reports", count: reports });

  return {
    deleted,
    kept: { kind: "value_ledger", receipts: (await readLedger(sid)).length },
  };
}
