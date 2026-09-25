import type { Metadata } from "next";

import { ReviewScreen } from "@/components/onboarding/review-screen";

export const metadata: Metadata = { title: "Review" };

export default function ReviewSetupPage() {
  return <ReviewScreen />;
}
