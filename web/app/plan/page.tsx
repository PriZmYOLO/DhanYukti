import type { Metadata } from "next";

import { AreaPlaceholder } from "@/components/shell/area-placeholder";
import { getAppArea } from "@/lib/navigation";

export const metadata: Metadata = { title: getAppArea("plan").title };

export default function PlanPage() {
  return <AreaPlaceholder areaId="plan" />;
}
