"use client";

import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { useRef, type ReactNode } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { SourceBadge } from "@/components/finance/source-badge";
import { ConfidenceBadge } from "@/components/home/confidence-badge";
import { useHomeText } from "@/components/home/home-text";
import { MissingFactsList } from "@/components/home/missing-facts";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { WhyView } from "@/lib/home/why-view";

function WhySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-foreground text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/**
 * The "Why" drawer (Guide §21, §26): reasons, method, assumptions, the data
 * used, what is unknown and how sure the result is — all as released. It
 * receives a server-built WhyView containing only what it renders.
 */
export function WhySheet({ view }: { view: WhyView }) {
  const text = useHomeText();
  // Open at the top: focus the title rather than the first link, which
  // sits at the end of a long explanation.
  const titleRef = useRef<HTMLHeadingElement>(null);

  const reversibility =
    view.step?.reversible === true
      ? text("reversible")
      : view.step?.reversible === false
        ? text("irreversible")
        : text("reversibilityUnknown");

  return (
    <Sheet>
      <SheetTrigger
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        <CircleHelp aria-hidden />
        {text("whyButton")}
      </SheetTrigger>
      <SheetContent
        side="right"
        initialFocus={titleRef}
        className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="border-b pr-12">
          <SheetTitle
            ref={titleRef}
            tabIndex={-1}
            className="text-lg font-semibold outline-none"
          >
            {text("whyTitle")}
          </SheetTitle>
          <SheetDescription>{view.title}</SheetDescription>
        </SheetHeader>

        <div data-why-body className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 p-4 text-sm">
            {view.reasons.length > 0 && (
              <WhySection title={text("whyReasons")}>
                <ul className="list-disc space-y-1 pl-5">
                  {view.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </WhySection>
            )}

            {(view.formula || view.horizon) && (
              <WhySection title={text("whyHow")}>
                {view.formula && <p>{view.formula}</p>}
                {view.horizon && (
                  <p className="text-muted-foreground">
                    {text("lookingAhead")}{" "}
                    <DateDisplay value={view.horizon.start} /> {text("to")}{" "}
                    <DateDisplay value={view.horizon.end} />.
                  </p>
                )}
              </WhySection>
            )}

            {view.assumptions.length > 0 && (
              <WhySection title={text("whyAssumptions")}>
                <ul className="list-disc space-y-1 pl-5">
                  {view.assumptions.map((assumption, index) => (
                    <li key={index}>{assumption}</li>
                  ))}
                </ul>
              </WhySection>
            )}

            {view.evidence.length > 0 && (
              <WhySection
                title={`${text("whyData")} (${view.evidence.length})`}
              >
                <ul className="divide-y rounded-lg border">
                  {view.evidence.map((fact, index) => (
                    <li key={index} className="space-y-1.5 p-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{fact.label}</span>
                        {fact.availability === "present" ? (
                          <Money value={fact.amount} per={fact.per} />
                        ) : (
                          <AvailabilityState
                            status={fact.availability}
                            compact
                          />
                        )}
                      </div>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                        <DateDisplay value={fact.effective_on} />
                        <SourceBadge
                          kind={fact.source_kind}
                          sourceLabel={fact.source_label}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </WhySection>
            )}

            {view.missing.length > 0 && (
              <WhySection title={text("missingHeading")}>
                <MissingFactsList facts={view.missing} />
              </WhySection>
            )}

            <WhySection title={text("whyStep")}>
              {view.step ? (
                <div className="space-y-1">
                  <p className="font-medium">{view.step.title}</p>
                  {view.step.reversible === false ? (
                    <>
                      <p className="text-muted-foreground">
                        {text(`gate_${view.step.gate}`)}
                      </p>
                      <p className="border-warning/60 bg-warning/15 text-warning-foreground rounded-lg border px-3 py-2 font-semibold">
                        {reversibility}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      {text(`gate_${view.step.gate}`)} · {reversibility}
                    </p>
                  )}
                  {view.step.is_ui_preview && (
                    <p className="text-warning-foreground text-xs font-medium">
                      {text("uiPreview")}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">{text("whyNoStep")}</p>
              )}
            </WhySection>

            <WhySection title={text("whyConfidence")}>
              <ConfidenceBadge confidence={view.confidence} />
              {view.confidence.basis && (
                <p className="text-muted-foreground">{view.confidence.basis}</p>
              )}
            </WhySection>
          </div>

          <div className="text-muted-foreground space-y-2 border-t p-4 text-xs">
            <p className="text-foreground text-sm font-medium">
              {text("whyWrong")}
            </p>
            <p>{text("whyWrongBody")}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/privacy"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {text("whyGoToPrivacy")}
              </Link>
              <SheetClose render={<Button variant="secondary" size="sm" />}>
                {text("close")}
              </SheetClose>
            </div>
            <p className="pt-2 font-mono text-[0.7rem]">
              {text("whyBasedOn")}: {view.snapshot_id} · rules{" "}
              {view.rule_version} · consent {view.consent_version}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
