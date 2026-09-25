import {
  HandCoins,
  Landmark,
  ShieldCheck,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { ConfidenceBadge } from "@/components/home/confidence-badge";
import { HomeText } from "@/components/home/home-text";
import {
  HEALTH_DOMAINS,
  type HealthCard,
  type HealthDomain,
  type HealthDomainSummary,
  type HealthStatus,
} from "@/lib/contracts/health-card";
import { cn } from "@/lib/utils";

const domainIcon: Record<HealthDomain, LucideIcon> = {
  liquidity: Wallet,
  debt: Landmark,
  income: HandCoins,
  protection: ShieldCheck,
  goals: Target,
};

const statusTone: Record<HealthStatus, string> = {
  steady: "border-primary/40 text-primary",
  watch: "border-warning/50 text-warning-foreground",
  attention: "border-warning/50 bg-warning/15 text-warning-foreground",
  not_known: "border-dashed text-muted-foreground",
  not_assessed: "border-dashed text-muted-foreground",
};

/**
 * Financial Health Card (Guide §26): one plain-language status per domain in
 * a fixed order. It never ranks domains and never shows an overall score.
 */
export function HealthCardSection({ health }: { health: HealthCard | null }) {
  // Always the same five rows; a domain the release leaves out is shown as
  // not assessed rather than silently disappearing.
  const rows: HealthDomainSummary[] =
    health && health.domains.length > 0
      ? HEALTH_DOMAINS.map(
          (domain) =>
            health.domains.find((entry) => entry.domain === domain) ?? {
              domain,
              status: "not_assessed",
              summary: null,
              confidence: { level: "not_assessed", basis: null },
            },
        )
      : [];
  // Confidence is claim-specific: when levels differ, every row shows its
  // own; when none is assessed, one note says so.
  const noneAssessed = rows.every(
    (row) => row.confidence.level === "not_assessed",
  );

  return (
    <section aria-labelledby="health-heading" className="space-y-3">
      <div className="space-y-1">
        <h2
          id="health-heading"
          className="text-lg font-semibold tracking-tight"
        >
          <HomeText k="healthHeading" />
        </h2>
        <p className="text-muted-foreground text-sm">
          <HomeText k="healthIntro" />
        </p>
      </div>

      {rows.length === 0 ? (
        <AvailabilityState
          status="unavailable"
          title={<HomeText k="healthUnavailable" />}
          description={<HomeText k="healthUnavailableBody" />}
        />
      ) : (
        <>
          <ul className="bg-card divide-y rounded-xl border">
            {rows.map((row) => {
              const Icon = domainIcon[row.domain];
              return (
                <li
                  key={row.domain}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    <Icon
                      aria-hidden
                      className="text-muted-foreground mt-0.5 size-5 shrink-0"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium">
                        <HomeText k={`domain_${row.domain}`} />
                      </p>
                      {row.summary && (
                        <p className="text-muted-foreground text-sm">
                          {row.summary}
                        </p>
                      )}
                      {!noneAssessed && row.confidence.basis && (
                        <p className="text-muted-foreground text-xs">
                          <HomeText k="confidence" />: {row.confidence.basis}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-8 sm:justify-end sm:pl-0">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                        statusTone[row.status],
                      )}
                    >
                      <HomeText k={`status_${row.status}`} />
                    </span>
                    {!noneAssessed && (
                      <ConfidenceBadge confidence={row.confidence} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-muted-foreground text-xs">
            <HomeText k="healthUnknownNote" />
            {noneAssessed && (
              <>
                {" "}
                <HomeText k="confidence" />:{" "}
                <HomeText k="confidence_not_assessed" />.
              </>
            )}
          </p>
        </>
      )}
    </section>
  );
}
