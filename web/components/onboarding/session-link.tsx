"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";

import {
  useOnboarding,
  useText,
} from "@/components/onboarding/onboarding-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Header entry to sign-in, or to the current DEMO session's setup. */
export function SessionLink() {
  const { ready, snapshot } = useOnboarding();
  const text = useText();

  if (!ready) return null;

  const signedIn = snapshot.session !== null;
  return (
    <Link
      href={signedIn ? "/setup/review" : "/welcome"}
      className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "px-2")}
    >
      <UserRound aria-hidden />
      {/* Label hidden between md and lg so the header nav fits. */}
      <span className="md:sr-only lg:not-sr-only">
        {signedIn ? text("demoLinkSession") : text("demoLinkSignIn")}
      </span>
    </Link>
  );
}
