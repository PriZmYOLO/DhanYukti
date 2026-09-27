/**
 * ============================================================
 *  DEMO — NO SCENARIO ENGINE, NO BACKEND
 * ============================================================
 *
 * Development stand-in for the scenario service so the What-if screen can
 * be used before H06/H08 and the engines exist. Replace it; do not extend it
 * into a real simulator.
 *
 * - Returns the written-out releases in `demo-releases.ts`. It computes
 *   nothing and makes no network calls.
 * - Stateless: previewing stores nothing, so the live plan (Home, the dates
 *   list) can never change because of a preview.
 */
import {
  DEMO_BASELINE,
  DEMO_PLAN_DATES,
  DEMO_PRESETS,
  DEMO_RELEASES,
} from "@/lib/provisional/h08/demo-releases";
import type { ScenarioPort } from "@/lib/provisional/h08/port";

/** Deep copy, so a caller can never mutate the shared demo data. */
const copy = <T>(value: T): T => structuredClone(value);

export const demoScenarioAdapter: ScenarioPort = {
  implementation: "demo",

  async listPresets() {
    return copy(DEMO_PRESETS);
  },

  async getBaseline() {
    return copy(DEMO_BASELINE);
  },

  async preview(presetId) {
    const release = DEMO_RELEASES[presetId];
    if (!release) throw new Error(`Unknown demo preset: ${presetId}`);
    return copy(release);
  },

  async getPlanDates() {
    return copy(DEMO_PLAN_DATES);
  },
};
