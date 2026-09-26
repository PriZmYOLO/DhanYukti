"use client";

import { useCallback } from "react";

import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import {
  resolveCorrectionCopy,
  type CorrectionCopyKey,
} from "@/lib/correction/copy";

/** L05 wording for the current display mode. Never used for amounts or dates. */
export function useCorrectionText(): (key: CorrectionCopyKey) => string {
  const { snapshot } = useOnboarding();
  const mode = snapshot.presentation.mode;
  return useCallback(
    (key: CorrectionCopyKey) => resolveCorrectionCopy(key, mode),
    [mode],
  );
}
