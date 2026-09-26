import { getLink } from "@/lib/server/aa/links";
import {
  errorResponse,
  noStore,
  sessionId,
  storageGuard,
} from "@/lib/server/aa/http";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/aa/links/[linkId]">,
) {
  const guard = storageGuard();
  if (guard) return guard;
  const { linkId } = await ctx.params;
  const sid = await sessionId(false);
  const link = sid ? await getLink(sid, linkId) : null;
  if (!link) {
    return errorResponse(
      404,
      "not_found",
      "This request isn't in your session.",
    );
  }
  return Response.json({ link }, { headers: noStore });
}
