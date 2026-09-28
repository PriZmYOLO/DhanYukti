import { callEngine, loadTwin } from "@/lib/server/twin/engine";
import { withTwinSession } from "@/lib/server/twin/http";

export const maxDuration = 60;

/** What-if on the member's own household (scenario only; nothing is saved). */
export async function POST(request: Request) {
  const input = await request.json().catch(() => ({}));
  return withTwinSession(async (sid) => {
    const { twin, state, declared } = await loadTwin(sid);
    return callEngine("simulate", { twin, state, declared, input });
  });
}
