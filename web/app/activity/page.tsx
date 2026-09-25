import type { Metadata } from "next";

import { AreaPlaceholder } from "@/components/shell/area-placeholder";
import { getAppArea } from "@/lib/navigation";

export const metadata: Metadata = { title: getAppArea("activity").title };

export default function ActivityPage() {
  return <AreaPlaceholder areaId="activity" />;
}
