import { appendLedger, hasConsent } from "@/lib/server/dpdp/ledger";
import { planCover } from "@/lib/server/engines/cover/engine";
import {
  inputHash,
  readConditions,
  readProfile,
} from "@/lib/server/engines/cover/store";
import {
  errorResponse,
  noStore,
  sessionId,
  storageGuard,
} from "@/lib/server/aa/http";

/**
 * Runs the family cover engine on the saved profile. Records a receipt in
 * the Value Ledger with the ruleset version and a hash of the exact inputs,
 * so any result can be reproduced and audited.
 */
export async function POST() {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  if (!sid || !(await hasConsent(sid, "cover_profile"))) {
    return errorResponse(
      403,
      "consent_required",
      "Give consent for “Family cover check” first.",
    );
  }
  const profile = await readProfile(sid);
  if (!profile || profile.members.length === 0) {
    return errorResponse(409, "profile_missing", "Add your family first.");
  }
  const conditions = (await hasConsent(sid, "health_conditions"))
    ? await readConditions(sid)
    : {};
  const hash = inputHash(profile, conditions);
  const plan = planCover(profile, conditions, { input_hash: hash });
  try {
    const entry = await appendLedger(
      sid,
      "engine_run",
      `engine:cover:${hash.slice(0, 12)}`,
    );
    plan.receipt_id = entry.receipt_id;
  } catch {
    plan.receipt_id = null;
  }
  return Response.json({ plan }, { headers: noStore });
}
