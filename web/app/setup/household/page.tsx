import type { Metadata } from "next";

import { HouseholdScreen } from "@/components/onboarding/household-screen";

export const metadata: Metadata = { title: "Household setup" };

export default function HouseholdSetupPage() {
  return <HouseholdScreen />;
}
