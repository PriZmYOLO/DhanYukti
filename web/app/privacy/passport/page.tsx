import type { Metadata } from "next";

import { ConsentPassport } from "@/components/consent/consent-passport";

export const metadata: Metadata = { title: "Consent Passport" };

export default function PassportPage() {
  return <ConsentPassport />;
}
