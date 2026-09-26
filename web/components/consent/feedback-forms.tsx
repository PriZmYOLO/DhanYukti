"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { useConsentText } from "@/components/consent/consent-text";
import { PrivacyFrame } from "@/components/consent/privacy-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  consentPort,
  type FeedbackReceipt,
  type ReportReason,
} from "@/lib/provisional/h03";

const textareaClass =
  "border-input placeholder:text-muted-foreground focus-ring focus-visible:border-ring aria-invalid:border-destructive min-h-28 w-full rounded-lg border bg-transparent px-2.5 py-2 text-base md:text-sm";

/** Shown after saving. A saved report is not a resolved one. */
function Saved({
  receipt,
  onAnother,
}: {
  receipt: FeedbackReceipt;
  onAnother: () => void;
}) {
  const { text } = useConsentText();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div ref={ref} tabIndex={-1} className="space-y-4 outline-none">
      <AvailabilityState
        status="pending"
        title={text("feedbackSavedTitle")}
        description={text("feedbackSavedBody")}
      >
        <p className="text-xs">
          {text("feedbackSavedOn")} <DateDisplay value={receipt.saved_at} />
        </p>
      </AvailabilityState>
      <div className="flex flex-wrap gap-2">
        <Link href="/privacy" className={buttonVariants({ size: "xl" })}>
          {text("backToPrivacy")}
        </Link>
        <Button variant="outline" size="xl" onClick={onAnother}>
          {text("feedbackAnother")}
        </Button>
      </div>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="text-negative text-sm font-medium">
      {message}
    </p>
  );
}

const REASONS: ReportReason[] = [
  "wrong_fact",
  "not_suitable",
  "unclear",
  "privacy",
  "other",
];

function ReportForm() {
  const { text } = useConsentText();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<FeedbackReceipt | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason) {
      setError(text("reasonRequired"));
      document.getElementById(`reason-${REASONS[0]}`)?.focus();
      return;
    }
    setBusy(true);
    setReceipt(
      await consentPort.reportRecommendation({
        reason,
        details: details.trim(),
      }),
    );
    setBusy(false);
  }

  if (receipt) {
    return (
      <Saved
        receipt={receipt}
        onAnother={() => {
          setReceipt(null);
          setReason(null);
          setDetails("");
        }}
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <fieldset
        className="space-y-2"
        aria-describedby={error ? "reason-error" : undefined}
      >
        <legend className="mb-2 text-sm font-medium">
          {text("reportReasonLegend")}
        </legend>
        <div className="grid gap-2">
          {REASONS.map((option) => (
            <label
              key={option}
              htmlFor={`reason-${option}`}
              className="has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:outline-ring flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
            >
              <input
                id={`reason-${option}`}
                type="radio"
                name="report-reason"
                value={option}
                checked={reason === option}
                onChange={() => {
                  setReason(option);
                  setError(null);
                }}
                className="accent-primary size-4"
              />
              {text(`reason_${option}`)}
            </label>
          ))}
        </div>
        <FieldError id="reason-error" message={error} />
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="report-details">{text("reportDetailsLabel")}</Label>
        <textarea
          id="report-details"
          name="details"
          autoComplete="off"
          value={details}
          maxLength={500}
          onChange={(event) => setDetails(event.target.value)}
          className={textareaClass}
        />
      </div>
      <Button type="submit" size="xl" disabled={busy}>
        {text("reportSubmit")}
      </Button>
    </form>
  );
}

export function ReportRecommendationScreen() {
  const { text } = useConsentText();
  return (
    <PrivacyFrame title={text("reportTitle")} intro={text("reportIntro")} back>
      <ReportForm />
    </PrivacyFrame>
  );
}
