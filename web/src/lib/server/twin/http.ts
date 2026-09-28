import "server-only";

import { randomUUID } from "node:crypto";

import { noStore, sessionId, storageGuard } from "@/lib/server/aa/http";
import { TwinError } from "@/lib/server/twin/engine";

/**
 * Runs a "my household" handler for this browser session. Errors come back as
 * JSON with a code (not_linked, data_pending, data_expired, twin_insufficient,
 * engine_unreachable…) so the app can say what's wrong. Never a demo household.
 */
export async function withTwinSession(handler: (sid: string) => Promise<unknown>): Promise<Response> {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  try {
    if (!sid) throw new TwinError(404, "not_linked", "No bank account is linked in this browser yet.");
    return Response.json(await handler(sid), { headers: noStore });
  } catch (e) {
    const err = e instanceof TwinError ? e : new TwinError(500, "twin_failed", "Something went wrong building your picture.");
    if (!(e instanceof TwinError)) console.error("[twin]", e);
    return Response.json(
      { error: { request_id: randomUUID(), code: err.code, safe_message: err.safe, retryable: err.status >= 500 || err.status === 409, missing: err.missing } },
      { status: err.status, headers: noStore },
    );
  }
}
