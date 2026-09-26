"use client";

import { PencilLine } from "lucide-react";
import Link from "next/link";

import { useCorrectionText } from "@/components/correction/correction-text";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import type { FactCorrection, ProposedValue } from "@/lib/provisional/h07";

/** A proposed amount or date, rendered like the fact it would correct. */
export function ProposedFigure({ value }: { value: ProposedValue }) {
  return value.field === "amount" ? (
    <Money value={value.amount} />
  ) : (
    <DateDisplay value={value.effective_on} />
  );
}

/**
 * Under a fact in the Why sheet: any pending proposal for it (beside the
 * unchanged original above) and a link to correct it.
 */
export function WhyFactCorrection({
  factId,
  label,
  corrections,
}: {
  factId: string;
  label: string;
  /** This member's corrections; null while loading. */
  corrections: FactCorrection[] | null;
}) {
  const text = useCorrectionText();
  const pending = (corrections ?? []).filter(
    (correction) =>
      correction.fact_id === factId && correction.status === "proposed",
  );

  return (
    <div className="space-y-1.5 pt-0.5">
      {pending.map((correction) => (
        <p
          key={correction.correction_id}
          data-correction-status="proposed"
          className="border-warning/50 bg-warning/10 text-foreground rounded-md border px-2 py-1 text-xs"
        >
          <span className="font-medium">{text("whyPending")}</span> ·{" "}
          {text("labelProposed")} <ProposedFigure value={correction.proposed} />
        </p>
      ))}
      <Link
        href={`/privacy/correct?fact=${encodeURIComponent(factId)}`}
        className="text-primary focus-ring inline-flex min-h-6 items-center gap-1 rounded-sm text-xs font-medium underline-offset-4 hover:underline"
      >
        <PencilLine aria-hidden className="size-3" />
        {text("whyCorrect")}
        <span className="sr-only">: {label}</span>
      </Link>
    </div>
  );
}
