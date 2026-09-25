"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import {
  useOnboarding,
  useText,
} from "@/components/onboarding/onboarding-provider";
import { buttonVariants } from "@/components/ui/button";

interface RequireSessionProps {
  needsHousehold?: boolean;
  children: ReactNode;
}

/**
 * Screen-level step guard for the demo flow. This is NOT access control:
 * real authorisation is enforced by the backend (H02/H03).
 */
export function RequireSession({
  needsHousehold = false,
  children,
}: RequireSessionProps) {
  const { ready, snapshot } = useOnboarding();
  const text = useText();

  if (!ready) {
    return (
      <p role="status" className="text-muted-foreground">
        {text("loading")}
      </p>
    );
  }

  if (!snapshot.session) {
    return (
      <AvailabilityState
        status="missing"
        title={text("needSessionTitle")}
        description={text("needSessionBody")}
      >
        <Link href="/welcome" className={buttonVariants({ size: "sm" })}>
          {text("needSessionAction")}
        </Link>
      </AvailabilityState>
    );
  }

  if (needsHousehold && !snapshot.membership) {
    return (
      <AvailabilityState status="missing" title={text("needHouseholdTitle")}>
        <Link
          href="/setup/household"
          className={buttonVariants({ size: "sm" })}
        >
          {text("needHouseholdAction")}
        </Link>
      </AvailabilityState>
    );
  }

  return children;
}
