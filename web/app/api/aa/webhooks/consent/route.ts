import { handleConsentLifecycle } from "@/lib/server/aa/links";
import { noStore, storageGuard } from "@/lib/server/aa/http";

/**
 * Anumati FIU module → consent status changes (Integration Guide §5b):
 * ACTIVE, REJECTED, REVOKED, EXPIRED, PAUSED, FAILED. REVOKED and EXPIRED
 * delete DhanYukti's copy of the data.
 */
export async function POST(request: Request) {
  const guard = storageGuard();
  if (guard) return guard;
  const payload = await request.json().catch(() => null);
  const { accepted } = await handleConsentLifecycle(payload);
  return Response.json({ received: true, accepted }, { headers: noStore });
}
