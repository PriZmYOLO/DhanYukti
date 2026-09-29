import { after } from "next/server";

import { setLinkSharing } from "@/lib/server/aa/links";
import { rebuildTwinQuietly } from "@/lib/server/twin/engine";
import {
  errorResponse,
  noStore,
  sessionId,
  storageGuard,
} from "@/lib/server/aa/http";

/**
 * Make a member's account show LESS in the household picture (Poora → Sirf total → Private).
 * Showing more is refused: the account's owner links again and approves at Anumati.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/aa/links/[linkId]/sharing">,
) {
  const guard = storageGuard();
  if (guard) return guard;
  const { linkId } = await ctx.params;
  const sid = await sessionId(false);
  const body = (await request.json().catch(() => null)) as { sharing?: unknown } | null;
  if (!sid) return errorResponse(404, "not_found", "That account isn't in your household.");
  const r = await setLinkSharing(sid, linkId, body?.sharing);
  if (!r.ok) return errorResponse(r.code === "not_found" ? 404 : 409, r.code, r.safe);
  for (const h of r.households) after(() => rebuildTwinQuietly(h));
  return Response.json({ link: r.link }, { headers: noStore });
}
