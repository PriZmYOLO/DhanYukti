import { after } from "next/server";

import { getLink, householdOfLink } from "@/lib/server/aa/links";
import { hasTwin, rebuildTwinQuietly } from "@/lib/server/twin/engine";
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
  // Data just arrived (webhook's background step may have been cut short): build their household now.
  if (sid && link.consent.status === "active" && (link.import.status === "complete" || link.import.status === "partial") && !(await hasTwin(sid))) {
    after(() => rebuildTwinQuietly(sid));
  }
  // Linked from an invite: the family's picture now has this member's account too.
  if (sid && link.household === "joined" && link.consent.status === "active" && (link.import.status === "complete" || link.import.status === "partial")) {
    after(async () => {
      const h = await householdOfLink(linkId);
      if (h && !(await hasTwin(h))) await rebuildTwinQuietly(h);
    });
  }
  return Response.json({ link }, { headers: noStore });
}
