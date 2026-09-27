import { hasConsent } from "@/lib/server/dpdp/ledger";
import { createInvite } from "@/lib/server/onboarding/store";
import { errorResponse, noStore, sessionId, storageGuard } from "@/lib/server/aa/http";

/**
 * Invite another adult to the household. The invite carries only a role and
 * an optional label; joining shares nothing until that person gives their
 * own consents (default deny).
 */
export async function POST(request: Request) {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  if (!sid || !(await hasConsent(sid, "member_profile"))) {
    return errorResponse(403, "consent_required", "Allow “Your profile in the household” first. No invite was made.");
  }
  const body = (await request.json().catch(() => ({}))) as { role?: unknown; label?: unknown };
  const invite = await createInvite(sid, body.role, body.label);
  if (!invite) return errorResponse(400, "invalid_request", "Choose who you're inviting (at most 6 open invites).");
  return Response.json({ invite }, { status: 201, headers: noStore });
}
