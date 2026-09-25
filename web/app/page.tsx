import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { ComingUp } from "@/components/home/coming-up";
import { FixtureScenarioSwitch } from "@/components/home/fixture-scenario-switch";
import { HealthCardSection } from "@/components/home/health-card";
import { HomeText } from "@/components/home/home-text";
import { HouseholdOverview } from "@/components/home/household-overview";
import { MoneyNow } from "@/components/home/money-now";
import { PriorityCard } from "@/components/home/priority-card";
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
    <div className="space-y-8">
      {view.origin === "fixture" && (
        <FixtureNotice label={view.fixture.label}>
          <FixtureScenarioSwitch fixture={view.fixture} />
        </FixtureNotice>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <p className="text-primary text-sm font-medium">{brand.descriptor}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {brand.tagline}
          </h1>
          <p className="text-muted-foreground">
            {projection && (
              <>
                <HomeText k="pictureAsOf" />{" "}
                <DateDisplay value={projection.as_of} />.{" "}
              </>
            )}
            <HomeText k="sharedOnly" />
          </p>
        </div>
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
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <MoneyNow
              facts={projection.facts}
              safeToSpend={packet?.safe_to_spend ?? null}
            />
          </div>
          <div className="lg:col-span-3">
            <ComingUp facts={projection.facts} asOf={projection.as_of} />
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

      <HealthCardSection health={health} />
      {projection && <HouseholdOverview projection={projection} />}
    </div>
  );
}
