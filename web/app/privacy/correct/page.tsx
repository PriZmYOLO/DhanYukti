import type { Metadata } from "next";

import { CorrectFactScreen } from "@/components/consent/feedback-forms";

export const metadata: Metadata = { title: "Correct a fact" };

export default function CorrectFactPage() {
  return <CorrectFactScreen />;
}
