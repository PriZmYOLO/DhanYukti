/**
 * PROVISIONAL — the operations the What-if screen (L06/L07) needs from the
 * scenario service (H06 routes, H08 policy, E03/E08/E09/E10 engines), as
 * TypeScript signatures.
 *
 * Deliberately NOT a list of HTTP routes. The backend decides the real
 * routes; a backend-backed adapter implements this interface by calling
 * them. The actor comes from the session, so no method takes a member id.
 */
import type {
  PlanDatesRelease,
  ScenarioPreset,
  ScenarioPresetId,
  ScenarioRelease,
} from "@/lib/provisional/h08/types";

export interface ScenarioPort {
  /** "demo" until an H08-backed adapter exists. */
  readonly implementation: "demo" | "h08";

  /** The bounded inputs that can be previewed. The UI offers only these. */
  listPresets(): Promise<ScenarioPreset[]>;

  /** The live plan's own run: what every preview is compared with. */
  getBaseline(): Promise<ScenarioRelease>;

  /**
   * Simulates one preset on a copy of the baseline snapshot, same horizon.
   * Read-only: it never changes the live plan, Home or any accepted date.
   */
  preview(presetId: ScenarioPresetId): Promise<ScenarioRelease>;

  /** The plan's dated items with confirmed / inferred certainty (N06). */
  getPlanDates(): Promise<PlanDatesRelease>;
}
