"use client";

import { useCallback } from "react";

import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import {
  codeCopy,
  resolveConsentCopy,
  type ConsentCopyKey,
} from "@/lib/consent/copy";

/** L04 wording for the current display mode. Never used for amounts or dates. */
export function useConsentText() {
  const { snapshot } = useOnboarding();
  const mode = snapshot.presentation.mode;

  const text = useCallback(
    (key: ConsentCopyKey) => resolveConsentCopy(key, mode),
    [mode],
  );

  /** Wording for a backend code; an unknown code reads "Not stated". */
  const codeText = useCallback(
    (prefix: string, code: string) =>
      codeCopy(prefix, code, mode) || resolveConsentCopy("notStated", mode),
    [mode],
  );

  return { text, codeText };
}
