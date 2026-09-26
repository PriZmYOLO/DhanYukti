import type { Metadata } from "next";

import { ReportRecommendationScreen } from "@/components/consent/feedback-forms";

export const metadata: Metadata = { title: "Report a recommendation" };

export default function ReportRecommendationPage() {
  return <ReportRecommendationScreen />;
}
