import { noStore, sessionId, storageGuard } from "@/lib/server/aa/http";
import { deleteEverything } from "@/lib/server/me/delete";

/**
 * "Delete everything" for this browser session only (same session and
 * storage guards as /api/aa). Returns what was deleted and what was kept.
 */
export async function POST() {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  const result = sid
    ? await deleteEverything(sid)
    : { deleted: [], kept: { kind: "value_ledger" as const, receipts: 0 } };
  return Response.json(result, { headers: noStore });
}
