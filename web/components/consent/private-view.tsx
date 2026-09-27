"use client";

import { BellRing, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useConsentText } from "@/components/consent/consent-text";
import { PrivacyFrame } from "@/components/consent/privacy-frame";
import { useCorrectionText } from "@/components/correction/correction-text";
import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { SourceBadge } from "@/components/finance/source-badge";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { buttonVariants } from "@/components/ui/button";
import { privateViewPort, type OwnPrivateView } from "@/lib/provisional/h03";

/**
 * The signed-in member's own private items (L05). The port returns them to
 * this member only; nothing here is part of Home or any household figure.
 */
function OwnView() {
  const text = useCorrectionText();
  const { text: consentText } = useConsentText();
  const { snapshot } = useOnboarding();
  const memberId = snapshot.session?.member_id ?? null;
  const [loaded, setLoaded] = useState<{
    memberId: string | null;
    view: OwnPrivateView;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    privateViewPort.getOwnPrivateView().then((view) => {
      if (!cancelled) setLoaded({ memberId, view });
    });
    return () => {
      cancelled = true;
    };
  }, [memberId, snapshot.membership]);

  // Never show a view loaded for a different member.
  const view = loaded?.memberId === memberId ? loaded.view : null;

  if (!view) {
    return (
      <p role="status" className="text-muted-foreground">
        {consentText("loading")}
      </p>
    );
  }

  if (view.status === "no_household") {
    return (
      <div className="space-y-4">
        <AvailabilityState
          status="missing"
          title={text("noHouseholdTitle")}
          description={text("noHouseholdBody")}
        />
        <Link
          href="/setup/household"
          className={buttonVariants({ size: "xl" })}
        >
          {text("noHouseholdAction")}
        </Link>
      </div>
    );
  }

  if (view.status === "unavailable") {
    return (
      <AvailabilityState
        status="unavailable"
        title={text("privateUnavailableTitle")}
        description={view.reason}
      />
    );
  }

  return (
    <div className="space-y-8" data-private-view>
      {view.is_demo && (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <LockKeyhole aria-hidden className="size-3.5 shrink-0" />
          {text("privateDemo")}
        </p>
      )}

      <section aria-labelledby="holdings-heading" className="space-y-3">
        <h2 id="holdings-heading" className="text-lg font-semibold">
          {text("holdingsHeading")}
        </h2>
        {view.holdings.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {text("holdingsEmpty")}
          </p>
        ) : (
          <ul className="bg-card divide-y rounded-xl border">
            {view.holdings.map((holding) => (
              <li key={holding.holding_id} className="space-y-1.5 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-medium">{holding.label}</span>
                  <Money value={holding.amount} className="text-lg" />
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                  <SourceBadge
                    kind={holding.source_kind}
                    sourceLabel={holding.source_label}
                    asOf={holding.as_of}
                  />
                  <span>{text("notCounted")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="nudges-heading" className="space-y-3">
        <h2 id="nudges-heading" className="text-lg font-semibold">
          {text("nudgesHeading")}
        </h2>
        {view.nudges.length === 0 ? (
          <p className="text-muted-foreground text-sm">{text("nudgesEmpty")}</p>
        ) : (
          <ul className="space-y-3">
            {view.nudges.map((nudge) => (
              <li
                key={nudge.nudge_id}
                className="bg-card flex gap-3 rounded-xl border p-4"
              >
                <BellRing
                  aria-hidden
                  className="text-primary mt-0.5 size-5 shrink-0"
                />
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold">{nudge.title}</p>
                  {nudge.due_on && (
                    <p className="text-sm">
                      {text("nudgeBy")} <DateDisplay value={nudge.due_on} />
                    </p>
                  )}
                  <p className="text-muted-foreground text-sm">{nudge.body}</p>
                  {nudge.is_ui_preview && (
                    <p className="text-warning-foreground text-xs font-medium">
                      {text("nudgePreview")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function PrivateViewScreen() {
  const text = useCorrectionText();
  return (
    <PrivacyFrame
      title={text("privateTitle")}
      intro={text("privateIntro")}
      back
    >
      <OwnView />
    </PrivacyFrame>
  );
}
