import { CircleCheck, CircleDashed, CircleHelp } from "lucide-react";
import type { ReactNode } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { ConfidenceBadge } from "@/components/home/confidence-badge";
import { ConsequenceOfDelay } from "@/components/home/consequence";
import { EvidenceLine } from "@/components/home/evidence-line";
import { HomeText } from "@/components/home/home-text";
import { MissingFactsList } from "@/components/home/missing-facts";
import { NextStep } from "@/components/home/next-step";
import { BrandSeal } from "@/components/shell/brand-seal";
import type {
  ActionRelease,
  CashFlowFindings,
  Consequence,
  DecisionPacket,
  DecisionRelease,
} from "@/lib/contracts/decision-packet";
import type { FactSummary } from "@/lib/contracts/household-projection";
import type { HomeCopyKey } from "@/lib/home/copy";
import { buildWhyView } from "@/lib/home/why-view";
import { cn } from "@/lib/utils";

/** Anchor for the hero's "what we don't know yet" list. */
export const PRIORITY_MISSING_ID = "priority-missing";

function Figure({
  label,
  children,
}: {
  label: HomeCopyKey;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3 sm:block sm:pr-4">
      <dt className="text-muted-foreground text-xs">
        <HomeText k={label} />
      </dt>
      <dd className="flex flex-wrap items-baseline justify-end gap-x-1.5 text-right sm:mt-1 sm:justify-start sm:text-left">
        {children}
      </dd>
    </div>
  );
}

/**
 * Released cash-flow findings as a ruled summary strip (like the totals line
 * of an account book). Shown with the Coming-up ledger.
 */
export function CashFlowFigures({
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
      <dl className="border-foreground divide-border grid divide-y border-t-[1.5px] border-b sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] sm:divide-y-0">
        {deficit && !repeatedByConsequence && (
          <Figure label="firstShortfall">
            <Money value={deficit.amount} className="text-[1.375rem]" />
            <span className="text-muted-foreground text-xs">
              <HomeText k="onDate" /> <DateDisplay value={deficit.on} />
            </span>
          </Figure>
        )}
        <Figure label="lowestPoint">
          <Money
            value={cashFlow.minimum_cash.amount}
            className="text-[1.375rem]"
          />
          <span className="text-muted-foreground text-xs">
            <HomeText k="onDate" />{" "}
            <DateDisplay value={cashFlow.minimum_cash.on} />
          </span>
        </Figure>
        <Figure label="agreedFloor">
          <Money value={cashFlow.floor} className="text-[1.375rem]" />
        </Figure>
        {floorBroken && (
          <Figure label="belowFloorBy">
            <Money value={cashFlow.gap_to_floor} className="text-[1.375rem]" />
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

function Eyebrow({ id }: { id?: string }) {
  return (
    <h2
      id={id}
      className="text-primary text-xs font-semibold tracking-widest uppercase"
    >
      <HomeText k="attentionHeading" />
    </h2>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="priority-heading"
      className="bg-card text-card-foreground overflow-hidden rounded-xl border"
    >
      {children}
    </section>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div className="space-y-3 border-t p-4 sm:p-6">{children}</div>;
}

/** Missing facts, shown in every released state — unknown is never hidden. */
function MissingFacts({ packet }: { packet: DecisionPacket }) {
  if (packet.missing_facts.length === 0) return null;
  return (
    <div
      id={PRIORITY_MISSING_ID}
      className="border-muted-foreground/50 max-w-prose scroll-mt-24 space-y-3 border-t border-dashed pt-4"
    >
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <CircleHelp aria-hidden className="size-4" />
        <HomeText k="missingHeading" />
      </h4>
      <MissingFactsList facts={packet.missing_facts} />
    </div>
  );
}

/**
 * The next step as the page's one raised surface: mint only when a step is
 * released and available, otherwise a neutral panel that still explains why
 * there is no step.
 */
function NextStepPanel({
  action,
  isUiPreview,
}: {
  action: ActionRelease;
  isUiPreview: boolean;
}) {
  const available =
    action.status === "released" && action.proposal.gate !== "unavailable";
  return (
    <div
      className={cn(
        "rounded-xl border p-5 sm:p-6",
        available
          ? "border-mint-border bg-mint-surface shadow-raised"
          : "bg-card",
      )}
    >
      <NextStep action={action} isUiPreview={isUiPreview} />
    </div>
  );
}

interface PriorityCardProps {
  decision: DecisionRelease;
  /** Released facts the decision used, already filtered for this viewer. */
  evidence: FactSummary[];
  isUiPreview: boolean;
}

/**
 * Home's priority (Task Pack L03): need → consequence of delay → how it was
 * worked out → missing information → confidence and Why → next step.
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
          <Eyebrow id="priority-heading" />
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
          <Eyebrow id="priority-heading" />
          <h3 className="font-heading flex items-center gap-2 text-3xl tracking-tight">
            <Icon
              aria-hidden
              className={
                clear ? "text-primary size-6" : "text-muted-foreground size-6"
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
        {packet.missing_facts.length > 0 && (
          <Section>
            <MissingFacts packet={packet} />
          </Section>
        )}
      </CardShell>
    );
  }

  const { need } = priority;
  const why = buildWhyView(packet, need, evidence, isUiPreview);

  // Four blocks, in DOM (reading and focus) order: title → consequence →
  // next step → explanation. Phones stack them, so all three first blocks
  // start above the fold at 375×812; from lg the title and explanation sit
  // left and the consequence and next step stack on the right (explicit
  // placement), so the next step's heading is above the fold at 1280×800.
  return (
    <section
      aria-labelledby="priority-heading"
      className="grid gap-6 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-8"
    >
      <div className="space-y-4 lg:col-span-7">
        <div className="flex items-center gap-3">
          <BrandSeal />
          <div className="leading-tight">
            <Eyebrow id="priority-heading" />
            {need.deadline && (
              <p className="text-muted-foreground mt-0.5 text-sm">
                <HomeText k="dueBy" /> <DateDisplay value={need.deadline} />
              </p>
            )}
          </div>
        </div>
        <h3 className="font-heading text-[2.25rem] leading-[1.05] tracking-tight text-balance sm:text-[3.25rem] lg:text-[4rem]">
          {need.title}
        </h3>
      </div>

      {consequence && (
        <div className="lg:col-span-5 lg:col-start-8 lg:self-end">
          <ConsequenceOfDelay consequence={consequence} />
        </div>
      )}

      <div className="lg:col-span-5 lg:col-start-8 lg:row-start-2 lg:self-start">
        <NextStepPanel action={packet.action} isUiPreview={isUiPreview} />
      </div>

      <div className="space-y-5 lg:col-span-7 lg:col-start-1 lg:row-start-2">
        <div className="space-y-2">
          <p className="text-foreground/85 max-w-prose text-[1.0625rem] leading-relaxed">
            {need.summary}
          </p>
          <EvidenceLine view={why} />
        </div>
        <MissingFacts packet={packet} />
        <ConfidenceBadge confidence={need.confidence} />
      </div>
    </section>
  );
}
