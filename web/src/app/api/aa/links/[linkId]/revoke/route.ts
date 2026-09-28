import { after } from "next/server";

import { revokeLink } from "@/lib/server/aa/links";
import { rebuildTwinQuietly } from "@/lib/server/twin/engine";
import {
  errorResponse,
  noStore,
  sessionId,
  storageGuard,
} from "@/lib/server/aa/http";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/aa/links/[linkId]/revoke">,
) {
  const guard = storageGuard();
  if (guard) return guard;
  const { linkId } = await ctx.params;
  const sid = await sessionId(false);
  const link = sid ? await revokeLink(sid, linkId) : null;
  if (!link) {
    return errorResponse(
      404,
      "not_found",
      "This request isn't in your session.",
    );
  }
  // The picture built from this link is deleted; rebuild from any other link still active.
  if (sid) after(() => rebuildTwinQuietly(sid));
  return Response.json({ link }, { headers: noStore });
}
