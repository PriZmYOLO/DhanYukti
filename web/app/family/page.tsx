import type { Metadata } from "next";

import { AreaPlaceholder } from "@/components/shell/area-placeholder";
import { getAppArea } from "@/lib/navigation";

export const metadata: Metadata = { title: getAppArea("family").title };

export default function FamilyPage() {
  return <AreaPlaceholder areaId="family" />;
}
