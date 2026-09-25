/**
 * PROVISIONAL wiring. L02 screens depend only on `onboardingPort`.
 *
 * When H01/H02 are delivered, implement OnboardingPort against the real
 * contract and export it here instead of the demo adapter.
 */
import { demoOnboardingAdapter } from "@/lib/provisional/h01/demo-adapter";
import type { OnboardingPort } from "@/lib/provisional/h01/port";

export const onboardingPort: OnboardingPort = demoOnboardingAdapter;

export type { OnboardingPort } from "@/lib/provisional/h01/port";
export type * from "@/lib/provisional/h01/types";
