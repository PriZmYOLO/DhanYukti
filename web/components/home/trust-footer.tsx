import Link from "next/link";

import { PictureGate } from "@/components/correction/picture-status";
import { HouseholdOverview } from "@/components/home/household-overview";
import { BrandSeal } from "@/components/shell/brand-seal";
import { brand } from "@/lib/brand";
import type { HouseholdProjection } from "@/lib/contracts/household-projection";
import { getAppArea } from "@/lib/navigation";

/**
 * Home's closing band on the dark forest surface: the sign-off, who is in
 * the household and what is shared, where amounts come from, and Privacy.
 *
 * It cancels main's bottom padding (layout.tsx: pb-24, md:pb-12) so the band
 * reaches the bottom of the page, and keeps room for the phone tab bar.
 */
export function TrustFooter({
  projection,
}: {
  projection: HouseholdProjection | null;
}) {
  const privacy = getAppArea("privacy");

  return (
    <div className="surface-forest bleed-band -mb-24 space-y-8 pt-12 pb-[calc(3rem+4rem+env(safe-area-inset-bottom))] md:-mb-12 md:pb-14">
      <div className="flex items-center gap-3">
        <BrandSeal />
        <div>
          {/* A visual sign-off: the same words are the page's h1. */}
          <p aria-hidden className="font-heading text-2xl sm:text-3xl">
            {brand.tagline}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {brand.descriptor}
          </p>
        </div>
      </div>
      {projection && (
        <PictureGate>
          <HouseholdOverview projection={projection} />
        </PictureGate>
      )}
      <p className="text-sm">
        <Link
          href={privacy.href}
          className="focus-ring inline-flex min-h-6 items-center rounded-sm font-medium underline underline-offset-4"
        >
          {privacy.title}
        </Link>
        <span className="text-muted-foreground"> · {privacy.summary}</span>
      </p>
    </div>
  );
}
