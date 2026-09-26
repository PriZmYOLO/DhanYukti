"use client";

import {
  useOnboarding,
  useText,
} from "@/components/onboarding/onboarding-provider";
import { buttonVariants } from "@/components/ui/button";
import type { DisplayMode } from "@/lib/onboarding/copy";
import { onboardingPort } from "@/lib/provisional/h01";
import { cn } from "@/lib/utils";

/** Switches wording only. Amounts, dates and saved answers are untouched. */
export function DisplayModeToggle() {
  const { snapshot, apply } = useOnboarding();
  const text = useText();
  const current = snapshot.presentation.mode;

  async function choose(mode: DisplayMode) {
    if (mode === current) return;
    apply(await onboardingPort.setPresentation({ mode }));
  }

  const options: { mode: DisplayMode; label: string }[] = [
    { mode: "standard", label: text("modeStandard") },
    { mode: "simple", label: text("modeSimple") },
  ];

  return (
    <div
      role="group"
      aria-label={text("modeGroupLabel")}
      className="inline-flex rounded-lg border p-0.5"
    >
      {options.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={current === mode}
          onClick={() => choose(mode)}
          // 44px tall: a primary control, easy to hit on touch.
          className={cn(
            buttonVariants({
              variant: current === mode ? "secondary" : "ghost",
              size: "xl",
            }),
            "px-3.5",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
