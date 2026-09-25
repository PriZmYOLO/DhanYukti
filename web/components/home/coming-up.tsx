import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { SourceBadge } from "@/components/finance/source-badge";
import { HomeText } from "@/components/home/home-text";
import type {
  FactKind,
  FactSummary,
} from "@/lib/contracts/household-projection";

const UPCOMING_KINDS: readonly FactKind[] = [
  "income",
  "obligation",
  "essential_spending",
];

function Item({ fact, passed }: { fact: FactSummary; passed: boolean }) {
  const incoming = fact.kind === "income";
  const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
  return (
    <li className="grid grid-cols-[4.5rem_1fr] gap-3 p-3 sm:grid-cols-[6.5rem_1fr_auto] sm:items-center">
      <p className="text-muted-foreground text-sm leading-tight">
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
          <SourceBadge
            kind={fact.source_kind}
            sourceLabel={fact.source_label}
          />
        </div>
      </div>
      <div className="col-start-2 sm:col-start-auto sm:text-right">
        {fact.availability === "present" ? (
          <Money value={fact.amount} per={fact.per} />
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
export function ComingUp({ facts, asOf }: ComingUpProps) {
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

  return (
    <section aria-labelledby="coming-up-heading" className="space-y-3">
      <h2
        id="coming-up-heading"
        className="text-lg font-semibold tracking-tight"
      >
        <HomeText k="comingUpHeading" />
      </h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          <HomeText k="comingUpEmpty" />
        </p>
      ) : (
        <ol className="bg-card divide-y rounded-xl border">
          {items.map(({ fact, passed }) => (
            <Item key={fact.fact_id} fact={fact} passed={passed} />
          ))}
        </ol>
      )}
    </section>
  );
}
