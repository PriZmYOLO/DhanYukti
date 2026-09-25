/**
 * Home data boundary. This is the only place that decides where Home's data
 * comes from. Screens receive a HomeView and render `origin` honestly.
 *
 * Today it returns labelled fixture scenarios. There is no backend call here
 * and no fake endpoint. When H04/H09 publish the viewer-filtered projection,
 * the released DecisionPacket and the Health Card, replace the scenario lookup
 * with those calls and return `origin: "backend"`. Keep `assemble()`: it
 * normalises unknown values and enforces that everything on Home comes from
 * one snapshot. Screens need no changes.
 */
import "server-only";

import type { DecisionRelease } from "@/lib/contracts/decision-packet";
import type { HealthCard } from "@/lib/contracts/health-card";
import type { ProjectionRelease } from "@/lib/contracts/household-projection";
import {
  getHomeFixtureScenario,
  homeFixtureScenarioList,
  isHomeFixtureScenarioId,
  type HomeFixtureScenarioId,
} from "@/lib/fixtures/home-scenarios";
import { FIXTURE_LABEL } from "@/lib/fixtures/home.fixture";
import {
  normalizeDecision,
  normalizeHealth,
  normalizeProjection,
} from "@/lib/home/normalize";

export interface HomeFixtureInfo {
  label: string;
  scenario: {
    id: HomeFixtureScenarioId;
    label: string;
    description: string | null;
    is_ui_preview: boolean;
  };
  scenarios: { id: HomeFixtureScenarioId; label: string }[];
}

/**
 * Invariant: when released, the decision and the Health Card were computed
 * from the same snapshot as the projection shown beside them.
 */
export interface HomeData {
  projection: ProjectionRelease;
  decision: DecisionRelease;
  /** null when the Health Card could not be released. */
  health: HealthCard | null;
  /**
   * true when part of a release could not be read and was replaced by a
   * cautious fallback. Home must say so rather than imply it was complete.
   */
  partially_unreadable: boolean;
}

type ReleasedData = Omit<HomeData, "partially_unreadable">;

export type HomeView =
  | ({ origin: "fixture"; fixture: HomeFixtureInfo } & HomeData)
  | ({ origin: "backend" } & HomeData);

function assemble(data: ReleasedData): HomeData {
  const normalizedProjection = normalizeProjection(data.projection);
  const normalizedDecision = normalizeDecision(data.decision);
  const normalizedHealth = normalizeHealth(data.health);
  const projection = normalizedProjection.value;
  const decision = normalizedDecision.value;
  const health = normalizedHealth.value;

  // Only what is actually shown counts towards the "couldn't be read"
  // notice; a decision or health card withheld below is not on the page.
  if (projection.status !== "released") {
    return {
      partially_unreadable: normalizedProjection.unreadable,
      projection,
      decision:
        decision.status === "released"
          ? {
              status: "unavailable",
              reason:
                "A priority can't be shown without your household picture. Nothing has been assumed in its place, so this is not an all-clear.",
              error: null,
            }
          : decision,
      health: null,
    };
  }

  const snapshotId = projection.projection.snapshot_id;
  const decisionShown =
    decision.status !== "released" ||
    decision.packet.snapshot_id === snapshotId;
  const healthShown = health !== null && health.snapshot_id === snapshotId;

  return {
    partially_unreadable:
      normalizedProjection.unreadable ||
      (decisionShown && normalizedDecision.unreadable) ||
      (healthShown && normalizedHealth.unreadable),
    projection,
    decision: decisionShown
      ? decision
      : {
          status: "unavailable",
          reason:
            "Your priority was prepared from a different version of your household picture, so it isn't shown. Nothing has been assumed in its place.",
          error: null,
        },
    health: healthShown ? health : null,
  };
}

export async function loadHomeView(
  options: { fixtureScenario?: unknown } = {},
): Promise<HomeView> {
  const scenario = getHomeFixtureScenario(
    isHomeFixtureScenarioId(options.fixtureScenario)
      ? options.fixtureScenario
      : "baseline",
  );

  return {
    origin: "fixture",
    fixture: {
      label: FIXTURE_LABEL,
      scenario: {
        id: scenario.id,
        label: scenario.label,
        description: scenario.description,
        is_ui_preview: scenario.is_ui_preview,
      },
      scenarios: homeFixtureScenarioList.map(({ id, label }) => ({
        id,
        label,
      })),
    },
    ...assemble({
      projection: scenario.projection,
      decision: scenario.decision,
      health: scenario.health,
    }),
  };
}
