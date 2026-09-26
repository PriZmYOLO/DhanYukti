"use client";

import { FlaskConical } from "lucide-react";
import { useState, type ReactNode } from "react";

import { useCorrectionText } from "@/components/correction/correction-text";
import { ProposedFigure } from "@/components/correction/why-fact-correction";
import {
  AvailabilityState,
  type AvailabilityStatus,
} from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { SourceBadge } from "@/components/finance/source-badge";
import { Button } from "@/components/ui/button";
import type { CorrectableFact } from "@/lib/correction/facts";
import type { CorrectionCopyKey } from "@/lib/correction/copy";
import {
  demoCorrectionControls,
  type CorrectionStatus,
  type FactCorrection,
} from "@/lib/provisional/h07";

const STATUS_DISPLAY: Record<
  CorrectionStatus,
  {
    status: AvailabilityStatus;
    title: CorrectionCopyKey;
    body: CorrectionCopyKey;
  }
> = {
  proposed: {
    status: "pending",
    title: "status_proposed",
    body: "status_proposed_body",
  },
  accepted: {
    status: "pending",
    title: "status_accepted",
    body: "status_accepted_body",
  },
  rejected: {
    status: "denied",
    title: "status_rejected",
    body: "status_rejected_body",
  },
};

/** The fact as it stands in the plan, for the field being corrected. */
export function OriginalFigure({
  fact,
  field,
}: {
  fact: CorrectableFact;
  field: FactCorrection["proposed"]["field"];
}) {
  return field === "amount" ? (
    <Money value={fact.amount} per={fact.per} />
  ) : (
    <DateDisplay value={fact.effective_on} />
  );
}

function Pair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="flex flex-wrap items-center gap-2">{children}</dd>
    </div>
  );
}

function CorrectionItem({
  correction,
  fact,
  onReview,
  busy,
}: {
  correction: FactCorrection;
  fact: CorrectableFact | null;
  onReview: (id: string, decision: "accept" | "reject") => void;
  busy: boolean;
}) {
  const text = useCorrectionText();
  const display = STATUS_DISPLAY[correction.status];
  const field = correction.proposed.field;

  return (
    <article
      id={`correction-${correction.correction_id}`}
      tabIndex={-1}
      data-correction-status={correction.status}
      aria-labelledby={`correction-title-${correction.correction_id}`}
      className="bg-card focus-visible:ring-ring space-y-3 rounded-xl border p-4 outline-none focus-visible:ring-2"
    >
      <h3
        id={`correction-title-${correction.correction_id}`}
        className="font-semibold"
      >
        {fact?.label ?? text("originalMissing")}
        <span className="text-muted-foreground font-normal">
          {" "}
          · {text(`field_${field}`)}
        </span>
      </h3>

      <AvailabilityState
        status={display.status}
        title={text(display.title)}
        description={text(display.body)}
      >
        {correction.status === "rejected" && correction.rejection_reason && (
          <p>
            <span className="font-medium">{text("labelReviewReason")}:</span>{" "}
            {correction.rejection_reason}
          </p>
        )}
      </AvailabilityState>

      {/* The original is never replaced: both sit side by side. */}
      <dl className="grid gap-3 sm:grid-cols-2">
        <Pair label={text("labelOriginal")}>
          {fact ? (
            <>
              <OriginalFigure fact={fact} field={field} />
              <SourceBadge
                kind={fact.source_kind}
                sourceLabel={fact.source_label}
              />
            </>
          ) : (
            <span className="text-muted-foreground italic">
              {text("originalMissing")}
            </span>
          )}
        </Pair>
        <Pair label={text("labelProposed")}>
          <ProposedFigure value={correction.proposed} />
        </Pair>
        <Pair label={text("labelYourReason")}>
          <span className="text-sm break-words">{correction.reason}</span>
        </Pair>
        <Pair label={text("proposedOn")}>
          <DateDisplay value={correction.proposed_at} className="text-sm" />
          {correction.decided_at && (
            <span className="text-muted-foreground text-sm">
              · {text("decidedOn")}{" "}
              <DateDisplay value={correction.decided_at} />
            </span>
          )}
        </Pair>
      </dl>

      {demoCorrectionControls && correction.status === "proposed" && (
        <div className="flex flex-wrap gap-2 border-t border-dashed pt-3">
          <Button
            variant="outline"
            size="lg"
            disabled={busy}
            onClick={() => onReview(correction.correction_id, "accept")}
          >
            <FlaskConical aria-hidden />
            {text("demoAccept")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={busy}
            onClick={() => onReview(correction.correction_id, "reject")}
          >
            <FlaskConical aria-hidden />
            {text("demoReject")}
          </Button>
        </div>
      )}
    </article>
  );
}

/** This member's corrections, each beside the unchanged original. */
export function CorrectionList({
  corrections,
  facts,
  onChanged,
}: {
  corrections: FactCorrection[];
  facts: CorrectableFact[];
  /** Called after a simulated review or reset, with what changed. */
  onChanged: (change: "reviewed" | "reset", id?: string) => Promise<void>;
}) {
  const text = useCorrectionText();
  const [busy, setBusy] = useState(false);
  const byId = new Map(facts.map((fact) => [fact.fact_id, fact]));

  async function review(id: string, decision: "accept" | "reject") {
    if (!demoCorrectionControls) return;
    setBusy(true);
    await demoCorrectionControls.simulateReview(id, decision);
    await onChanged("reviewed", id);
    setBusy(false);
  }

  async function reset() {
    if (!demoCorrectionControls) return;
    setBusy(true);
    await demoCorrectionControls.reset();
    await onChanged("reset");
    setBusy(false);
  }

  return (
    <section aria-labelledby="corrections-heading" className="space-y-3">
      <h2
        id="corrections-heading"
        tabIndex={-1}
        className="focus-visible:ring-ring rounded-sm text-lg font-semibold outline-none focus-visible:ring-2"
      >
        {text("listHeading")}
      </h2>
      {corrections.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text("listEmpty")}</p>
      ) : (
        <div className="space-y-4">
          {corrections.map((correction) => (
            <CorrectionItem
              key={correction.correction_id}
              correction={correction}
              fact={byId.get(correction.fact_id) ?? null}
              onReview={review}
              busy={busy}
            />
          ))}
        </div>
      )}

      {demoCorrectionControls && (
        <div className="border-warning/50 bg-warning/10 space-y-3 rounded-xl border border-dashed p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <FlaskConical aria-hidden className="size-4" />
            {text("demoReviewTitle")}
          </h3>
          <p className="text-sm">{text("demoReviewBody")}</p>
          <p className="text-sm">{text("demoResetBody")}</p>
          <Button variant="ghost" size="xl" disabled={busy} onClick={reset}>
            {text("demoReset")}
          </Button>
        </div>
      )}
    </section>
  );
}
