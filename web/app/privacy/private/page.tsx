import type { Metadata } from "next";

import { PrivateViewScreen } from "@/components/consent/private-view";

export const metadata: Metadata = { title: "Only you can see this" };

export default function PrivateViewPage() {
  return <PrivateViewScreen />;
}
