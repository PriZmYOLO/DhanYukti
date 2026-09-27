import { hasConsent } from "@/lib/server/dpdp/ledger";
import {
  readConditions,
  readProfile,
  sanitizeConditions,
  sanitizeProfile,
  saveConditions,
  saveProfile,
} from "@/lib/server/engines/cover/store";
import {
  errorResponse,
  noStore,
  sessionId,
  storageGuard,
} from "@/lib/server/aa/http";

/** The family cover profile, plus which consents are on. */
export async function GET() {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  const profileAllowed = sid ? await hasConsent(sid, "cover_profile") : false;
  const conditionsAllowed = sid
    ? await hasConsent(sid, "health_conditions")
    : false;
  return Response.json(
    {
      consents: {
        cover_profile: profileAllowed,
        health_conditions: conditionsAllowed,
      },
      profile: sid && profileAllowed ? await readProfile(sid) : null,
      conditions:
        sid && profileAllowed && conditionsAllowed
          ? await readConditions(sid)
          : {},
    },
    { headers: noStore },
  );
}

/** Save the profile (needs "cover_profile"); conditions need "health_conditions". */
export async function PUT(request: Request) {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  if (!sid || !(await hasConsent(sid, "cover_profile"))) {
    return errorResponse(
      403,
      "consent_required",
      "Give consent for “Family cover check” first. Nothing was saved.",
    );
  }
  const body = (await request.json().catch(() => null)) as {
    profile?: unknown;
    conditions?: unknown;
  } | null;
  const profile = sanitizeProfile(body?.profile);
  if (!profile) {
    return errorResponse(
      400,
      "invalid_request",
      "The profile wasn't valid. Nothing was saved.",
    );
  }
  await saveProfile(sid, profile);
  if (await hasConsent(sid, "health_conditions")) {
    await saveConditions(sid, sanitizeConditions(body?.conditions, profile));
  }
  return Response.json({ ok: true, profile }, { headers: noStore });
}
