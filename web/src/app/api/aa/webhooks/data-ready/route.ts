import { after } from "next/server";

import { collectIfPending, handleDataReady } from "@/lib/server/aa/links";
import { noStore, storageGuard } from "@/lib/server/aa/http";

/** Gives the collection below time to finish on Vercel. */
export const maxDuration = 60;

/**
 * Anumati FIU module → "data is ready" (Integration Guide §4). Stores the
 * one-time retrieval credentials, answers 2xx at once, then collects,
 * decrypts and stores in the background. If that is interrupted, the next
 * status poll from the app collects instead (the credentials were saved).
 *
 * TODO(jws): verify `x-jws-signature` once Anumati says signing is enabled
 * for our client and shares the module's public key.
 */
export async function POST(request: Request) {
  const guard = storageGuard();
  if (guard) return guard;
  const payload = await request.json().catch(() => null);
  const { accepted, record } = await handleDataReady(payload);
  if (record) {
    after(async () => {
      await collectIfPending(record);
    });
  }
  // Unknown references are acknowledged too, so the module stops retrying.
  return Response.json({ received: true, accepted }, { headers: noStore });
}
