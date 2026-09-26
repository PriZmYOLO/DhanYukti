"use client";

import Link from "next/link";

import { useConsentText } from "@/components/consent/consent-text";
import { DpdpPurposeList } from "@/components/consent/dpdp-purposes";
import { PrivacyFrame } from "@/components/consent/privacy-frame";
import { buttonVariants } from "@/components/ui/button";

/** Job 2b: the itemised DPDP notice, separate from AA consent. */
export function DpdpNotice() {
  const { text } = useConsentText();
  return (
    <PrivacyFrame title={text("noticeTitle")} intro={text("noticeIntro")} back>
      <div className="space-y-6">
        <DpdpPurposeList />
        <Link
          href="/privacy/passport"
          className={buttonVariants({ variant: "outline", size: "xl" })}
        >
          {text("passportTitle")}
        </Link>
      </div>
    </PrivacyFrame>
  );
}
