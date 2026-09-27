"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { usePlanText } from "@/components/plan/plan-text";
import { DisplayModeToggle } from "@/components/onboarding/display-mode-toggle";
import { FixtureNotice } from "@/components/shell/fixture-notice";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Frame for Plan screens: honest label, wording switch, title. */
export function PlanFrame({
  title,
  intro,
  back = false,
  children,
}: {
  title: string;
  intro?: string;
  back?: boolean;
  children: ReactNode;
}) {
  const text = usePlanText();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FixtureNotice label={text("label")} description={text("labelBody")} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {back ? (
          <Link
            href="/plan"
            className={cn(
              buttonVariants({ variant: "ghost", size: "xl" }),
              "-ml-3",
            )}
          >
            <ArrowLeft aria-hidden />
            {text("planTitle")}
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
        {intro && <p className="text-muted-foreground text-pretty">{intro}</p>}
      </header>
      {children}
    </div>
  );
}
