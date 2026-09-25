"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { MembershipNote } from "@/components/onboarding/membership-note";
import {
  useOnboarding,
  useText,
} from "@/components/onboarding/onboarding-provider";
import { SetupFrame } from "@/components/onboarding/setup-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  onboardingPort,
  type ProvisionalInviteLookup,
} from "@/lib/provisional/h01";

function InviteOutcome({ lookup }: { lookup: ProvisionalInviteLookup }) {
  const text = useText();

  switch (lookup.status) {
    case "expired":
      return (
        <AvailabilityState
          status="unavailable"
          title={text("inviteExpiredTitle")}
          description={text("inviteExpiredBody")}
        />
      );
    case "already_used":
      return (
        <AvailabilityState
          status="unavailable"
          title={text("inviteUsedTitle")}
          description={text("inviteUsedBody")}
        />
      );
    case "not_found":
      return (
        <AvailabilityState
          status="missing"
          title={text("inviteNotFoundTitle")}
          description={text("inviteNotFoundBody")}
        />
      );
    case "unavailable":
      return (
        <AvailabilityState
          status="failed"
          title={text("inviteUnavailableTitle")}
          description={lookup.reason}
        />
      );
    default:
      return null;
  }
}

function InviteResponse({ code }: { code: string }) {
  const { snapshot, apply } = useOnboarding();
  const text = useText();
  const router = useRouter();
  const [lookup, setLookup] = useState<ProvisionalInviteLookup | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptFailed, setAcceptFailed] = useState(false);
  // When accepting fails, the Accept button disappears; move focus to the
  // outcome so keyboard and screen-reader users learn what happened.
  const outcomeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (acceptFailed) outcomeRef.current?.focus();
  }, [acceptFailed]);

  useEffect(() => {
    let cancelled = false;
    onboardingPort.lookupInvite(code).then((result) => {
      if (!cancelled) setLookup(result);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (lookup === null) {
    return (
      <p role="status" className="text-muted-foreground">
        {text("inviteChecking")}
      </p>
    );
  }

  async function accept() {
    setBusy(true);
    const result = await onboardingPort.acceptInvite(code);
    if (result.ok) {
      apply(result.snapshot);
      router.push("/setup/context");
    } else {
      setLookup(result.lookup);
      setBusy(false);
      setAcceptFailed(true);
    }
  }

  const back = (
    <Link
      href="/setup/household"
      className={buttonVariants({ variant: "outline", size: "lg" })}
    >
      {text("backToHousehold")}
    </Link>
  );

  if (lookup.status !== "valid") {
    return (
      <div ref={outcomeRef} tabIndex={-1} className="space-y-4 outline-none">
        <InviteOutcome lookup={lookup} />
        {back}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {acceptFailed && (
        // The invite still looks valid but accepting failed (e.g. this
        // session already joined a household elsewhere): say so, and give
        // focus somewhere meaningful.
        <div ref={outcomeRef} tabIndex={-1} className="outline-none">
          <AvailabilityState
            status="failed"
            title={text("inviteAcceptFailedTitle")}
            description={text("inviteAcceptFailedBody")}
          >
            {back}
          </AvailabilityState>
        </div>
      )}
      <section className="bg-card space-y-4 rounded-xl border p-4 sm:p-5">
        <p className="text-muted-foreground">{text("inviteValidLead")}</p>
        <p className="text-xl font-semibold tracking-tight">
          {lookup.household_name}
        </p>
        {snapshot.membership ? (
          <AvailabilityState
            status="unavailable"
            description={text("inviteAlreadyMember")}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={accept} disabled={busy}>
              {text("acceptAction")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push("/setup/household")}
              disabled={busy}
            >
              {text("declineAction")}
            </Button>
          </div>
        )}
      </section>
      <MembershipNote />
    </div>
  );
}

export function InviteScreen({ code }: { code: string }) {
  const { ready, snapshot } = useOnboarding();
  const text = useText();

  return (
    <SetupFrame step="household" title={text("inviteHeading")}>
      {!ready ? (
        <p role="status" className="text-muted-foreground">
          {text("loading")}
        </p>
      ) : !snapshot.session ? (
        <AvailabilityState
          status="missing"
          title={text("needSessionTitle")}
          description={text("inviteSignInFirst")}
        >
          <Link
            href={`/welcome?next=${encodeURIComponent(`/invite/${code}`)}`}
            className={buttonVariants({ size: "sm" })}
          >
            {text("needSessionAction")}
          </Link>
        </AvailabilityState>
      ) : (
        <InviteResponse code={code} />
      )}
    </SetupFrame>
  );
}
