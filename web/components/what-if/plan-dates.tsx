"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleCheck,
  CircleDashed,
  Hourglass,
} from "lucide-react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { useWhatIfText } from "@/components/what-if/what-if-text";
import type { PlanDate, PlanDatesRelease } from "@/lib/provisional/h08/types";
import { cn } from "@/lib/utils";

function CertaintyBadge({ certainty }: { certainty: PlanDate["certainty"] }) {
  const text = useWhatIfText();
  const confirmed = certainty === "confirmed";
  const Icon = confirmed ? CircleCheck : CircleDashed;
  return (
    <span
      data-certainty={certainty}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        confirmed
          ? "border-mint-border bg-mint-surface text-foreground"
          : "bg-muted/50 text-muted-foreground border-dashed",
      )}
    >
      <Icon aria-hidden className="size-3" />
      {text(confirmed ? "confirmed" : "inferred")}
    </span>
  );
}

function DateItem({ item }: { item: PlanDate }) {
  const text = useWhatIfText();
  const incoming = item.direction === "in";
  const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
  return (
    <li className="space-y-2 py-3.5" data-plan-date={item.item_id}>
      <div className="grid grid-cols-[5.5rem_1fr] gap-3">
        <p className="text-muted-foreground text-xs leading-tight font-semibold tracking-wide uppercase tabular-nums">
          <DateDisplay value={item.on} format="short" />
          {item.until && (
            <>
              {" "}
              {text("to")} <DateDisplay value={item.until} format="short" />
            </>
          )}
        </p>
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-medium">{item.label}</span>
            <span className="inline-flex items-center gap-1">
              <Icon
                aria-hidden
                className={cn("size-3.5", incoming && "text-positive")}
              />
              <span className="sr-only">
                {text(incoming ? "moneyIn" : "moneyOut")}:
              </span>
              <Money value={item.amount} per={item.per} />
            </span>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <CertaintyBadge certainty={item.certainty} />
            <span className="text-muted-foreground text-xs">{item.basis}</span>
          </p>
        </div>
      </div>
      {item.suggestion && (
        <div
          data-suggestion={item.suggestion.status}
          className="ml-[6.25rem] space-y-1 rounded-lg border border-dashed p-3 text-sm"
        >
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">
              {text("suggestedDate")}
            </span>
            <DateDisplay value={item.suggestion.on} className="font-medium" />
            <span className="border-warning/60 bg-warning/15 text-warning-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium">
              <Hourglass aria-hidden className="size-3" />
              {text("conditionalBadge")}
            </span>
          </p>
          <p className="text-muted-foreground text-xs">
            {item.suggestion.condition}
          </p>
        </div>
      )}
    </li>
  );
}

/**
 * L06 dates list: each dated item in the live plan with a confirmed or
 * inferred badge. A suggested date (the school fee extension) is shown as
 * conditional beside the original, never as the new due date.
 */
export function PlanDates({ release }: { release: PlanDatesRelease }) {
  const text = useWhatIfText();
  return (
    <section aria-labelledby="plan-dates-heading" className="space-y-3">
      <h2
        id="plan-dates-heading"
        className="font-heading text-2xl tracking-tight"
      >
        {text("datesHeading")}
      </h2>
      {release.status === "unavailable" ? (
        <AvailabilityState
          status="unavailable"
          title={text("datesUnavailableTitle")}
          description={release.reason}
          error={release.error ?? undefined}
        />
      ) : (
        <>
          <p className="text-muted-foreground text-sm">{text("datesIntro")}</p>
          <ol className="divide-y border-y">
            {release.items.map((item) => (
              <DateItem key={item.item_id} item={item} />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
