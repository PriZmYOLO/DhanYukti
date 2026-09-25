import type { Metadata } from "next";

import { MoneyScreen } from "@/components/onboarding/money-screen";

export const metadata: Metadata = { title: "Money details" };

export default function MoneySetupPage() {
  return <MoneyScreen />;
}
