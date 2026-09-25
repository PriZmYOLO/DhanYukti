import type { Metadata } from "next";

import { AreaPlaceholder } from "@/components/shell/area-placeholder";
import { getAppArea } from "@/lib/navigation";

export const metadata: Metadata = { title: getAppArea("privacy").title };

export default function PrivacyPage() {
  return <AreaPlaceholder areaId="privacy" />;
}
