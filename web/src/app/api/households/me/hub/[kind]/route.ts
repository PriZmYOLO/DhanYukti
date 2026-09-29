import { errorResponse, noStore, sessionId, storageGuard } from "@/lib/server/aa/http";
import { setConsent } from "@/lib/server/dpdp/consents";
import { callEngine, TwinError } from "@/lib/server/twin/engine";
import {
  clearEpfRequest,
  LOOKUPS,
  saveEpfRequest,
  saveHubFacts,
  takeEpfRequest,
  underDailyLimit,
  type HubFacts,
  type LookupKind,
} from "@/lib/server/twin/hub";

/** Gives a cold engine time to wake; the government source itself can take up to 30 s. */
export const maxDuration = 60;

const istDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

const FAIL: Record<string, [number, string]> = {
  hub_not_configured: [503, "Record lookups aren't connected on this deployment yet."],
  invalid_input: [422, "The source didn't accept that number. Please check it."],
  not_found: [404, "No record was found for that number."],
  max_retries: [429, "Too many tries. Please try again later."],
  multiple_records: [409, "More than one record matched. Please add more detail."],
  source_unavailable: [503, "The government source is down right now. Please try again later."],
  hub_busy: [429, "Too many lookups right now. Please try again in a minute."],
  hub_credits: [503, "Record lookups are paused (provider credits)."],
  hub_auth: [503, "Record lookups aren't set up correctly on this deployment."],
};

type EngineHub =
  | { ok: true; facts?: HubFacts; otp_sent?: boolean; request_id?: string; agent?: unknown; challan_issue?: { code: string } }
  | { ok: false; code: string; upstream_status?: number | null; upstream_reason?: string | null; secure_id?: string | null };

/**
 * One Perfios Hub lookup the member asked for, for THEIR own record.
 * Stored kinds need that record's own DPDP consent (`consent: true` in the
 * body grants it and writes a receipt); the insurance-agent check stores
 * nothing. Only derived facts come back from the engines; nothing here ever
 * falls back to demo data.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/households/me/hub/[kind]">) {
  const guard = storageGuard();
  if (guard) return guard;
  const { kind } = await ctx.params;
  if (!(kind in LOOKUPS)) return errorResponse(404, "unknown_lookup", "Unknown record type.");
  const spec = LOOKUPS[kind as LookupKind];
  const body = (await request.json().catch(() => ({}))) as { consent?: unknown; input?: unknown };
  const sid = await sessionId(true);
  if (!sid) return errorResponse(500, "no_session", "Couldn't start a session.");

  if (spec.purpose) {
    if (body.consent !== true) {
      return errorResponse(403, "consent_required", "This lookup needs your permission first.");
    }
    const granted = await setConsent(sid, spec.purpose, "grant");
    if (!granted.ok) return errorResponse(403, "consent_unavailable", "This record type isn't available.");
  }
  if (!(await underDailyLimit(sid))) {
    return errorResponse(429, "daily_limit", "That's enough lookups for today. Please try again tomorrow.");
  }

  const raw = body.input && typeof body.input === "object" ? (body.input as Record<string, unknown>) : {};
  const input: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw).slice(0, 8)) {
    if (typeof v === "string" || typeof v === "number") input[k] = String(v).slice(0, 64);
  }
  if (kind === "epf") {
    const rid = await takeEpfRequest(sid);
    if (!rid) return errorResponse(410, "otp_expired", "The OTP request expired. Please ask for a new OTP.");
    input.request_id = rid;
  }

  let r: EngineHub;
  try {
    r = await callEngine<EngineHub>(`hub/${kind}`, { as_of: istDate(), input });
  } catch (e) {
    const err = e instanceof TwinError ? e : new TwinError(503, "engine_error", "Please try again.");
    return errorResponse(err.status, err.code, err.safe, err.status >= 500);
  }
  if (!r.ok) {
    const [status, msg] = FAIL[r.code] ?? [502, "The lookup didn't work. Please try again."];
    // A setup problem (Perfios refused our credentials) says why, so the team can fix it.
    const why = r.code !== "not_found" && (r.upstream_status || r.upstream_reason)
      ? ` (Perfios ${r.upstream_status ?? "?"}${r.upstream_reason ? `: ${r.upstream_reason}` : ""}${r.secure_id ? `; username in use: ${r.secure_id}` : ""})`
      : "";
    return errorResponse(status, r.code, msg + why, status >= 500 || status === 429);
  }

  if (kind === "epf_otp") {
    if (!r.request_id) return errorResponse(502, "lookup_failed", "EPFO didn't send an OTP. Please try again.");
    await saveEpfRequest(sid, r.request_id);
    return Response.json({ ok: true, otp_sent: true }, { headers: noStore });
  }
  if (kind === "epf") await clearEpfRequest(sid);
  if (kind === "agent") return Response.json({ ok: true, agent: r.agent }, { headers: noStore });

  const facts: HubFacts = {};
  for (const k of spec.stores) if (r.facts?.[k]) facts[k] = r.facts[k];
  await saveHubFacts(sid, facts);
  // e-challans are looked up with the vehicle; if that source was down, say so (the vehicle record still counts)
  return Response.json({ ok: true, facts, ...(r.challan_issue ? { challan_unavailable: true } : {}) }, { headers: noStore });
}

/** Withdraw this record's consent: its facts are deleted at once (receipt in the Value Ledger). */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/households/me/hub/[kind]">) {
  const guard = storageGuard();
  if (guard) return guard;
  const { kind } = await ctx.params;
  const spec = LOOKUPS[kind as LookupKind];
  if (!spec?.purpose) return errorResponse(404, "unknown_lookup", "Unknown record type.");
  const sid = await sessionId(false);
  if (!sid) return Response.json({ ok: true }, { headers: noStore });
  await setConsent(sid, spec.purpose, "withdraw");
  return Response.json({ ok: true }, { headers: noStore });
}
