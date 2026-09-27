import { setConsent } from "@/lib/server/dpdp/consents";
import { dpdpState } from "@/lib/server/dpdp/ledger";
import {
  errorResponse,
  noStore,
  sessionId,
  storageGuard,
} from "@/lib/server/aa/http";

/** Grant or withdraw one DPDP purpose; returns the Value Ledger receipt. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/dpdp/consents/[purpose]">,
) {
  const guard = storageGuard();
  if (guard) return guard;
  const { purpose } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as {
    action?: unknown;
  };
  if (body.action !== "grant" && body.action !== "withdraw") {
    return errorResponse(400, "invalid_request", "The request was not valid.");
  }
  const sid = await sessionId(true);
  const result = await setConsent(sid!, purpose, body.action);
  if (!result.ok) {
    return errorResponse(
      result.reason === "unknown_purpose" ? 404 : 409,
      result.reason,
      result.reason === "unknown_purpose"
        ? "That purpose isn't in DhanYukti's notice."
        : "That feature isn't in this build, so there is nothing to consent to yet.",
    );
  }
  return Response.json(
    {
      receipt: result.receipt,
      changed: result.changed,
      state: await dpdpState(sid),
    },
    { headers: noStore },
  );
}
