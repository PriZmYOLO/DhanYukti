import { coverHints } from "@/lib/server/aa/links";
import { noStore, sessionId, storageGuard } from "@/lib/server/aa/http";

/** Suggestions from linked bank data for the family cover profile. */
export async function GET() {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  const hints = sid
    ? await coverHints(sid)
    : { policies: [], pmjjby: "unknown", pmsby: "unknown" };
  return Response.json({ hints }, { headers: noStore });
}
