import {
  ChevronDown,
  CircleDashed,
  CircleHelp,
  Link2,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { ActionKindIcon } from "@/components/home/action-kind-icon";
import { HomeText } from "@/components/home/home-text";
import { Button } from "@/components/ui/button";
import { CONFIRMATION_CONNECTED } from "@/lib/capabilities";
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
    <h3 className="text-primary text-xs font-semibold tracking-widest uppercase">
      <HomeText k={k} />
    </h3>
  );
}

/**
 * The gate result as a status line. "Ready for review" is only true once
 * confirmation is connected; until then a neutral "Preview only" status is
 * shown instead, with no green dot. Other gates keep their released label.
 */
function GateStatus({ gate }: { gate: ActionCandidate["gate"] }) {
  if (gate === "proceed_to_user_confirmation" && !CONFIRMATION_CONNECTED) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <CircleDashed aria-hidden className="size-3.5" />
        <HomeText k="confirmPreviewOnly" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="bg-primary size-1.5 rounded-full" />
      <HomeText k={`gate_${gate}`} />
    </span>
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
        // The label is a caption above the released text, so it reads
        // correctly whatever grammatical form that text takes.
        <div className="bg-card/70 rounded-lg p-3 text-sm">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
            <Link2 aria-hidden className="size-3.5 shrink-0" />
            <HomeText k="dependsOn" />
          </p>
          <p className="mt-1">{candidate.conditional_on}</p>
        </div>
      )}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <GateStatus gate={candidate.gate} />
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
          className="bg-mint text-forest grid size-10 shrink-0 place-items-center rounded-lg"
        >
          <ActionKindIcon kind={step.kind} className="size-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-xl font-semibold tracking-tight text-balance">
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
          {/* Disabled until the action service exists (lib/capabilities).
              Styled inert — dashed and muted — never as a call to action. */}
          <Button
            size="xl"
            disabled={!CONFIRMATION_CONNECTED}
            aria-describedby={CONFIRMATION_CONNECTED ? undefined : noteId}
            className="disabled:border-muted-foreground/45 disabled:bg-muted/70 disabled:text-muted-foreground w-full disabled:border-dashed disabled:opacity-100"
          >
            <HomeText k="reviewAndConfirm" />
          </Button>
          {!CONFIRMATION_CONNECTED && (
            <p
              id={noteId}
              className="text-muted-foreground flex items-start gap-1.5 text-xs"
            >
              <ShieldCheck aria-hidden className="mt-px size-3.5 shrink-0" />
              <HomeText k="confirmNotConnected" />
            </p>
          )}
        </div>
      )}

      <Alternatives candidates={step.alternatives} />
    </div>
  );
}

function Alternatives({ candidates }: { candidates: ActionCandidate[] }) {
  if (candidates.length === 0) return null;
  return (
    <details className="group border-t border-current/15">
      <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-sm text-xs font-semibold tracking-wider uppercase [&::-webkit-details-marker]:hidden">
        <span>
          <HomeText k="otherOptions" /> ({candidates.length})
        </span>
        <ChevronDown
          aria-hidden
          className="ease-out-strong size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <ul className="divide-y">
        {candidates.map((candidate) => (
          <Alternative key={candidate.action_id} candidate={candidate} />
        ))}
      </ul>
    </details>
  );
}
