import type { Metadata } from "next";

import { ContextScreen } from "@/components/onboarding/context-screen";

export const metadata: Metadata = { title: "About you" };

export default function ContextSetupPage() {
  return <ContextScreen />;
}
