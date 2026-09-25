import type { Metadata } from "next";

import { AreaPlaceholder } from "@/components/shell/area-placeholder";
import { getAppArea } from "@/lib/navigation";

export const metadata: Metadata = { title: getAppArea("ask").title };

export default function AskPage() {
  return <AreaPlaceholder areaId="ask" />;
}
