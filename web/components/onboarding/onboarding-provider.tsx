"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { resolveCopy, type CopyKey } from "@/lib/onboarding/copy";
import { onboardingPort, type OnboardingSnapshot } from "@/lib/provisional/h01";

interface OnboardingContextValue {
  /** false until the port has loaded this tab's state. */
  ready: boolean;
  snapshot: OnboardingSnapshot;
  /** Apply the snapshot returned by any port operation. */
  apply: (next: OnboardingSnapshot) => void;
}

const INITIAL_SNAPSHOT: OnboardingSnapshot = {
  session: null,
  membership: null,
  members: [],
  context: null,
  money: null,
  presentation: { mode: "standard" },
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);

  useEffect(() => {
    let cancelled = false;
    onboardingPort.loadSnapshot().then((loaded) => {
      if (cancelled) return;
      setSnapshot(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback((next: OnboardingSnapshot) => {
    setSnapshot(next);
  }, []);

  const value = useMemo(
    () => ({ ready, snapshot, apply }),
    [ready, snapshot, apply],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) {
    throw new Error("useOnboarding must be used inside OnboardingProvider.");
  }
  return value;
}

/** Wording for the current display mode. Never used for amounts or dates. */
export function useText(): (key: CopyKey) => string {
  const { snapshot } = useOnboarding();
  const mode = snapshot.presentation.mode;
  return useCallback((key: CopyKey) => resolveCopy(key, mode), [mode]);
}
