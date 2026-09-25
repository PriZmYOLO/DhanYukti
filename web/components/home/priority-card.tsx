import { CalendarClock, CircleCheck, CircleDashed } from "lucide-react";
import type { ReactNode } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { ConfidenceBadge } from "@/components/home/confidence-badge";
import { ConsequenceOfDelay } from "@/components/home/consequence";
import { HomeText } from "@/components/home/home-text";
import { MissingFactsList } from "@/components/home/missing-facts";
import { NextStep } from "@/components/home/next-step";
import { WhySheet } from "@/components/home/why-sheet";
import type {
  CashFlowFindings,
  Consequence,
  DecisionPacket,
  DecisionRelease,
} from "@/lib/contracts/decision-packet";
import type { FactSummary } from "@/lib/contracts/household-projection";
import type { HomeCopyKey } from "@/lib/home/copy";
import { buildWhyView } from "@/lib/home/why-view";

function Figure({
  label,
  children,
}: {
  label: HomeCopyKey;
  children: ReactNode;
}) {
  return (
    <div className="bg-muted/50 flex items-baseline justify-between gap-3 rounded-lg px-3 py-2.5 sm:block sm:p-3">
      <dt className="text-muted-foreground text-sm sm:text-xs">
        <HomeText k={label} />
      </dt>
      <dd className="flex flex-wrap items-baseline justify-end gap-x-1.5 text-right sm:mt-1 sm:justify-start sm:text-left">
        {children}
      </dd>
    </div>
  );
}

function CashFlowFigures({
  cashFlow,
  consequence,
}: {
  cashFlow: CashFlowFindings;
  consequence: Consequence | null;
}) {
  const deficit = cashFlow.first_deficit;
  // Skip the first shortfall only when the consequence states exactly it.
  const repeatedByConsequence =
    deficit !== null &&
    consequence?.kind === "cash_gap" &&
    consequence.amount?.amount_paise === deficit.amount.amount_paise &&
    consequence.on === deficit.on;
  const floorBroken = cashFlow.gap_to_floor.amount_paise > 0;

  return (
    <div className="space-y-2">
      <dl className="grid gap-2 sm:grid-cols-3">
        {deficit && !repeatedByConsequence && (
          <Figure label="firstShortfall">
            <Money value={deficit.amount} className="text-lg" />
            <span className="text-muted-foreground text-xs">
              <HomeText k="onDate" /> <DateDisplay value={deficit.on} />
            </span>
          </Figure>
        )}
        <Figure label="lowestPoint">
          <Money value={cashFlow.minimum_cash.amount} className="text-lg" />
          <span className="text-muted-foreground text-xs">
            <HomeText k="onDate" />{" "}
            <DateDisplay value={cashFlow.minimum_cash.on} />
          </span>
        </Figure>
        <Figure label="agreedFloor">
          <Money value={cashFlow.floor} className="text-lg" />
        </Figure>
        {floorBroken && (
          <Figure label="belowFloorBy">
            <Money value={cashFlow.gap_to_floor} className="text-lg" />
          </Figure>
        )}
      </dl>
      <p className="text-muted-foreground text-xs">
        {!floorBroken && (
          <>
            <HomeText k="floorHolds" />{" "}
          </>
        )}
        <HomeText k="lookingAhead" />{" "}
        <DateDisplay value={cashFlow.horizon.start} /> <HomeText k="to" />{" "}
        <DateDisplay value={cashFlow.horizon.end} />.
      </p>
    </div>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="priority-heading"
      className="bg-card text-card-foreground overflow-hidden rounded-xl border shadow-xs"
    >
      {children}
    </section>
  );
}

function Heading() {
  return (
    <h2
      id="priority-heading"
      className="text-muted-foreground text-sm font-medium"
    >
      <HomeText k="attentionHeading" />
    </h2>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div className="space-y-3 border-t p-4 sm:p-6">{children}</div>;
}

/** Missing facts, shown in every released state — unknown is never hidden. */
function MissingFactsSection({ packet }: { packet: DecisionPacket }) {
  if (packet.missing_facts.length === 0) return null;
  return (
    <Section>
      <h3 className="text-muted-foreground text-sm font-medium">
        <HomeText k="missingHeading" />
      </h3>
      <MissingFactsList facts={packet.missing_facts} />
    </Section>
  );
}

interface PriorityCardProps {
  decision: DecisionRelease;
  /** Released facts the decision used, already filtered for this viewer. */
  evidence: FactSummary[];
  isUiPreview: boolean;
}

/**
 * Home's priority card (Task Pack L03): need → consequence of delay →
 * figures → next step → missing information → confidence and Why.
 * Every value is rendered exactly as released. The absence of a need is
 * always explained and is only called "nothing needs attention" when the
 * engine says so and nothing decisive is missing.
 */
export function PriorityCard({
  decision,
  evidence,
  isUiPreview,
}: PriorityCardProps) {
  if (decision.status === "unavailable") {
    return (
      <CardShell>
        <div className="space-y-4 p-4 sm:p-6">
          <Heading />
          <AvailabilityState
            status="failed"
            title={<HomeText k="decisionUnavailableTitle" />}
            description={decision.reason}
            error={decision.error ?? undefined}
          />
        </div>
      </CardShell>
    );
  }

  const { packet } = decision;
  const { priority, consequence } = packet;

  if (priority.status !== "released") {
    const clear =
      priority.status === "none_found" && packet.missing_facts.length === 0;
    const Icon = clear ? CircleCheck : CircleDashed;
    const titleKey: HomeCopyKey =
      priority.status === "none_found"
        ? clear
          ? "noneFoundTitle"
          : "noneFoundWithGapsTitle"
        : "noPriorityTitle";
    const body =
      priority.status === "none_found" ? priority.basis : priority.reason;

    return (
      <CardShell>
        <div className="space-y-3 p-4 sm:p-6">
          <Heading />
          <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Icon
              aria-hidden
              className={
                clear ? "text-primary size-5" : "text-muted-foreground size-5"
              }
            />
            <HomeText k={titleKey} />
          </h3>
          <p className="text-muted-foreground max-w-prose">{body}</p>
        </div>
        {packet.action.status === "released" && (
          <Section>
            <NextStep action={packet.action} isUiPreview={isUiPreview} />
          </Section>
        )}
        <MissingFactsSection packet={packet} />
      </CardShell>
    );
  }

  const { need } = priority;
  const why = buildWhyView(packet, need, evidence, isUiPreview);

  return (
    <CardShell>
      <div className="space-y-5 p-4 sm:p-6">
        <Heading />
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {need.title}
          </h3>
          {need.deadline && (
            <p className="bg-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium">
              <CalendarClock aria-hidden className="size-3.5" />
              <span>
                <HomeText k="dueBy" /> <DateDisplay value={need.deadline} />
              </span>
            </p>
          )}
          <p className="text-muted-foreground max-w-prose">{need.summary}</p>
        </div>
        {consequence && <ConsequenceOfDelay consequence={consequence} />}
        {need.cash_flow && (
          <CashFlowFigures
            cashFlow={need.cash_flow}
            consequence={consequence}
          />
        )}
      </div>

      <Section>
        <NextStep action={packet.action} isUiPreview={isUiPreview} />
      </Section>

      <MissingFactsSection packet={packet} />

      <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-3 border-t p-4 sm:px-6">
        <ConfidenceBadge confidence={need.confidence} />
        <WhySheet view={why} />
      </div>
    </CardShell>
  );
}
