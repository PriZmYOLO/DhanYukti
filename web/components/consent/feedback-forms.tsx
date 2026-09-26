"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { useConsentText } from "@/components/consent/consent-text";
import { PrivacyFrame } from "@/components/consent/privacy-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  consentPort,
  type FeedbackReceipt,
  type ReportReason,
} from "@/lib/provisional/h03";
import { cn } from "@/lib/utils";

const textareaClass =
  "border-input placeholder:text-muted-foreground focus-ring focus-visible:border-ring aria-invalid:border-destructive min-h-28 w-full rounded-lg border bg-transparent px-2.5 py-2 text-base md:text-sm";

/** Shown after saving. A saved proposal is not a completed correction. */
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

function CorrectionForm() {
  const { text } = useConsentText();
  const [which, setWhich] = useState("");
  const [value, setValue] = useState("");
  const [errors, setErrors] = useState<{ which?: string; value?: string }>({});
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<FeedbackReceipt | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = {
      which: which.trim() ? undefined : text("fieldRequired"),
      value: value.trim() ? undefined : text("fieldRequired"),
    };
    if (found.which || found.value) {
      setErrors(found);
      document
        .getElementById(found.which ? "correct-which" : "correct-value")
        ?.focus();
      return;
    }
    setBusy(true);
    setReceipt(
      await consentPort.proposeCorrection({
        which_fact: which.trim(),
        correct_value: value.trim(),
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
          setWhich("");
          setValue("");
        }}
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="correct-which">{text("correctWhichLabel")}</Label>
        <p id="correct-which-hint" className="text-muted-foreground text-xs">
          {text("correctWhichHint")}
        </p>
        <Input
          id="correct-which"
          name="which_fact"
          value={which}
          maxLength={120}
          autoComplete="off"
          aria-invalid={errors.which ? true : undefined}
          aria-describedby={cn(
            "correct-which-hint",
            errors.which && "correct-which-error",
          )}
          onChange={(event) => {
            setWhich(event.target.value);
            setErrors((current) => ({ ...current, which: undefined }));
          }}
          className="h-11"
        />
        <FieldError id="correct-which-error" message={errors.which ?? null} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="correct-value">{text("correctValueLabel")}</Label>
        <textarea
          id="correct-value"
          name="correct_value"
          autoComplete="off"
          value={value}
          maxLength={500}
          aria-invalid={errors.value ? true : undefined}
          aria-describedby={errors.value ? "correct-value-error" : undefined}
          onChange={(event) => {
            setValue(event.target.value);
            setErrors((current) => ({ ...current, value: undefined }));
          }}
          className={textareaClass}
        />
        <FieldError id="correct-value-error" message={errors.value ?? null} />
      </div>
      <Button type="submit" size="xl" disabled={busy}>
        {text("correctSubmit")}
      </Button>
    </form>
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

export function CorrectFactScreen() {
  const { text } = useConsentText();
  return (
    <PrivacyFrame
      title={text("correctTitle")}
      intro={text("correctIntro")}
      back
    >
      <CorrectionForm />
    </PrivacyFrame>
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
