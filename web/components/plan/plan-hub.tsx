"use client";

import { ChevronRight, ShieldHalf } from "lucide-react";
import Link from "next/link";

import { PlanFrame } from "@/components/plan/plan-frame";
import { usePlanText } from "@/components/plan/plan-text";

export function PlanHub() {
  const text = usePlanText();
  return (
    <PlanFrame title={text("planTitle")} intro={text("planIntro")}>
      <Link
        href="/plan/insurance"
        className="bg-card hover:bg-muted/50 flex items-center gap-4 rounded-xl border p-4 transition-colors"
      >
        <ShieldHalf aria-hidden className="text-primary size-6 shrink-0" />
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block font-semibold">
            {text("planCoverCardTitle")}
          </span>
          <span className="text-muted-foreground block text-sm">
            {text("planCoverCardBody")}
          </span>
        </span>
        <ChevronRight aria-hidden className="text-muted-foreground size-5" />
      </Link>
      <p className="text-muted-foreground text-sm">{text("planOtherSoon")}</p>
    </PlanFrame>
  );
}
