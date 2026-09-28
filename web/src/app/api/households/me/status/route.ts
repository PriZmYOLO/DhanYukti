import { listLinks } from "@/lib/server/aa/links";
import { noStore, sessionId, storageGuard } from "@/lib/server/aa/http";
import { hasTwin } from "@/lib/server/twin/engine";

/** Is there a linked bank account (and a built picture) in this browser session? Cheap: no engine call. */
export async function GET() {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  if (!sid) return Response.json({ linked: false, ready: false }, { headers: noStore });
  const links = (await listLinks(sid)).filter((l) => l.consent.status === "active" && !l.is_demo);
  return Response.json({ linked: links.length > 0, ready: await hasTwin(sid) }, { headers: noStore });
}
