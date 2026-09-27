import { noStore, sessionId } from "@/lib/server/aa/http";

/**
 * Makes sure this browser has its session cookie before any stateful call.
 * Without it, two first calls in flight (e.g. a DPDP toggle and "connect
 * bank") could each mint a session and the later cookie would orphan the
 * other's link. Returns nothing about the session itself.
 */
export async function POST() {
  await sessionId(true);
  return Response.json({ ok: true }, { headers: noStore });
}
