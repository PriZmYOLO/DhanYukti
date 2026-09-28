import { decideBill, listBills } from "@/lib/server/twin/bills";
import { loadTwin } from "@/lib/server/twin/engine";
import { withTwinSession } from "@/lib/server/twin/http";

export const maxDuration = 60;

/**
 * Confirm your bills. GET: the payments that repeat in the member's own bank
 * data (as their Household Twin projects them) and their decision on each.
 * POST {series, action: confirm|fix|ignore|undo, amount?, day?}: one decision,
 * applied to every date of that payment and written to the Value Ledger.
 */
export async function GET() {
  return withTwinSession(async (sid) => {
    const { twin, state } = await loadTwin(sid);
    return { bills: listBills(twin, state) };
  });
}

export async function POST(request: Request) {
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  return withTwinSession((sid) => decideBill(sid, body));
}
