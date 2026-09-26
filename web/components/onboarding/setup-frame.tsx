"use client";

import type { ReactNode } from "react";

import { DisplayModeToggle } from "@/components/onboarding/display-mode-toggle";
import { MembershipNote } from "@/components/onboarding/membership-note";
import { useText } from "@/components/onboarding/onboarding-provider";
import {
  PanelSlotsContext,
  usePanelSlots,
} from "@/components/onboarding/setup-panel";
import { FixtureNotice } from "@/components/shell/fixture-notice";
import type { CopyKey } from "@/lib/onboarding/copy";
import { cn } from "@/lib/utils";

export type SetupStep = "household" | "context" | "money" | "review";

const steps: { id: SetupStep; label: CopyKey; why: CopyKey }[] = [
  { id: "household", label: "stepHousehold", why: "whyHousehold" },
  { id: "context", label: "stepContext", why: "whyContext" },
  { id: "money", label: "stepMoney", why: "whyMoney" },
  { id: "review", label: "stepReview", why: "whyReview" },
];

function SetupProgress({
  current,
  vertical = false,
  className,
}: {
  current: SetupStep;
  vertical?: boolean;
  className?: string;
}) {
  const text = useText();
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <nav aria-label={text("progressLabel")} className={className}>
      <ol
        className={cn(
          "flex text-sm",
          vertical
            ? "flex-col gap-2.5"
            : "flex-wrap items-center gap-x-3 gap-y-1",
        )}
      >
        {steps.map((step, index) => (
          <li
            key={step.id}
            aria-current={step.id === current ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5",
              step.id === current
                ? "text-foreground font-medium"
                : "text-muted-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-5 place-items-center rounded-full border text-xs",
                index <= currentIndex &&
                  "border-primary bg-primary text-primary-foreground",
              )}
            >
              {index + 1}
            </span>
            {text(step.label)}
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface SetupFrameProps {
  step?: SetupStep;
  title: string;
  intro?: string;
  children: ReactNode;
}

/**
 * Common frame for every L02 screen: demo label, progress, wording switch.
 * Setup steps get a sticky side panel at ≥1280px (progress, "Why we ask
 * this", the privacy promise, a live summary); below that, one column.
 */
export function SetupFrame({ step, title, intro, children }: SetupFrameProps) {
  const text = useText();
  const { slots, whyRef, summaryRef } = usePanelSlots();

  return (
    <PanelSlotsContext.Provider value={step ? slots : null}>
      <div
        className={cn(
          "mx-auto max-w-2xl",
          step &&
            "xl:mx-0 xl:grid xl:max-w-none xl:grid-cols-[minmax(0,680px)_minmax(0,1fr)] xl:gap-x-16",
        )}
      >
        <div className="min-w-0 space-y-6">
          <FixtureNotice
            label={text("demoSessionLabel")}
            description={text("demoSessionBody")}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            {step ? (
              <SetupProgress current={step} className="xl:hidden" />
            ) : (
              <span />
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <DisplayModeToggle />
              <p className="text-muted-foreground max-w-[24ch] text-xs">
                {text("modeNote")}
              </p>
            </div>
          </div>
          <header className="space-y-2">
            <h1 className="font-heading text-3xl tracking-tight text-balance">
              {title}
            </h1>
            {intro && <p className="text-muted-foreground">{intro}</p>}
          </header>
          {children}
        </div>

        {step && (
          <div className="hidden xl:block">
            <div className="sticky top-24 space-y-4">
              <div className="bg-card rounded-xl border p-4">
                <SetupProgress current={step} vertical />
              </div>
              <section className="space-y-1.5 rounded-xl border border-dashed p-4">
                <h2 className="text-sm font-semibold">{text("whyHeading")}</h2>
                {/* A form fills this slot; the step's text shows until then. */}
                <div ref={whyRef} className="peer" />
                <p className="text-muted-foreground hidden text-sm peer-empty:block">
                  {text(steps.find(({ id }) => id === step)!.why)}
                </p>
              </section>
              <MembershipNote />
              <div ref={summaryRef} />
            </div>
          </div>
        )}
      </div>
    </PanelSlotsContext.Provider>
  );
}
