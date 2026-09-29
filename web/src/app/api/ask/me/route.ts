import { callEngine, loadTwin } from "@/lib/server/twin/engine";
import { withTwinSession } from "@/lib/server/twin/http";

export const maxDuration = 60;

/** Ask companion on the member's own numbers. Rules calculate, AI only rephrases. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { question?: unknown; lang?: unknown };
  return withTwinSession(async (sid) => {
    const { twin, state, declared, hub } = await loadTwin(sid);
    return callEngine("ask", { twin, state, declared, hub, question: String(body.question ?? "").slice(0, 500), lang: body.lang === "en" ? "en" : "hi" });
  });
}
