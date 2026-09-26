import Link from "next/link";

import type { HomeFixtureInfo } from "@/lib/data/home";
import { cn } from "@/lib/utils";

/**
 * Switches between labelled fixture scenarios. Rendered only while Home runs
 * on fixture data; it disappears once the backend is connected.
 */
export function FixtureScenarioSwitch({
  fixture,
}: {
  fixture: HomeFixtureInfo;
}) {
  return (
    <div className="space-y-1.5 pt-1.5">
      {fixture.scenario.description && (
        <p className="font-medium">{fixture.scenario.description}</p>
      )}
      <nav aria-label="Demo scenarios">
        <ul className="flex flex-wrap gap-1.5">
          {fixture.scenarios.map((scenario) => {
            const active = scenario.id === fixture.scenario.id;
            return (
              <li key={scenario.id}>
                <Link
                  href={
                    scenario.id === "baseline"
                      ? "/"
                      : `/?scenario=${scenario.id}`
                  }
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring inline-flex min-h-11 items-center rounded-full border px-3.5 text-xs",
                    active
                      ? "border-warning-foreground/40 bg-warning-foreground text-background font-medium"
                      : "border-warning/60 hover:bg-warning/20",
                  )}
                >
                  {scenario.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
