/**
 * ============================================================
 *  DEMO / FIXTURE DATA — HOME SCENARIOS FOR BUILDING THE UI
 * ============================================================
 *
 * Each scenario reuses the single documented golden household from
 * home.fixture.ts. None adds an amount. They exist so every Home state can be
 * built and tested before the decision service (M03/M09 → H04/H09) exists:
 *
 * - "baseline": the L01 behaviour. A need is shown; no next step is released.
 * - "next-step-preview": adds a released next step written by the frontend
 *   team, of a kind listed in the Guide's action catalogue (§21). It is a UI
 *   preview and is labelled as such everywhere it appears.
 * - "decision-unavailable": the decision service cannot be reached. Home must
 *   say so rather than imply that nothing needs attention.
 * - "picture-unavailable": the household projection cannot be loaded. Home
 *   shows no balances, dates or members in its place.
 *
 * Only lib/data/* may import this file.
 */
import "server-only";

import type {
  ActionProposal,
  DecisionRelease,
} from "@/lib/contracts/decision-packet";
import type { HealthCard } from "@/lib/contracts/health-card";
import type { ProjectionRelease } from "@/lib/contracts/household-projection";
import {
  decisionPacketFixture,
  healthCardFixture,
  householdProjectionFixture,
} from "@/lib/fixtures/home.fixture";

export const HOME_FIXTURE_SCENARIO_IDS = [
  "baseline",
  "next-step-preview",
  "decision-unavailable",
  "picture-unavailable",
] as const;

export type HomeFixtureScenarioId = (typeof HOME_FIXTURE_SCENARIO_IDS)[number];

export interface HomeFixtureScenario {
  id: HomeFixtureScenarioId;
  label: string;
  /** Extra explanation shown in the fixture banner; null for the default. */
  description: string | null;
  /** true when the next step was written by the frontend team. */
  is_ui_preview: boolean;
  projection: ProjectionRelease;
  decision: DecisionRelease;
  health: HealthCard | null;
}

const previewAction: ActionProposal = {
  action_id: "fixture-preview-action-fee-date",
  need_id: "fixture-need-cash-gap",
  kind: "draft_request",
  title: "Prepare a request to pay the school fee after salary",
  summary:
    "Draft a polite request to the school to pay the fee on 30 Sept, the day salary is expected. You decide whether to send it.",
  effect:
    "If the school agrees, the fee would be paid after salary arrives instead of before it.",
  conditional_on:
    "The school agreeing. Until it does, the fee is still due on 28 Sept.",
  reversible: true,
  gate: "proceed_to_user_confirmation",
  status: "proposed",
  alternatives: [
    {
      action_id: "fixture-preview-action-verify-cash",
      kind: "verify_fact",
      title: "Check today's cash",
      summary:
        "The cash figure was entered by hand on 23 Sept. Confirming it keeps this plan accurate.",
      effect: null,
      conditional_on: null,
      reversible: true,
      gate: "ask",
    },
    {
      action_id: "fixture-preview-action-repayments",
      kind: "verify_fact",
      title: "Tell us about any repayments due",
      summary: "Answer one question about loans or money owed before 30 Sept.",
      effect: null,
      conditional_on: null,
      reversible: true,
      gate: "ask",
    },
  ],
};

const releasedProjection: ProjectionRelease = {
  status: "released",
  projection: householdProjectionFixture,
};

const scenarios: Record<HomeFixtureScenarioId, HomeFixtureScenario> = {
  baseline: {
    id: "baseline",
    label: "Demo household",
    description: null,
    is_ui_preview: false,
    projection: releasedProjection,
    decision: { status: "released", packet: decisionPacketFixture },
    health: healthCardFixture,
  },
  "next-step-preview": {
    id: "next-step-preview",
    label: "Next step (UI preview)",
    description:
      "The next step on this page is a UI preview written by the frontend team to show how a released step will look. DhanYukti's decision engine did not produce it.",
    is_ui_preview: true,
    projection: releasedProjection,
    decision: {
      status: "released",
      packet: {
        ...decisionPacketFixture,
        packet_id: "fixture-packet-001-preview",
        action: { status: "released", proposal: previewAction },
      },
    },
    health: healthCardFixture,
  },
  "decision-unavailable": {
    id: "decision-unavailable",
    label: "Decision unavailable",
    description:
      "Shows what Home does when the decision service cannot be reached. The failure is simulated in this build; no server was called.",
    is_ui_preview: false,
    projection: releasedProjection,
    decision: {
      status: "unavailable",
      reason: "DhanYukti couldn't prepare your priority and next step.",
      error: {
        request_id: "fixture-request-0001",
        code: "decision_service_unavailable",
        safe_message:
          "The decision service did not respond. Nothing has been assumed in its place, so this is not an all-clear.",
        retryable: true,
      },
    },
    health: null,
  },
  "picture-unavailable": {
    id: "picture-unavailable",
    label: "Household picture unavailable",
    description:
      "Shows what Home does when the household picture cannot be loaded. The failure is simulated in this build; no server was called.",
    is_ui_preview: false,
    projection: {
      status: "unavailable",
      reason: "DhanYukti couldn't load your household picture.",
      error: {
        request_id: "fixture-request-0002",
        code: "projection_unavailable",
        safe_message:
          "Your household information could not be loaded. No balances, dates or members are shown in its place.",
        retryable: true,
      },
    },
    decision: {
      status: "unavailable",
      reason:
        "A priority can't be shown without your household picture. Nothing has been assumed in its place, so this is not an all-clear.",
      error: null,
    },
    health: null,
  },
};

export function isHomeFixtureScenarioId(
  value: unknown,
): value is HomeFixtureScenarioId {
  return (
    typeof value === "string" &&
    (HOME_FIXTURE_SCENARIO_IDS as readonly string[]).includes(value)
  );
}

export function getHomeFixtureScenario(
  id: HomeFixtureScenarioId,
): HomeFixtureScenario {
  return scenarios[id];
}

export const homeFixtureScenarioList: readonly HomeFixtureScenario[] =
  HOME_FIXTURE_SCENARIO_IDS.map((id) => scenarios[id]);
