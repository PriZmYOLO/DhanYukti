import type { BillAction, BillDecisionInput } from "@/lib/contracts/aa-bills";
import { billsView, decideBill } from "@/lib/server/aa/links";
import {
  errorResponse,
  noStore,
  sessionId,
  storageGuard,
} from "@/lib/server/aa/http";

/**
 * Confirm your bills (E02 with a consent step). GET: what repeats in this
 * link's own data, the member's decisions so far and, from confirmed items
 * only, their 30-day outlook. POST: one decision (confirm, fix, ignore or
 * undo), written to the Value Ledger. No transactions or narrations are
 * returned, only a payee label per item.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/aa/links/[linkId]/bills">,
) {
  const guard = storageGuard();
  if (guard) return guard;
  const { linkId } = await ctx.params;
  const sid = await sessionId(false);
  const result = sid
    ? await billsView(sid, linkId)
    : { status: "not_found" as const };
  if (result.status === "not_found") {
    return errorResponse(404, "not_found", "This request isn't in your session.");
  }
  if (result.status === "expired") {
    return errorResponse(410, "expired", result.safe_message);
  }
  if (result.status === "no_data") {
    return errorResponse(
      409,
      "no_data",
      "No bank data has arrived for this link yet. Nothing has been assumed.",
      true,
    );
  }
  return Response.json({ bills: result.view }, { headers: noStore });
}

const ACTIONS: BillAction[] = ["confirm", "fix", "ignore", "undo"];

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/aa/links/[linkId]/bills">,
) {
  const guard = storageGuard();
  if (guard) return guard;
  const { linkId } = await ctx.params;
  const sid = await sessionId(false);
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (
    !body ||
    typeof body.id !== "string" ||
    !ACTIONS.includes(body.action as BillAction)
  ) {
    return errorResponse(400, "invalid", "Choose confirm, fix, ignore or undo for one item.");
  }
  const input: BillDecisionInput = {
    id: body.id,
    action: body.action as BillAction,
    amount_rupees:
      typeof body.amount_rupees === "number" ? body.amount_rupees : undefined,
    day: typeof body.day === "number" ? body.day : undefined,
  };
  if (
    (body.amount_rupees !== undefined && input.amount_rupees === undefined) ||
    (body.day !== undefined && input.day === undefined)
  ) {
    return errorResponse(400, "invalid", "Amount and day must be numbers.");
  }
  const result = sid
    ? await decideBill(sid, linkId, input)
    : ({ ok: false, reason: "not_found" } as const);
  if (!result.ok) {
    const [status, message] =
      result.reason === "invalid"
        ? [400, "Enter an amount above ₹0 and, for a monthly or quarterly bill, a day from 1 to 31. Nothing was saved."]
        : result.reason === "unknown_item"
          ? [404, "This item isn't among the suggestions from your data."]
          : result.reason === "expired"
            ? [410, "The suggestions came from bank data that has now been deleted. Connect again to see them."]
            : result.reason === "no_data"
              ? [409, "No bank data has arrived for this link yet."]
              : [404, "This request isn't in your session."];
    return errorResponse(status, result.reason, message);
  }
  return Response.json({ bills: result.view }, { headers: noStore });
}
