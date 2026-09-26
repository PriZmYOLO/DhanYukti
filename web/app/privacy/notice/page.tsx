import type { Metadata } from "next";

import { DpdpNotice } from "@/components/consent/dpdp-notice";

export const metadata: Metadata = { title: "Your data and DhanYukti" };

export default function NoticePage() {
  return <DpdpNotice />;
}
