import { noStore, sessionId, storageGuard } from "@/lib/server/aa/http";
import { readHubFacts } from "@/lib/server/twin/hub";

/** Records this member added through Perfios Hub (derived facts, consented kinds only). */
export async function GET() {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  return Response.json({ facts: sid ? await readHubFacts(sid) : {} }, { headers: noStore });
}
