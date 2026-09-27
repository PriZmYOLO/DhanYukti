import type { Metadata } from "next";

import { PlanHub } from "@/components/plan/plan-hub";
import { getAppArea } from "@/lib/navigation";

export const metadata: Metadata = { title: getAppArea("plan").title };

export default function PlanPage() {
  return <PlanHub />;
}
