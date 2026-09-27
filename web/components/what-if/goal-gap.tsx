"use client";

import { FilePenLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { Money } from "@/components/finance/money";
import { Button } from "@/components/ui/button";
import { useWhatIfText } from "@/components/what-if/what-if-text";
import { CONFIRMATION_CONNECTED } from "@/lib/capabilities";
import type { MoneyPaise } from "@/lib/contracts/common";
import type { GoalFunding, ScenarioRelease } from "@/lib/provisional/h08/types";
import type { WhatIfCopyKey } from "@/lib/what-if/copy";
import { cn } from "@/lib/utils";

interface Segment {
  label: WhatIfCopyKey;
  amount: MoneyPaise;
  tone: "earmark" | "contribution" | "gap";
}

const toneClasses: Record<Segment["tone"], string> = {
  earmark: "bg-primary",
  contribution: "bg-mint border-primary/40 border",
  gap: "bg-card border-foreground/40 border border-dashed",
};

/**
 * One funding bar. Segment widths come from CSS flex-grow set to each
 * released amount, so the browser proportions them and nothing is added up
 * here. A 2px gap separates the segments.
 */
function FundingBar({
  heading,
  segments,
}: {
  heading: WhatIfCopyKey;
  segments: Segment[];
}) {
  const text = useWhatIfText();
  return (
    <div className="space-y-2" data-goal-bar={heading}>
      <p className="text-sm font-medium">{text(heading)}</p>
      <div aria-hidden className="flex h-3 gap-0.5">
        {segments.map((segment) => (
          <span
            key={segment.label}
            className={cn("rounded-sm", toneClasses[segment.tone])}
            style={{ flex: `${segment.amount.amount_paise} 1 0` }}
          />
        ))}
      </div>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="flex items-baseline justify-between gap-2 sm:block"
          >
            <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span
                aria-hidden
                className={cn(
                  "size-2.5 shrink-0 rounded-sm",
                  toneClasses[segment.tone],
                )}
              />
              {text(segment.label)}
            </dt>
            <dd data-goal-figure={segment.label}>
              <Money
                value={segment.amount}
                className={segment.tone === "gap" ? "text-lg" : undefined}
              />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function GoalCard({ goal, finding }: { goal: GoalFunding; finding: string }) {
  const text = useWhatIfText();
  const [draft, setDraft] = useState(false);
  const draftRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (draft) draftRef.current?.focus();
  }, [draft]);

  return (
    <div className="bg-card space-y-5 rounded-xl border p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-medium">{goal.label}</p>
        <p className="text-sm">
          <span className="text-muted-foreground">{text("goalTarget")}</span>{" "}
          <Money value={goal.target} />
        </p>
      </div>

      <FundingBar
        heading="goalBefore"
        segments={[
          { label: "goalEarmarked", amount: goal.earmarked, tone: "earmark" },
          { label: "goalGap", amount: goal.gap_before, tone: "gap" },
        ]}
      />
      <FundingBar
        heading="goalAfter"
        segments={[
          { label: "goalEarmarked", amount: goal.earmarked, tone: "earmark" },
          {
            label: "goalContributions",
            amount: goal.contribution.total,
            tone: "contribution",
          },
          { label: "goalGap", amount: goal.gap_after, tone: "gap" },
        ]}
      />

      <div className="text-muted-foreground space-y-1 text-xs">
        <p>
          {text("goalContributions")}: {goal.contribution.count}{" "}
          {text("goalTimes")} <Money value={goal.contribution.each} />.{" "}
          {goal.contribution.timing}.
        </p>
        <p>{text("goalEarmarkNote")}</p>
        <p>{finding}</p>
      </div>

      {draft ? (
        <div
          ref={draftRef}
          tabIndex={-1}
          data-goal-draft
          aria-labelledby="goal-draft-heading"
          role="region"
          className="focus-ring space-y-3 rounded-lg border border-dashed p-4"
        >
          <p
            id="goal-draft-heading"
            className="flex items-center gap-2 font-medium"
          >
            <FilePenLine aria-hidden className="size-4" />
            {text("draftTitle")}
          </p>
          <p className="text-muted-foreground text-sm">{text("draftBody")}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="xl" disabled={!CONFIRMATION_CONNECTED}>
              {text("draftConfirm")}
            </Button>
            <Button size="xl" variant="ghost" onClick={() => setDraft(false)}>
              {text("draftDiscard")}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="xl" variant="outline" onClick={() => setDraft(true)}>
          {text("approve")}
        </Button>
      )}
    </div>
  );
}

/**
 * L06 goal funding (E09): the gap before and with the planned
 * contributions. "Approve" opens a draft only; confirming it belongs to the
 * action service (L08), so the plan never changes here.
 */
export function GoalGap({ release }: { release: ScenarioRelease }) {
  const text = useWhatIfText();
  const goal = release.status === "pending" ? null : release.goal;
  return (
    <section aria-labelledby="goal-heading" className="space-y-3">
      <h2 id="goal-heading" className="font-heading text-2xl tracking-tight">
        {text("goalHeading")}
      </h2>
      {goal && release.status !== "pending" ? (
        <GoalCard goal={goal} finding={release.finding} />
      ) : (
        <AvailabilityState
          status="pending"
          title={text("goalUnavailableTitle")}
          description={
            release.status === "pending" ? release.reason : undefined
          }
        />
      )}
    </section>
  );
}
