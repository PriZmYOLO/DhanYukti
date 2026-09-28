import { callEngine, loadTwin, saveState, type TwinState } from "@/lib/server/twin/engine";
import { withTwinSession } from "@/lib/server/twin/http";

export const maxDuration = 60;

/** A correction the member makes to their own picture (kept as an overlay; the bank data is never rewritten). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { field?: unknown; value?: unknown };
  return withTwinSession(async (sid) => {
    const { twin, state, declared } = await loadTwin(sid);
    const r = await callEngine<{ ok: boolean; state: TwinState; dashboard: unknown }>("correct", { twin, state, declared, field: body.field, value: body.value });
    await saveState(sid, r.state);
    return { ok: r.ok, dashboard: r.dashboard };
  });
}
