"use client";

import { useCallback } from "react";

import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { resolveHomeCopy, type HomeCopyKey } from "@/lib/home/copy";

/** Home wording for the current display mode. Never used for amounts. */
export function useHomeText(): (key: HomeCopyKey) => string {
  const { snapshot } = useOnboarding();
  const mode = snapshot.presentation.mode;
  return useCallback((key: HomeCopyKey) => resolveHomeCopy(key, mode), [mode]);
}

/**
 * Wording leaf so server-rendered Home sections can follow the display mode.
 * The server renders "standard"; a saved "simple" preference applies after
 * the browser loads it.
 */
export function HomeText({ k }: { k: HomeCopyKey }) {
  const text = useHomeText();
  return <>{text(k)}</>;
}
