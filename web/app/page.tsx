import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { CashStrip } from "@/components/home/cash-strip";
import { ComingUp } from "@/components/home/coming-up";
import { FixtureScenarioSwitch } from "@/components/home/fixture-scenario-switch";
import { HealthCardSection } from "@/components/home/health-card";
import { HomeText } from "@/components/home/home-text";
import { MoneyNow } from "@/components/home/money-now";
import { CashFlowFigures, PriorityCard } from "@/components/home/priority-card";
import { TrustFooter } from "@/components/home/trust-footer";
import { DisplayModeToggle } from "@/components/onboarding/display-mode-toggle";
import { FixtureNotice } from "@/components/shell/fixture-notice";
import { brand } from "@/lib/brand";
import { loadHomeView } from "@/lib/data/home";
import { resolveEvidence } from "@/lib/home/evidence";

export default async function Home(props: PageProps<"/">) {
  const { scenario } = await props.searchParams;
  const view = await loadHomeView({ fixtureScenario: scenario });
  const { decision, health } = view;

  const projection =
    view.projection.status === "released" ? view.projection.projection : null;
  const packet = decision.status === "released" ? decision.packet : null;
  const need =
    packet?.priority.status === "released" ? packet.priority.need : null;
  const evidence = projection
    ? resolveEvidence(
        projection.facts,
        need?.evidence_refs ?? [],
        packet?.consequence?.evidence_refs ?? [],
      )
    : [];
  const isUiPreview =
    view.origin === "fixture" && view.fixture.scenario.is_ui_preview;

  return (
    <div className="space-y-6 lg:space-y-8">
      {view.origin === "fixture" && (
        <FixtureNotice label={view.fixture.label} compact>
          <FixtureScenarioSwitch fixture={view.fixture} />
        </FixtureNotice>
      )}

      {/* The tagline stays the page's h1; it is shown as the sign-off. */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="sr-only">{brand.tagline}</h1>
        <p className="text-muted-foreground max-w-2xl text-xs sm:text-sm">
          {projection && (
            <>
              <HomeText k="pictureAsOf" />{" "}
              <DateDisplay value={projection.as_of} />.{" "}
            </>
          )}
          <HomeText k="sharedOnly" />
        </p>
        <DisplayModeToggle />
      </header>

      {view.partially_unreadable && (
        <AvailabilityState
          status="partial"
          title={<HomeText k="partlyUnreadableTitle" />}
          description={<HomeText k="partlyUnreadableBody" />}
        />
      )}

      <PriorityCard
        decision={decision}
        evidence={evidence}
        isUiPreview={isUiPreview}
      />

      {projection ? (
        <div className="grid gap-10 pt-6 lg:grid-cols-12 lg:gap-12 lg:pt-10">
          <div className="min-w-0 lg:col-span-5">
            <MoneyNow
              facts={projection.facts}
              safeToSpend={packet?.safe_to_spend ?? null}
            />
          </div>
          {/* min-w-0 keeps the strip's sideways scroll inside this column. */}
          <div className="min-w-0 lg:col-span-7">
            <ComingUp
              facts={projection.facts}
              asOf={projection.as_of}
              summary={
                need?.cash_flow && (
                  <>
                    <CashFlowFigures
                      cashFlow={need.cash_flow}
                      consequence={packet?.consequence ?? null}
                    />
                    <CashStrip
                      cashFlow={need.cash_flow}
                      facts={projection.facts}
                    />
                  </>
                )
              }
            />
          </div>
        </div>
      ) : (
        <AvailabilityState
          status="failed"
          title={<HomeText k="pictureUnavailableTitle" />}
          description={
            view.projection.status === "unavailable"
              ? view.projection.reason
              : undefined
          }
          error={
            view.projection.status === "unavailable"
              ? (view.projection.error ?? undefined)
              : undefined
          }
        />
      )}

      {/* Two full-width bands that meet without a gap. */}
      <div className="pt-10 lg:pt-12">
        <div className="bg-card bleed-band py-12 [--band-color:var(--card)]">
          <HealthCardSection
            health={health}
            missingAbove={packet?.missing_facts.length ?? 0}
          />
        </div>
        <TrustFooter projection={projection} />
      </div>
    </div>
  );
}
