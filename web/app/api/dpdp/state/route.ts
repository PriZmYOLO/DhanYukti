import { dpdpState } from "@/lib/server/dpdp/ledger";
import { noStore, sessionId, storageGuard } from "@/lib/server/aa/http";

/** This person's DPDP consent states and Value Ledger (with chain check). */
export async function GET() {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  return Response.json({ state: await dpdpState(sid) }, { headers: noStore });
}
