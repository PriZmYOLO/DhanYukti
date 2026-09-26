import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import {
  groupSources,
  SourceBadge,
  SourceLegend,
} from "@/components/finance/source-badge";
import { HomeText } from "@/components/home/home-text";
import type {
  FactKind,
  FactSummary,
} from "@/lib/contracts/household-projection";
import { cn } from "@/lib/utils";

const UPCOMING_KINDS: readonly FactKind[] = [
  "income",
  "obligation",
  "essential_spending",
];

function Item({
  fact,
  passed,
  showSource,
}: {
  fact: FactSummary;
  passed: boolean;
  /** false when the list's legend already says where this came from. */
  showSource: boolean;
}) {
  const incoming = fact.kind === "income";
  const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
  return (
    <li className="grid grid-cols-[4.5rem_1fr] gap-3 px-1 py-3.5 sm:grid-cols-[7rem_1fr_auto] sm:items-center">
      <p className="text-muted-foreground text-xs leading-tight font-semibold tracking-wide uppercase tabular-nums">
        {passed ? (
          <span className="text-warning-foreground block text-xs font-medium">
            <HomeText k="datePassed" />
          </span>
        ) : (
          fact.per !== null &&
          fact.effective_on && (
            <span className="block text-xs">
              <HomeText k="fromDate" />
            </span>
          )
        )}
        {fact.effective_on ? (
          <DateDisplay
            value={fact.effective_on}
            className="whitespace-normal sm:whitespace-nowrap"
          />
        ) : (
          <span className="italic">
            <HomeText k="dateNotKnown" />
          </span>
        )}
      </p>
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{fact.label}</p>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1">
            <Icon aria-hidden className="size-3.5" />
            <HomeText k={incoming ? "moneyIn" : "moneyOut"} />
          </span>
          {showSource && (
            <SourceBadge
              kind={fact.source_kind}
              sourceLabel={fact.source_label}
            />
          )}
        </div>
      </div>
      <div className="col-start-2 sm:col-start-auto sm:text-right">
        {fact.availability === "present" ? (
          // Money in reads green; "Money in" is always written beside it.
          <Money
            value={fact.amount}
            per={fact.per}
            className={cn("font-semibold", incoming && "text-positive")}
          />
        ) : (
          <AvailabilityState status={fact.availability} compact />
        )}
      </div>
    </li>
  );
}

interface ComingUpProps {
  facts: FactSummary[];
  asOf: string;
  /** Released summary shown between the heading and the dated rows. */
  summary?: ReactNode;
}

const byDate = (a: FactSummary, b: FactSummary) =>
  (a.effective_on ?? "").localeCompare(b.effective_on ?? "") ||
  a.label.localeCompare(b.label);

/**
 * Money in and out from the viewer's projection: one-off items whose date
 * has passed (marked, never dropped), then current and upcoming items in date
 * order — a repeating item that started earlier is still current — then any
 * whose date isn't known. It only lists released facts; it does not total,
 * forecast or decide whether anything was paid.
 */
export function ComingUp({ facts, asOf, summary }: ComingUpProps) {
  const relevant = facts.filter((fact) => UPCOMING_KINDS.includes(fact.kind));
  const isPassed = (fact: FactSummary) =>
    fact.effective_on !== null && fact.effective_on < asOf && fact.per === null;

  const passed = relevant.filter(isPassed).sort(byDate);
  const current = relevant
    .filter((fact) => fact.effective_on !== null && !isPassed(fact))
    .sort(byDate);
  const undated = relevant.filter((fact) => fact.effective_on === null);
  const items = [
    ...passed.map((fact) => ({ fact, passed: true })),
    ...[...current, ...undated].map((fact) => ({ fact, passed: false })),
  ];
  // One legend line when the rows share a source; a row keeps its own badge
  // only if its source differs or it names a specific source.
  const sources = groupSources(items.map(({ fact }) => fact));

  return (
    <section aria-labelledby="coming-up-heading" className="space-y-5">
      <div>
        <p className="text-primary text-xs font-semibold tracking-widest uppercase">
          <HomeText k="cashFlowLabel" />
        </p>
        <h2
          id="coming-up-heading"
          className="font-heading mt-1 text-[2rem] leading-tight tracking-tight"
        >
          <HomeText k="comingUpHeading" />
        </h2>
      </div>
      {summary}
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          <HomeText k="comingUpEmpty" />
        </p>
      ) : (
        <div className="space-y-2">
          {sources.common && (
            <SourceLegend
              kind={sources.common}
              sourceLabel={sources.commonLabel}
              scope={
                !sources.uniform
                  ? "unless-marked"
                  : items.length === 1
                    ? "single"
                    : "all"
              }
            />
          )}
          <ol className="divide-y border-t border-b">
            {items.map(({ fact, passed }) => (
              <Item
                key={fact.fact_id}
                fact={fact}
                passed={passed}
                showSource={sources.differs(fact)}
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
