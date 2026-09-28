import { callEngine, loadTwin, saveState, type TwinState } from "@/lib/server/twin/engine";
import { withTwinSession } from "@/lib/server/twin/http";

export const maxDuration = 60;

/** Points, streaks and Gullak deposits for the member's own game (starts fresh; nothing from a demo family). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { type?: unknown; ref?: unknown; amount?: unknown };
  return withTwinSession(async (sid) => {
    const { twin, state } = await loadTwin(sid);
    const r = await callEngine<{ result: unknown; state: TwinState }>("game-event", { twin, state, type: body.type, ref: body.ref ?? null, amount: body.amount ?? null });
    await saveState(sid, r.state);
    return r.result;
  });
}
