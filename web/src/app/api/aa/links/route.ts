import type { ConsentChoices } from "@/lib/provisional/h03/types";
import {
  createLink,
  LinkChoiceError,
  listLinks,
  resolveFiTypes,
} from "@/lib/server/aa/links";
import {
  errorResponse,
  noStore,
  sessionId,
  storageGuard,
} from "@/lib/server/aa/http";

/** This browser session's own links. Never another session's. */
export async function GET() {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  const links = sid ? await listLinks(sid) : [];
  return Response.json({ links }, { headers: noStore });
}

/** Records the four choices and creates a request. Fetches nothing. */
export async function POST(request: Request) {
  const guard = storageGuard();
  if (guard) return guard;
  const choices = (await request
    .json()
    .catch(() => null)) as ConsentChoices | null;
  if (!choices || typeof choices !== "object") {
    return errorResponse(400, "invalid_request", "The request was not valid.");
  }
  if (choices.source_access !== true) {
    return Response.json(
      { ok: false, reason: "source_access_required" },
      { headers: noStore },
    );
  }
  // Choice ∩ allow-list (AA_FI_TYPES). Nothing left → nothing to ask for.
  if (resolveFiTypes(choices.fi_types).length === 0) {
    return Response.json(
      { ok: false, reason: "no_fi_types" },
      { headers: noStore },
    );
  }
  const sid = await sessionId(true);
  try {
    const link = await createLink(sid!, choices);
    return Response.json({ ok: true, link }, { status: 201, headers: noStore });
  } catch (e) {
    if (e instanceof LinkChoiceError) return errorResponse(400, e.code, e.safe);
    throw e;
  }
}
