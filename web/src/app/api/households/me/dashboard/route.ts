import { listLinks } from "@/lib/server/aa/links";
import { callEngine, loadTwin } from "@/lib/server/twin/engine";
import { withTwinSession } from "@/lib/server/twin/http";

/** Gives a cold engine time to wake and build. */
export const maxDuration = 60;

/**
 * The linked member's own dashboard, from their own bank data.
 * Suggested tasks (Next Best Actions) follow the member's AA grant
 * "Alerts & suggestions": off by default, so none are shown until they allow it.
 */
export async function GET() {
  return withTwinSession(async (sid) => {
    const { twin, state } = await loadTwin(sid);
    const db = await callEngine<Record<string, unknown>>("dashboard", { twin, state });
    const links = (await listLinks(sid)).filter((l) => l.consent.status === "active" && !l.is_demo);
    const suggestions = links.some((l) => l.grants.alerts_and_actions);
    return suggestions ? db : { ...db, nba: [], suggestions_off: true };
  });
}
