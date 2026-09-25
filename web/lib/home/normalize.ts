/**
 * Defensive normalisation at the Home data boundary.
 *
 * Until the backend publishes generated types, a released value may carry an
 * enum the frontend doesn't know yet. Unknown values fall back to the most
 * cautious state (not assessed, unavailable, not released, not shared) so
 * they can neither crash Home nor be shown as something more reassuring than
 * released. Anything that could not be read is reported through
 * `unreadable`, so Home can say so instead of silently treating it as none.
 */
import type {
  ActionCandidate,
  ActionRelease,
  Confidence,
  ConfidenceLevel,
  ConsequenceKind,
  DecisionRelease,
  GateDisposition,
  NeedTier,
  PriorityRelease,
  SafeToSpendRelease,
} from "@/lib/contracts/decision-packet";
import type { Availability, SourceKind } from "@/lib/contracts/common";
import {
  HEALTH_DOMAINS,
  type HealthCard,
  type HealthStatus,
} from "@/lib/contracts/health-card";
import type {
  ConnectionStatus,
  MemberVisibility,
  ProjectionRelease,
} from "@/lib/contracts/household-projection";

export interface Normalized<T> {
  value: T;
  /** true when any part of the release could not be read. */
  unreadable: boolean;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return (
    typeof value === "string" && (allowed as readonly string[]).includes(value)
  );
}

const CONFIDENCE_LEVELS: readonly ConfidenceLevel[] = [
  "high",
  "medium",
  "low",
  "insufficient_evidence",
  "not_assessed",
];
const GATES: readonly GateDisposition[] = [
  "proceed_to_user_confirmation",
  "ask",
  "scenario_only",
  "refer",
  "unavailable",
];
const TIERS: readonly NeedTier[] = [
  "essential",
  "contractual",
  "protection",
  "protected_goal",
  "discretionary",
];
const CONSEQUENCE_KINDS: readonly ConsequenceKind[] = [
  "cash_gap",
  "deadline",
  "exposure",
  "cost",
];
const HEALTH_STATUSES: readonly HealthStatus[] = [
  "steady",
  "watch",
  "attention",
  "not_known",
  "not_assessed",
];
const AVAILABILITIES: readonly Availability[] = [
  "present",
  "missing",
  "unavailable",
  "disputed",
  "revoked",
];
const VISIBILITIES: readonly MemberVisibility[] = [
  "self",
  "shared_with_you",
  "not_shared",
];
const SOURCE_KINDS: readonly SourceKind[] = [
  "observed",
  "declared",
  "inferred",
  "scenario",
];
const CONNECTION_STATUSES: readonly ConnectionStatus[] = [
  "not_connected",
  "pending",
  "connected",
  "partial",
  "denied",
  "failed",
  "revoked",
];

const UNREADABLE =
  "This part of the response could not be read, so it isn't shown. Nothing has been assumed in its place.";

/** Collects whether anything had to be replaced by a cautious fallback. */
function tracker() {
  const state = { unreadable: false };
  return {
    state,
    flag() {
      state.unreadable = true;
    },
  };
}

type Flag = () => void;

function confidence(value: Confidence, flag: Flag): Confidence {
  if (oneOf(value.level, CONFIDENCE_LEVELS)) return value;
  flag();
  return { level: "not_assessed", basis: value.basis };
}

function candidate<T extends ActionCandidate>(value: T, flag: Flag): T {
  const gate = oneOf(value.gate, GATES) ? value.gate : (flag(), "unavailable");
  // Anything other than true/false is "not assessed", never "reversible";
  // a value that isn't null either is flagged as unreadable.
  const reversible =
    typeof value.reversible === "boolean" || value.reversible === null
      ? value.reversible
      : (flag(), null);
  return { ...value, gate, reversible };
}

function action(value: ActionRelease, flag: Flag): ActionRelease {
  if (value.status === "released") {
    return {
      status: "released",
      proposal: {
        ...candidate(value.proposal, flag),
        alternatives: value.proposal.alternatives.map((alternative) =>
          candidate(alternative, flag),
        ),
      },
    };
  }
  if (value.status === "unavailable") return value;
  flag();
  return { status: "unavailable", reason: UNREADABLE };
}

function priority(value: PriorityRelease, flag: Flag): PriorityRelease {
  switch (value.status) {
    case "released":
      return {
        status: "released",
        need: {
          ...value.need,
          tier: oneOf(value.need.tier, TIERS)
            ? value.need.tier
            : value.need.tier === null
              ? null
              : (flag(), null),
          confidence: confidence(value.need.confidence, flag),
        },
      };
    case "none_found":
    case "insufficient_evidence":
    case "not_released":
      return value;
    default:
      flag();
      return { status: "not_released", reason: UNREADABLE };
  }
}

function safeToSpend(
  value: SafeToSpendRelease,
  flag: Flag,
): SafeToSpendRelease {
  if (
    value.status === "released" ||
    value.status === "insufficient_evidence" ||
    value.status === "not_released"
  ) {
    return value;
  }
  flag();
  return { status: "not_released", reason: UNREADABLE };
}

export function normalizeDecision(
  release: DecisionRelease,
): Normalized<DecisionRelease> {
  const { state, flag } = tracker();
  if (release.status === "unavailable") {
    return { value: release, unreadable: false };
  }
  if (release.status !== "released") {
    return {
      value: { status: "unavailable", reason: UNREADABLE, error: null },
      unreadable: true,
    };
  }

  const packet = release.packet;
  let consequence = packet.consequence;
  if (consequence && !oneOf(consequence.kind, CONSEQUENCE_KINDS)) {
    flag();
    consequence = null;
  }

  const value: DecisionRelease = {
    status: "released",
    packet: {
      ...packet,
      priority: priority(packet.priority, flag),
      consequence,
      action: action(packet.action, flag),
      safe_to_spend: safeToSpend(packet.safe_to_spend, flag),
      missing_facts: packet.missing_facts.map((fact) =>
        typeof fact.decisive === "boolean" || fact.decisive === null
          ? fact
          : (flag(), { ...fact, decisive: null }),
      ),
    },
  };
  return { value, unreadable: state.unreadable };
}

export function normalizeHealth(
  card: HealthCard | null,
): Normalized<HealthCard | null> {
  if (card === null) return { value: null, unreadable: false };
  const { state, flag } = tracker();

  const domains = card.domains
    .filter((row) => oneOf(row.domain, HEALTH_DOMAINS) || (flag(), false))
    .map((row) => ({
      ...row,
      status: oneOf(row.status, HEALTH_STATUSES)
        ? row.status
        : (flag(), "not_assessed" as const),
      confidence: confidence(row.confidence, flag),
    }));

  return { value: { ...card, domains }, unreadable: state.unreadable };
}

/**
 * Projection values reach shared components (AvailabilityState, SourceBadge)
 * directly, so unknown availability becomes "unavailable" and unknown
 * visibility becomes "not_shared". Unknown connection statuses and source
 * kinds keep their raw value, are flagged here, and render through those
 * components' neutral fallbacks.
 */
export function normalizeProjection(
  release: ProjectionRelease,
): Normalized<ProjectionRelease> {
  if (release.status === "unavailable") {
    return { value: release, unreadable: false };
  }
  if (release.status !== "released") {
    return {
      value: { status: "unavailable", reason: UNREADABLE, error: null },
      unreadable: true,
    };
  }
  const { state, flag } = tracker();
  const projection = release.projection;

  const value: ProjectionRelease = {
    status: "released",
    projection: {
      ...projection,
      facts: projection.facts.map((fact) => {
        if (!oneOf(fact.source_kind, SOURCE_KINDS)) flag();
        return oneOf(fact.availability, AVAILABILITIES)
          ? fact
          : (flag(), { ...fact, availability: "unavailable" as const });
      }),
      members: projection.members.map((member) =>
        oneOf(member.visibility, VISIBILITIES)
          ? member
          : (flag(), { ...member, visibility: "not_shared" as const }),
      ),
      connections: projection.connections.map((connection) => {
        if (!oneOf(connection.status, CONNECTION_STATUSES)) flag();
        return connection;
      }),
    },
  };
  return { value, unreadable: state.unreadable };
}
