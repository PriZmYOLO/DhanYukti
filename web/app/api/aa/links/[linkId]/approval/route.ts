import { startApproval } from "@/lib/server/aa/links";
import {
  errorResponse,
  noStore,
  sessionId,
  storageGuard,
} from "@/lib/server/aa/http";

/**
 * Starts the consent at Anumati and returns its hosted approval URL. The
 * mobile number goes in the body (never the URL) and is not stored.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/aa/links/[linkId]/approval">,
) {
  const guard = storageGuard();
  if (guard) return guard;
  const { linkId } = await ctx.params;
  const sid = await sessionId(false);
  if (!sid) {
    return errorResponse(
      404,
      "not_found",
      "This request isn't in your session.",
    );
  }
  const body = (await request.json().catch(() => ({}))) as {
    mobile_number?: unknown;
  };
  const mobile =
    typeof body.mobile_number === "string" ? body.mobile_number : null;
  const result = await startApproval(sid, linkId, mobile);
  if (result.mode === "not_found") {
    return errorResponse(
      404,
      "not_found",
      "This request isn't in your session.",
    );
  }
  return Response.json(result, { headers: noStore });
}
