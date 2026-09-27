import { cancelInvite } from "@/lib/server/onboarding/store";
import { errorResponse, noStore, sessionId, storageGuard } from "@/lib/server/aa/http";

/** Cancel one of this session's open invites. */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/onboarding/invites/[code]">) {
  const guard = storageGuard();
  if (guard) return guard;
  const { code } = await ctx.params;
  const sid = await sessionId(false);
  if (!sid || !(await cancelInvite(sid, code))) return errorResponse(404, "not_found", "That invite isn't yours.");
  return Response.json({ ok: true }, { headers: noStore });
}
