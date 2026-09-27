/**
 * PROVISIONAL wiring. The What-if screen (L06/L07) depends only on
 * `scenarioPort`.
 *
 * When the scenario service is delivered (H06 routes, H08 policy, E03/E08/
 * E09/E10), implement ScenarioPort against it and export that here with
 * `implementation: "h08"`.
 */
import { demoScenarioAdapter } from "@/lib/provisional/h08/demo-adapter";
import type { ScenarioPort } from "@/lib/provisional/h08/port";

export const scenarioPort: ScenarioPort = demoScenarioAdapter;

export type { ScenarioPort } from "@/lib/provisional/h08/port";
export * from "@/lib/provisional/h08/types";
