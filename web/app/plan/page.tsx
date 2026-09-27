import { ArrowRight, FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AvailabilityState } from "@/components/finance/availability-state";
import { getAppArea } from "@/lib/navigation";

export const metadata: Metadata = { title: getAppArea("plan").title };

export default function PlanPage() {
  const area = getAppArea("plan");
  const Icon = area.icon;

  return (
    <div className="max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-heading flex items-center gap-2 text-3xl tracking-tight">
          <Icon aria-hidden className="text-primary size-6" />
          {area.title}
        </h1>
        <p className="text-muted-foreground max-w-prose">{area.summary}</p>
      </header>

      <Link
        href="/plan/what-if"
        className="focus-ring bg-card hover:border-foreground/40 group flex items-start gap-4 rounded-xl border p-5 transition-colors"
      >
        <FlaskConical aria-hidden className="text-primary mt-1 size-5" />
        <span className="min-w-0 flex-1 space-y-1">
          <span className="font-heading block text-xl tracking-tight">
            What if…?
          </span>
          <span className="text-muted-foreground block text-sm">
            Try an emergency, a purchase or a goal against your plan and see the
            before and after. A preview only: your plan is unchanged. Uses
            labelled demo results.
          </span>
        </span>
        <ArrowRight
          aria-hidden
          className="text-muted-foreground mt-1 size-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>

      <AvailabilityState
        status="unavailable"
        title="The rest of Plan is not available in this build yet"
        description="The full money calendar and goal planning are not connected yet. An empty screen here does not mean you have nothing to plan."
      />
    </div>
  );
}
