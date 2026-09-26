import {
  CircleCheck,
  CircleDashed,
  Eye,
  HandCoins,
  Landmark,
  ShieldCheck,
  Target,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { ConfidenceBadge } from "@/components/home/confidence-badge";
import { HomeText } from "@/components/home/home-text";
import { PRIORITY_MISSING_ID } from "@/components/home/priority-card";
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

// Every status has a word and an icon; colour is never the only signal.
const statusIcon: Record<HealthStatus, LucideIcon> = {
  steady: CircleCheck,
  watch: Eye,
  attention: TriangleAlert,
  not_known: CircleDashed,
  not_assessed: CircleDashed,
};

const statusTone: Record<HealthStatus, string> = {
  steady: "border-primary/40 text-primary",
  watch: "border-warning/50 text-warning-foreground",
  attention: "border-warning/50 bg-warning/15 text-warning-foreground",
  not_known: "border-dashed text-muted-foreground",
  not_assessed: "border-dashed text-muted-foreground",
};

const isGap = (row: HealthDomainSummary) =>
  row.status === "not_known" || row.status === "not_assessed";

function StatusWord({ status }: { status: HealthStatus }) {
  const Icon = statusIcon[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        statusTone[status],
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <HomeText k={`status_${status}`} />
    </span>
  );
}

function DomainRow({
  row,
  showConfidence,
}: {
  row: HealthDomainSummary;
  showConfidence: boolean;
}) {
  const Icon = domainIcon[row.domain];
  return (
    <li className="flex flex-col gap-2 px-1 py-3.5 sm:flex-row sm:items-start sm:gap-4">
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
            <p className="text-muted-foreground text-sm">{row.summary}</p>
          )}
          {showConfidence && row.confidence.basis && (
            <p className="text-muted-foreground text-xs">
              <HomeText k="confidence" />: {row.confidence.basis}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-8 sm:justify-end sm:pl-0">
        <StatusWord status={row.status} />
        {showConfidence && <ConfidenceBadge confidence={row.confidence} />}
      </div>
    </li>
  );
}

/**
 * Financial Health Card (Guide §26): one plain-language status per domain,
 * in a fixed order. Areas with a known status form the ledger; areas that are
 * not known or not assessed move to "Help us fill the gaps" — still shown,
 * never dropped. It never ranks domains and never shows an overall score.
 * The priority's missing facts are not repeated here; when there are any, one
 * line links back to them.
 */
export function HealthCardSection({
  health,
  missingAbove = 0,
}: {
  health: HealthCard | null;
  /** How many missing facts the priority lists above (for the link line). */
  missingAbove?: number;
}) {
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
  const known = rows.filter((row) => !isGap(row));
  const gaps = rows.filter(isGap);

  return (
    <section aria-labelledby="health-heading" className="space-y-6">
      <div className="space-y-1 lg:flex lg:items-end lg:justify-between lg:gap-8">
        <h2
          id="health-heading"
          className="font-heading text-[2rem] leading-tight tracking-tight"
        >
          <HomeText k="healthHeading" />
        </h2>
        <p className="text-muted-foreground text-sm lg:max-w-sm lg:text-right">
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
          <div
            className={cn(
              "grid gap-8",
              // Same 5/7 split as Money right now / Coming up above.
              known.length > 0 &&
                gaps.length > 0 &&
                "lg:grid-cols-12 lg:gap-12",
            )}
          >
            {known.length > 0 && (
              <ul className="border-foreground divide-y self-start border-t-[1.5px] border-b lg:col-span-5">
                {known.map((row) => (
                  <DomainRow
                    key={row.domain}
                    row={row}
                    showConfidence={!noneAssessed}
                  />
                ))}
              </ul>
            )}

            {gaps.length > 0 && (
              <div className="space-y-3 lg:col-span-7">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <CircleDashed aria-hidden className="size-4" />
                  <HomeText k="healthGapsHeading" />
                </h3>
                {missingAbove > 0 && (
                  <p className="text-sm">
                    <a
                      href={`#${PRIORITY_MISSING_ID}`}
                      className="text-primary focus-ring inline-flex min-h-6 items-center rounded-sm font-medium underline underline-offset-4"
                    >
                      {missingAbove === 1 ? (
                        <HomeText k="questionsAboveOne" />
                      ) : (
                        <>
                          {missingAbove} <HomeText k="questionsAboveMany" />
                        </>
                      )}
                    </a>
                  </p>
                )}
                <ul className="border-muted-foreground/50 divide-y border-t border-b border-dashed">
                  {gaps.map((row) => (
                    <DomainRow
                      key={row.domain}
                      row={row}
                      showConfidence={!noneAssessed}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="text-muted-foreground max-w-[70ch] text-xs">
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
