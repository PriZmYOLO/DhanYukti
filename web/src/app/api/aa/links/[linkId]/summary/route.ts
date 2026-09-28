import { accountSummary } from "@/lib/server/aa/links";
import {
  errorResponse,
  noStore,
  sessionId,
  storageGuard,
} from "@/lib/server/aa/http";

/**
 * A few facts from this link's fetched data, worked out on the server:
 * balance, data window, monthly inflow, recurring debits and the Jan
 * Suraksha check. No transactions or narrations beyond a payee label.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/aa/links/[linkId]/summary">,
) {
  const guard = storageGuard();
  if (guard) return guard;
  const { linkId } = await ctx.params;
  const sid = await sessionId(false);
  const result = sid
    ? await accountSummary(sid, linkId)
    : { status: "not_found" as const };
  if (result.status === "not_found") {
    return errorResponse(
      404,
      "not_found",
      "This request isn't in your session.",
    );
  }
  if (result.status === "no_data") {
    return errorResponse(
      409,
      "no_data",
      "No bank data has arrived for this link yet. Nothing has been assumed.",
      true,
    );
  }
  return Response.json({ summary: result.summary }, { headers: noStore });
}
