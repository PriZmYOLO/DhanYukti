import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { HomeText } from "@/components/home/home-text";
import type { IsoDate } from "@/lib/contracts/common";
import type { CashFlowFindings } from "@/lib/contracts/decision-packet";
import type {
  FactKind,
  FactSummary,
} from "@/lib/contracts/household-projection";
import { isoDaysBetween } from "@/lib/format";
import { cn } from "@/lib/utils";

const STRIP_KINDS: readonly FactKind[] = [
  "income",
  "obligation",
  "essential_spending",
];

interface Day {
  on: IsoDate;
  facts: FactSummary[];
  firstShort: boolean;
  lowest: boolean;
}

/*
 * TODO(E03): a real balance line needs the backend to release daily closing
 * cash, e.g. `daily: { date: IsoDate; closing_cash: MoneyPaise }[]` in
 * CashFlowFindings (ask Amma, financial engines). Until then this strip shows
 * only released fields — dated facts and the engine's own markers — and
 * never draws or computes a running balance.
 */
function buildDays(cashFlow: CashFlowFindings, facts: FactSummary[]): Day[] {
  const days = isoDaysBetween(cashFlow.horizon.start, cashFlow.horizon.end);
  return days.map((on) => ({
    on,
    // One tick at a fact's own date; a repeating item (per day/month) is
    // marked once, where it starts, and never expanded into repeats.
    facts: facts.filter(
      (fact) => STRIP_KINDS.includes(fact.kind) && fact.effective_on === on,
    ),
    firstShort: cashFlow.first_deficit?.on === on,
    lowest: cashFlow.minimum_cash.on === on,
  }));
}

function Chip({
  tone,
  children,
}: {
  tone: "fact" | "warning" | "lowest";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        // Wraps rather than clipping: "Lowest" can sit above its amount.
        "inline-flex max-w-full flex-wrap items-center gap-x-0.5 rounded-xl border px-1.5 py-0.5 text-[0.7rem] leading-tight",
        tone === "fact" && "bg-card",
        tone === "warning" &&
          "border-warning/60 bg-warning/15 text-warning-foreground font-medium",
        tone === "lowest" && "border-negative/40 bg-card font-medium",
      )}
    >
      {children}
    </span>
  );
}

function FactAmount({ fact }: { fact: FactSummary }) {
  return fact.availability === "present" ? (
    <Money value={fact.amount} per={fact.per} className="font-medium" />
  ) : (
    <span className="italic">
      <HomeText k="cashNotKnown" />
    </span>
  );
}

/**
 * The released horizon as a strip of days: a tick for each dated released
 * fact (icon + amount, always visible), the engine's "First short" and
 * "Lowest" markers, and the agreed floor as a labelled value. Screen readers
 * get the same content as an ordered list; the visual strip is hidden from
 * them and has no focusable ticks. On narrow screens it scrolls sideways
 * inside its own box (scroll-snap), never the page.
 */
export function CashStrip({
  cashFlow,
  facts,
}: {
  cashFlow: CashFlowFindings;
  facts: FactSummary[];
}) {
  // Home renders at most one strip, so a fixed id is safe.
  const captionId = "cash-strip-caption";
  const days = buildDays(cashFlow, facts);
  if (days.length === 0) return null;
  const marked = days.filter(
    (day) => day.facts.length > 0 || day.firstShort || day.lowest,
  );

  return (
    <figure className="space-y-2">
      <figcaption
        id={captionId}
        className="text-muted-foreground flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs"
      >
        <span>
          <HomeText k="stripCaption" />{" "}
          <DateDisplay value={cashFlow.horizon.start} /> <HomeText k="to" />{" "}
          <DateDisplay value={cashFlow.horizon.end} />.
        </span>
        <span>
          <HomeText k="agreedFloor" />:{" "}
          <Money value={cashFlow.floor} className="text-foreground" />
        </span>
      </figcaption>

      {/* Focusable so keyboard users can scroll it; its content is hidden
          from assistive tech, which reads the list below instead. */}
      <div
        role="group"
        aria-labelledby={captionId}
        tabIndex={0}
        className="focus-ring snap-x snap-proximity overflow-x-auto overscroll-x-contain rounded-md"
      >
        <ol
          aria-hidden
          className="grid min-w-max auto-cols-[minmax(4.75rem,1fr)] grid-flow-col sm:min-w-full"
        >
          {days.map((day) => (
            <li
              key={day.on}
              className={cn(
                "flex snap-start flex-col gap-1.5 border-l px-1.5 pb-2 first:border-l-0",
                (day.firstShort || day.lowest) && "bg-warning/10",
              )}
            >
              <DateDisplay
                value={day.on}
                format="short"
                className="text-muted-foreground pt-1 text-[0.7rem] font-semibold tracking-wide uppercase tabular-nums"
              />
              <span className="bg-foreground/70 motion-safe:animate-strip-draw block h-px origin-left" />
              {day.firstShort && (
                <Chip tone="warning">
                  <HomeText k="stripFirstShort" />
                </Chip>
              )}
              {day.lowest && (
                <Chip tone="lowest">
                  <HomeText k="stripLowest" />{" "}
                  <Money value={cashFlow.minimum_cash.amount} />
                </Chip>
              )}
              {day.facts.map((fact) => {
                const Icon =
                  fact.kind === "income" ? ArrowDownLeft : ArrowUpRight;
                return (
                  <Chip key={fact.fact_id} tone="fact">
                    <Icon
                      className={cn(
                        "size-3 shrink-0",
                        fact.kind === "income" && "text-positive",
                      )}
                    />
                    <FactAmount fact={fact} />
                  </Chip>
                );
              })}
            </li>
          ))}
        </ol>
      </div>

      <ol className="sr-only">
        {marked.length === 0 ? (
          <li>
            <HomeText k="stripNothingDated" />
          </li>
        ) : (
          marked.map((day) => (
            <li key={day.on}>
              <DateDisplay value={day.on} />:{" "}
              {day.firstShort && (
                <>
                  <HomeText k="stripFirstShort" />.{" "}
                </>
              )}
              {day.lowest && (
                <>
                  <HomeText k="stripLowest" />{" "}
                  <Money value={cashFlow.minimum_cash.amount} />.{" "}
                </>
              )}
              {day.facts.map((fact) => (
                <span key={fact.fact_id}>
                  {fact.label},{" "}
                  <HomeText
                    k={fact.kind === "income" ? "moneyIn" : "moneyOut"}
                  />
                  , <FactAmount fact={fact} />.{" "}
                </span>
              ))}
            </li>
          ))
        )}
      </ol>
    </figure>
  );
}
