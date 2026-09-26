"use client";

import type { ReactNode } from "react";

import { DisplayModeToggle } from "@/components/onboarding/display-mode-toggle";
import { useText } from "@/components/onboarding/onboarding-provider";
import { FixtureNotice } from "@/components/shell/fixture-notice";
import type { CopyKey } from "@/lib/onboarding/copy";
import { cn } from "@/lib/utils";

export type SetupStep = "household" | "context" | "money" | "review";

const steps: { id: SetupStep; label: CopyKey }[] = [
  { id: "household", label: "stepHousehold" },
  { id: "context", label: "stepContext" },
  { id: "money", label: "stepMoney" },
  { id: "review", label: "stepReview" },
];

function SetupProgress({ current }: { current: SetupStep }) {
  const text = useText();
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <nav aria-label={text("progressLabel")}>
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
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

/** Common frame for every L02 screen: demo label, progress, wording switch. */
export function SetupFrame({ step, title, intro, children }: SetupFrameProps) {
  const text = useText();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FixtureNotice
        label={text("demoSessionLabel")}
        description={text("demoSessionBody")}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {step ? <SetupProgress current={step} /> : <span />}
        <DisplayModeToggle />
      </div>
      <header className="space-y-2">
        <h1 className="font-heading text-3xl tracking-tight text-balance">
          {title}
        </h1>
        {intro && <p className="text-muted-foreground">{intro}</p>}
      </header>
      {children}
    </div>
  );
}
