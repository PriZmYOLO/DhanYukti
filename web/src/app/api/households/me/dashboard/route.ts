import { callEngine, loadTwin } from "@/lib/server/twin/engine";
import { withTwinSession } from "@/lib/server/twin/http";

/** Gives a cold engine time to wake and build. */
export const maxDuration = 60;

/** The linked member's own dashboard, from their own bank data (tasks always included). */
export async function GET() {
  return withTwinSession(async (sid) => {
    const { twin, state, declared, hub } = await loadTwin(sid);
    return callEngine("dashboard", { twin, state, declared, hub });
  });
}
