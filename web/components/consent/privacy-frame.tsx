"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useConsentText } from "@/components/consent/consent-text";
import { DisplayModeToggle } from "@/components/onboarding/display-mode-toggle";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { FixtureNotice } from "@/components/shell/fixture-notice";
import { buttonVariants } from "@/components/ui/button";
import { AA_CONNECTED } from "@/lib/capabilities";
import { cn } from "@/lib/utils";

interface PrivacyFrameProps {
  title: string;
  intro?: string;
  /** Show a link back to /privacy (sub-routes). */
  back?: boolean;
  children: ReactNode;
}

/**
 * Common frame for every L04 screen: demo label, wording switch, title and a
 * session gate. Without a demo session it shows the title, one line and a
 * way to start one that returns here — never a blank page or an error.
 * The gate is a demo step guard, NOT access control (that is the backend's).
 */
export function PrivacyFrame({
  title,
  intro,
  back = false,
  children,
}: PrivacyFrameProps) {
  const { ready, snapshot } = useOnboarding();
  const { text } = useConsentText();
  const pathname = usePathname();
  const signedIn = ready && snapshot.session !== null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {AA_CONNECTED ? (
        <FixtureNotice
          label={text("liveLabel")}
          description={text("liveBody")}
        />
      ) : (
        <FixtureNotice
          label={text("demoLabel")}
          description={text("demoBody")}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {back ? (
          <Link
            href="/privacy"
            className={cn(
              buttonVariants({ variant: "ghost", size: "xl" }),
              "-ml-3",
            )}
          >
            <ArrowLeft aria-hidden />
            {text("backToPrivacy")}
          </Link>
        ) : (
          <span />
        )}
        <DisplayModeToggle />
      </div>
      <header className="space-y-2">
        <h1 className="font-heading text-3xl tracking-tight text-balance">
          {title}
        </h1>
        {intro && signedIn && (
          <p className="text-muted-foreground text-pretty">{intro}</p>
        )}
      </header>

      {!ready ? (
        <p role="status" className="text-muted-foreground">
          {text("loading")}
        </p>
      ) : !signedIn ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">{text("noSessionBody")}</p>
          <Link
            href={`/welcome?next=${encodeURIComponent(pathname)}`}
            className={buttonVariants({ size: "xl" })}
          >
            {text("noSessionAction")}
          </Link>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
