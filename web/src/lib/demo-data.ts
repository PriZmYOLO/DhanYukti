import { isDemoMode } from "@/lib/api";
import { primaryMember } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

/** The three demo households (Sunita, Farida, Meena), from FastAPI or demo.json. */
const DEMO_HOUSEHOLD_IDS = ["A", "B", "C"];

/**
 * The demo household's name when the dashboard is fixture data, else null.
 * A linked member's own household (id "me", built by the engines from their
 * own bank data) is never a demo.
 */
export function demoHouseholdName(d: Dashboard | null): string | null {
  if (!d || d.household.id === "me") return null;
  const demo = isDemoMode() || d.data_source.mode === "fixture" || DEMO_HOUSEHOLD_IDS.includes(d.household.id);
  return demo ? (primaryMember(d)?.name ?? d.household.primary_user) : null;
}
