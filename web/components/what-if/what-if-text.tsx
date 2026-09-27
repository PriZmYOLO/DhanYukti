"use client";

import { useCallback } from "react";

import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { resolveWhatIfCopy, type WhatIfCopyKey } from "@/lib/what-if/copy";

/** What-if wording for the current display mode. Never used for amounts. */
export function useWhatIfText(): (key: WhatIfCopyKey) => string {
  const { snapshot } = useOnboarding();
  const mode = snapshot.presentation.mode;
  return useCallback(
    (key: WhatIfCopyKey) => resolveWhatIfCopy(key, mode),
    [mode],
  );
}
