import type { Metadata } from "next";

import { PrivacyDashboard } from "@/components/consent/privacy-dashboard";
import { getAppArea } from "@/lib/navigation";

export const metadata: Metadata = { title: getAppArea("privacy").title };

export default function PrivacyPage() {
  return <PrivacyDashboard />;
}
