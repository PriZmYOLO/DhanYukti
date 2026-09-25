import type { ReactNode } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { SourceBadge } from "@/components/finance/source-badge";
import { HomeText } from "@/components/home/home-text";
import type { SafeToSpendRelease } from "@/lib/contracts/decision-packet";
import type { FactSummary } from "@/lib/contracts/household-projection";

/** A ruled figure block: a strong rule above, no box. */
function Tile({ children, label }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="border-foreground space-y-2 border-t-[1.5px] pt-3.5">
      <p className="text-muted-foreground text-sm">{label}</p>
      {children}
    </div>
  );
}

function SafeToSpend({ release }: { release: SafeToSpendRelease | null }) {
  if (release === null) {
    return <AvailabilityState status="unavailable" compact />;
  }

  switch (release.status) {
    case "released":
      return (
        <div className="space-y-1">
          <p>
            <Money
              value={release.amount}
              className="text-[2rem] leading-tight tracking-tight"
            />
          </p>
          <p className="text-muted-foreground text-xs">
            <HomeText k="safeUntil" />{" "}
            <DateDisplay value={release.horizon.end} />
            . <HomeText k="safeKeepsFloor" /> <Money value={release.floor} />.
          </p>
          {release.limitations.length > 0 && (
            <ul className="text-muted-foreground list-disc pl-4 text-xs">
              {release.limitations.map((limitation, index) => (
                <li key={index}>{limitation}</li>
              ))}
            </ul>
          )}
        </div>
      );
    case "insufficient_evidence":
      return (
        <div className="space-y-1">
          <p className="text-lg font-medium">
            <HomeText k="safeInsufficient" />
          </p>
          <p className="text-muted-foreground text-xs">{release.reason}</p>
        </div>
      );
    case "not_released":
      return (
        <div className="space-y-1">
          <p className="text-muted-foreground text-lg font-medium">
            <HomeText k="safeNotReleased" />
          </p>
          <p className="text-muted-foreground text-xs">{release.reason}</p>
        </div>
      );
  }
}

interface MoneyNowProps {
  facts: FactSummary[];
  /** null when no decision could be released. */
  safeToSpend: SafeToSpendRelease | null;
}

/**
 * Cash as recorded and safe-to-spend as released (Guide §12, §26). Several
 * cash facts are listed separately; the frontend never adds them up.
 */
export function MoneyNow({ facts, safeToSpend }: MoneyNowProps) {
  const cashFacts = facts.filter((fact) => fact.kind === "cash_balance");

  return (
    <section aria-labelledby="money-now-heading" className="space-y-4">
      <h2
        id="money-now-heading"
        className="font-heading text-2xl tracking-tight"
      >
        <HomeText k="moneyNowHeading" />
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        <Tile label={<HomeText k="cashAvailable" />}>
          {cashFacts.length === 0 ? (
            <AvailabilityState
              status="missing"
              compact
              title={<HomeText k="cashNotKnown" />}
            />
          ) : (
            <ul className="space-y-3">
              {cashFacts.map((fact) => (
                <li key={fact.fact_id} className="space-y-1.5">
                  {fact.availability === "present" ? (
                    <p>
                      <Money
                        value={fact.amount}
                        className="text-[2rem] leading-tight tracking-tight"
                      />
                    </p>
                  ) : (
                    <AvailabilityState status={fact.availability} compact />
                  )}
                  <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                    <span>
                      <HomeText k="asOf" />{" "}
                      <DateDisplay value={fact.effective_on} />
                    </span>
                    <SourceBadge
                      kind={fact.source_kind}
                      sourceLabel={fact.source_label}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tile>
        <Tile label={<HomeText k="safeToSpend" />}>
          <SafeToSpend release={safeToSpend} />
        </Tile>
      </div>
    </section>
  );
}
