import { schemeCheck } from "@/lib/server/aa/links";
import {
  errorResponse,
  noStore,
  sessionId,
  storageGuard,
} from "@/lib/server/aa/http";

/**
 * Jan Suraksha check (PMJJBY + PMSBY) on this link's fetched data. Only
 * facts and a public-scheme suggestion; no private insurance, no referral.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/aa/links/[linkId]/scheme-check">,
) {
  const guard = storageGuard();
  if (guard) return guard;
  const { linkId } = await ctx.params;
  const sid = await sessionId(false);
  const result = sid ? await schemeCheck(sid, linkId) : null;
  if (!result) {
    return errorResponse(
      404,
      "not_found",
      "This request isn't in your session.",
    );
  }
  return Response.json({ check: result }, { headers: noStore });
}
