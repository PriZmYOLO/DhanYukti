import {
  ChevronDown,
  CircleHelp,
  Link2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { ActionKindIcon } from "@/components/home/action-kind-icon";
import { HomeText } from "@/components/home/home-text";
import { Button } from "@/components/ui/button";
import type {
  ActionCandidate,
  ActionRelease,
  GateDisposition,
} from "@/lib/contracts/decision-packet";
import type { HomeCopyKey } from "@/lib/home/copy";

const headingFor: Record<GateDisposition, HomeCopyKey> = {
  proceed_to_user_confirmation: "nextStepHeading",
  ask: "nextStepHeading",
  scenario_only: "scenarioStepHeading",
  refer: "referStepHeading",
  unavailable: "nextStepHeading",
};

function Heading({ k }: { k: HomeCopyKey }) {
  return (
    <h3 className="text-muted-foreground text-sm font-medium">
      <HomeText k={k} />
    </h3>
  );
}

/** Irreversibility is a warning, never merely the absence of a label. */
function IrreversibleWarning() {
  return (
    <p className="border-warning/60 bg-warning/15 text-warning-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold">
      <TriangleAlert aria-hidden className="size-4 shrink-0" />
      <HomeText k="irreversible" />
    </p>
  );
}

/** Effect, dependency, gate and reversibility — shared by step and options. */
function StepFacts({ candidate }: { candidate: ActionCandidate }) {
  return (
    <div className="space-y-3">
      {candidate.reversible === false && <IrreversibleWarning />}
      {candidate.effect && <p className="text-sm">{candidate.effect}</p>}
      {candidate.conditional_on && (
        <p className="bg-muted/50 flex gap-2 rounded-lg p-3 text-sm">
          <Link2
            aria-hidden
            className="text-muted-foreground mt-0.5 size-4 shrink-0"
          />
          <span>
            <span className="font-medium">
              <HomeText k="dependsOn" />:
            </span>{" "}
            {candidate.conditional_on}
          </span>
        </p>
      )}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="bg-primary size-1.5 rounded-full" />
          <HomeText k={`gate_${candidate.gate}`} />
        </span>
        {candidate.reversible === true && (
          <span className="inline-flex items-center gap-1.5">
            <RotateCcw aria-hidden className="size-3.5" />
            <HomeText k="reversible" />
          </span>
        )}
        {candidate.reversible === null && (
          <span className="inline-flex items-center gap-1.5">
            <CircleHelp aria-hidden className="size-3.5" />
            <HomeText k="reversibilityUnknown" />
          </span>
        )}
      </div>
    </div>
  );
}

function Alternative({ candidate }: { candidate: ActionCandidate }) {
  const unavailable = candidate.gate === "unavailable";
  return (
    <li className="flex gap-3 py-3">
      <ActionKindIcon
        kind={candidate.kind}
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="space-y-0.5">
          <p className="font-medium">{candidate.title}</p>
          {!unavailable && (
            <p className="text-muted-foreground text-sm">{candidate.summary}</p>
          )}
        </div>
        {unavailable ? (
          <p className="text-muted-foreground text-sm">
            <HomeText k="gate_unavailable" />
          </p>
        ) : (
          <StepFacts candidate={candidate} />
        )}
      </div>
    </li>
  );
}

interface NextStepProps {
  action: ActionRelease;
  /** Set when the step was written by the frontend team, not the engine. */
  isUiPreview: boolean;
}

/**
 * The released next best action (Guide §21), framed by its gate result.
 * Confirmation belongs to the action service (Y08/H09, L08); until then
 * nothing is sent from here.
 */
export function NextStep({ action, isUiPreview }: NextStepProps) {
  if (action.status === "unavailable") {
    return (
      <div className="space-y-3">
        <Heading k="nextStepHeading" />
        <AvailabilityState
          status="unavailable"
          title={<HomeText k="noNextStep" />}
          description={action.reason}
        />
      </div>
    );
  }

  const step = action.proposal;

  if (step.gate === "unavailable") {
    // The gate is per candidate: an unavailable proposal doesn't hide the
    // alternatives that remain available.
    return (
      <div className="space-y-3">
        <Heading k="nextStepHeading" />
        <AvailabilityState
          status="unavailable"
          title={<HomeText k="stepUnavailableTitle" />}
          description={step.title}
        />
        <Alternatives candidates={step.alternatives} />
      </div>
    );
  }

  const noteId = `confirm-note-${step.action_id}`;

  return (
    <div className="space-y-4">
      <Heading k={headingFor[step.gate]} />

      {isUiPreview && (
        <p className="border-warning/60 text-warning-foreground bg-warning/10 inline-flex rounded-full border border-dashed px-2.5 py-0.5 text-xs font-medium">
          <HomeText k="uiPreview" />
        </p>
      )}

      <div className="flex gap-3">
        <span
          aria-hidden
          className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-lg"
        >
          <ActionKindIcon kind={step.kind} className="size-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-lg font-semibold tracking-tight text-balance">
            {step.title}
          </p>
          <p className="text-muted-foreground">{step.summary}</p>
        </div>
      </div>

      {step.gate === "scenario_only" && (
        <p className="text-sm font-medium">
          <HomeText k="scenarioOnlyNote" />
        </p>
      )}
      {step.gate === "refer" && (
        <p className="text-sm font-medium">
          <HomeText k="referNote" />
        </p>
      )}

      <StepFacts candidate={step} />

      {step.gate === "proceed_to_user_confirmation" && (
        <div className="space-y-2">
          <Button size="lg" disabled aria-describedby={noteId}>
            <HomeText k="reviewAndConfirm" />
          </Button>
          <p id={noteId} className="text-muted-foreground text-xs">
            <HomeText k="confirmNotConnected" />
          </p>
        </div>
      )}

      <Alternatives candidates={step.alternatives} />
    </div>
  );
}

function Alternatives({ candidates }: { candidates: ActionCandidate[] }) {
  if (candidates.length === 0) return null;
  return (
    <details className="group rounded-lg border">
      <summary className="hover:bg-muted/50 focus-ring flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span>
          <HomeText k="otherOptions" /> ({candidates.length})
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="divide-y border-t px-3">
        {candidates.map((candidate) => (
          <Alternative key={candidate.action_id} candidate={candidate} />
        ))}
      </ul>
    </details>
  );
}
