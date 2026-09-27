import { tagPolicy } from "@/lib/server/aa/links";
import {
  errorResponse,
  noStore,
  sessionId,
  storageGuard,
} from "@/lib/server/aa/http";

/**
 * Save who a detected insurance policy covers and what kind it is, as the
 * member says. Needs DPDP consent "insurance_tags".
 */
export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/aa/links/[linkId]/policies/[policyKey]">,
) {
  const guard = storageGuard();
  if (guard) return guard;
  const { linkId, policyKey } = await ctx.params;
  const sid = await sessionId(false);
  const body = (await request.json().catch(() => ({}))) as {
    covers?: unknown;
    kind?: unknown;
  };
  const result = sid
    ? await tagPolicy(sid, linkId, policyKey, body)
    : ({ ok: false, reason: "not_found" } as const);
  if (!result.ok) {
    const [status, message] =
      result.reason === "consent_required"
        ? [403, "Allow “Who your insurance covers” first. Nothing was saved."]
        : result.reason === "invalid"
          ? [400, "Choose at least one member and a kind this insurer sells."]
          : [404, "This policy isn't in your linked data."];
    return errorResponse(status, result.reason, message);
  }
  return Response.json({ ok: true }, { headers: noStore });
}
