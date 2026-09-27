"use client";

import { useCallback } from "react";

import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { resolveModeText } from "@/lib/display-mode";
import { planCopy, type PlanCopyKey } from "@/lib/plan/copy";

/** Plan wording in the current display mode. Never used for amounts. */
export function usePlanText() {
  const { snapshot } = useOnboarding();
  const mode = snapshot.presentation.mode;
  return useCallback(
    (key: PlanCopyKey) => resolveModeText(planCopy[key], mode),
    [mode],
  );
}

/** Wording for an engine code; "" if unknown. */
export function usePlanCode() {
  const text = usePlanText();
  return useCallback(
    (prefix: string, code: string) => {
      const key = `${prefix}_${code}`;
      return key in planCopy ? text(key as PlanCopyKey) : code;
    },
    [text],
  );
}
