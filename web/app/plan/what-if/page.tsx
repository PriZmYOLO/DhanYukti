import type { Metadata } from "next";

import { WhatIfScreen } from "@/components/what-if/what-if-screen";

export const metadata: Metadata = { title: "What if…?" };

export default function WhatIfPage() {
  return <WhatIfScreen />;
}
