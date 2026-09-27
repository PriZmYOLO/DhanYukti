import type { Metadata } from "next";

import { CoverCheck } from "@/components/plan/cover-check";

export const metadata: Metadata = { title: "Family cover check" };

export default function InsurancePlanPage() {
  return <CoverCheck />;
}
