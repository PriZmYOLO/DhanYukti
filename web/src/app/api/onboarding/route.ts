import { hasConsent } from "@/lib/server/dpdp/ledger";
import { readAnswers, sanitizeAnswers, saveAnswers, listInvites } from "@/lib/server/onboarding/store";
import { errorResponse, noStore, sessionId, storageGuard } from "@/lib/server/aa/http";

/** Saved onboarding answers (skipped questions stay "unanswered"). */
export async function GET() {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  const allowed = sid ? await hasConsent(sid, "member_profile") : false;
  return Response.json(
    {
      consent: allowed,
      answers: sid && allowed ? await readAnswers(sid) : null,
      invites: sid && allowed ? await listInvites(sid) : [],
    },
    { headers: noStore },
  );
}

/** Save the answers. Needs DPDP consent "member_profile". */
export async function PUT(request: Request) {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  if (!sid || !(await hasConsent(sid, "member_profile"))) {
    return errorResponse(403, "consent_required", "Allow “Your profile in the household” first. Nothing was saved.");
  }
  const answers = sanitizeAnswers(await request.json().catch(() => null));
  if (!answers) return errorResponse(400, "invalid_request", "The answers weren't valid. Nothing was saved.");
  await saveAnswers(sid, answers);
  return Response.json({ ok: true, answers }, { headers: noStore });
}
