import { lookupInvite } from "@/lib/server/onboarding/store";
import { errorResponse, noStore, storageGuard } from "@/lib/server/aa/http";

/** Public lookup for the join page: role and label only, nothing else. */
export async function GET(_request: Request, ctx: RouteContext<"/api/invite/[code]">) {
  const guard = storageGuard();
  if (guard) return guard;
  const { code } = await ctx.params;
  const invite = await lookupInvite(code.toUpperCase());
  if (!invite) return errorResponse(404, "not_found", "This invite has expired, was cancelled or was already used.");
  return Response.json({ invite }, { headers: noStore });
}
