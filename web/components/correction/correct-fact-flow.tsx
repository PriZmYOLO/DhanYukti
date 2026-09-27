"use client";

import { useRef, useState, type FormEvent } from "react";

import { useConsentText } from "@/components/consent/consent-text";
import { PrivacyFrame } from "@/components/consent/privacy-frame";
import {
  CorrectionList,
  OriginalFigure,
} from "@/components/correction/correction-list";
import { useCorrectionText } from "@/components/correction/correction-text";
import { useInvalidateHouseholdView } from "@/components/correction/picture-status";
import { useCorrections } from "@/components/correction/use-corrections";
import { ProposedFigure } from "@/components/correction/why-fact-correction";
import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { SourceBadge } from "@/components/finance/source-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CorrectableFact, CorrectableFacts } from "@/lib/correction/facts";
import { parseIsoDateInput, parseRupeesToPaise } from "@/lib/onboarding/parse";
import {
  correctionPort,
  type CorrectionField,
  type ProposedValue,
} from "@/lib/provisional/h07";
import { cn } from "@/lib/utils";

const FIELDS: CorrectionField[] = ["amount", "effective_on"];

const textareaClass =
  "border-input placeholder:text-muted-foreground focus-ring focus-visible:border-ring aria-invalid:border-destructive min-h-24 w-full rounded-lg border bg-transparent px-2.5 py-2 text-base md:text-sm";

const choiceClass =
  "has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:outline-ring flex min-h-11 cursor-pointer gap-3 rounded-lg border px-3 py-2 text-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2";

type Errors = Partial<Record<"fact" | "field" | "value" | "reason", string>>;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-negative text-sm font-medium">
      {message}
    </p>
  );
}

/** Text-only consequences: which parts would be recalculated, no figures. */
function WhatWouldChange({
  fact,
  field,
}: {
  fact: CorrectableFact;
  field: CorrectionField;
}) {
  const text = useCorrectionText();
  return (
    <section
      aria-labelledby="preview-change-heading"
      className="space-y-2 text-sm"
    >
      <h3 id="preview-change-heading" className="font-semibold">
        {text("previewHeading")}
      </h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>{text(`preview_${field}`)}</li>
        {fact.used_in.priority_title ? (
          <li>
            {text("previewPriority")} “{fact.used_in.priority_title}”
          </li>
        ) : (
          <li>{text("previewNotInPriority")}</li>
        )}
        {fact.used_in.consequence && <li>{text("previewConsequence")}</li>}
      </ul>
      <p className="text-muted-foreground">{text("previewNoFigures")}</p>
    </section>
  );
}

function CorrectionFlow({
  facts,
  initialFactId,
}: {
  facts: CorrectableFact[];
  initialFactId: string | null;
}) {
  const text = useCorrectionText();
  const { text: consentText } = useConsentText();
  const invalidate = useInvalidateHouseholdView();
  const { corrections, reload } = useCorrections();
  const [factId, setFactId] = useState<string | null>(
    facts.some((fact) => fact.fact_id === initialFactId) ? initialFactId : null,
  );
  const [field, setField] = useState<CorrectionField | null>(null);
  const [valueText, setValueText] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [preview, setPreview] = useState<ProposedValue | null>(null);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  const fact = facts.find((candidate) => candidate.fact_id === factId) ?? null;

  function validate(): ProposedValue | null {
    const found: Errors = {};
    let proposed: ProposedValue | null = null;
    if (!fact) found.fact = text("pickRequired");
    if (!field) found.field = text("fieldRequired");
    if (field === "amount") {
      const parsed = parseRupeesToPaise(valueText);
      if (!valueText.trim()) found.value = text("valueRequired");
      else if (!parsed.ok) found.value = parsed.error;
      else if (fact?.amount?.amount_paise === parsed.value.amount_paise)
        found.value = text("sameValue");
      else proposed = { field, amount: parsed.value };
    }
    if (field === "effective_on") {
      const parsed = parseIsoDateInput(valueText);
      if (!valueText) found.value = text("valueRequired");
      else if (!parsed.ok) found.value = parsed.error;
      else if (fact?.effective_on === parsed.value)
        found.value = text("sameValue");
      else proposed = { field, effective_on: parsed.value };
    }
    if (!reason.trim()) found.reason = text("reasonRequired");

    setErrors(found);
    const first = (["fact", "field", "value", "reason"] as const).find(
      (key) => found[key],
    );
    if (first) {
      const target =
        first === "fact"
          ? `fact-${facts[0]?.fact_id}`
          : first === "field"
            ? "field-amount"
            : first === "value"
              ? "proposed-value"
              : "correction-reason";
      document.getElementById(target)?.focus();
      return null;
    }
    return proposed;
  }

  function showPreview(event: FormEvent) {
    event.preventDefault();
    const proposed = validate();
    if (!proposed) return;
    setPreview(proposed);
    requestAnimationFrame(() => previewRef.current?.focus());
  }

  async function submit() {
    if (!fact || !preview) return;
    setBusy(true);
    const saved = await correctionPort.proposeCorrection({
      fact_id: fact.fact_id,
      proposed: preview,
      reason: reason.trim(),
    });
    await reload();
    setPreview(null);
    setField(null);
    setValueText("");
    setReason("");
    setBusy(false);
    setAnnouncement(text("proposedAnnouncement"));
    requestAnimationFrame(() =>
      document.getElementById(`correction-${saved.correction_id}`)?.focus(),
    );
  }

  async function changed(change: "reviewed" | "reset", id?: string) {
    await reload();
    // An accepted correction (or a reset) changes the household picture.
    await invalidate();
    if (id) {
      requestAnimationFrame(() =>
        document.getElementById(`correction-${id}`)?.focus(),
      );
    } else if (change === "reset") {
      document.getElementById("corrections-heading")?.focus();
    }
  }

  return (
    <div className="space-y-10">
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {preview && fact ? (
        <div
          ref={previewRef}
          tabIndex={-1}
          data-correction-preview
          className="bg-card focus-visible:ring-ring space-y-4 rounded-xl border p-4 outline-none focus-visible:ring-2 sm:p-6"
        >
          <h2 className="text-lg font-semibold">
            {fact.label}
            <span className="text-muted-foreground font-normal">
              {" "}
              · {text(`field_${preview.field}`)}
            </span>
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">
                {text("labelOriginal")}
              </dt>
              <dd className="flex flex-wrap items-center gap-2">
                <OriginalFigure fact={fact} field={preview.field} />
                <SourceBadge
                  kind={fact.source_kind}
                  sourceLabel={fact.source_label}
                />
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">
                {text("labelProposed")}
              </dt>
              <dd>
                <ProposedFigure value={preview} />
              </dd>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <dt className="text-muted-foreground text-xs">
                {text("labelYourReason")}
              </dt>
              <dd className="text-sm break-words">{reason.trim()}</dd>
            </div>
          </dl>
          <WhatWouldChange fact={fact} field={preview.field} />
          <div className="flex flex-wrap gap-2">
            <Button size="xl" disabled={busy} onClick={submit}>
              {text("submitAction")}
            </Button>
            <Button
              variant="outline"
              size="xl"
              disabled={busy}
              onClick={() => {
                setPreview(null);
                requestAnimationFrame(() =>
                  document.getElementById("proposed-value")?.focus(),
                );
              }}
            >
              {text("previewEdit")}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={showPreview} noValidate className="space-y-6">
          <fieldset
            className="space-y-2"
            aria-describedby={cn("fact-hint", errors.fact && "fact-error")}
          >
            <legend className="mb-1 text-sm font-medium">
              {text("pickLegend")}
            </legend>
            <p id="fact-hint" className="text-muted-foreground text-xs">
              {text("pickHint")}
            </p>
            <div className="grid gap-2">
              {facts.map((candidate) => (
                <label
                  key={candidate.fact_id}
                  htmlFor={`fact-${candidate.fact_id}`}
                  data-fact-option={candidate.fact_id}
                  className={cn(choiceClass, "items-start")}
                >
                  <input
                    id={`fact-${candidate.fact_id}`}
                    type="radio"
                    name="fact"
                    value={candidate.fact_id}
                    checked={factId === candidate.fact_id}
                    onChange={() => {
                      setFactId(candidate.fact_id);
                      setErrors((current) => ({ ...current, fact: undefined }));
                    }}
                    className="accent-primary mt-1 size-4 shrink-0"
                  />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-medium">{candidate.label}</span>
                      {candidate.availability === "present" ? (
                        <Money value={candidate.amount} per={candidate.per} />
                      ) : (
                        <AvailabilityState
                          status={candidate.availability}
                          compact
                        />
                      )}
                    </span>
                    <span className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                      <DateDisplay value={candidate.effective_on} />
                      <SourceBadge
                        kind={candidate.source_kind}
                        sourceLabel={candidate.source_label}
                      />
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <FieldError id="fact-error" message={errors.fact} />
          </fieldset>

          <fieldset
            className="space-y-2"
            aria-describedby={errors.field ? "field-error" : undefined}
          >
            <legend className="mb-1 text-sm font-medium">
              {text("fieldLegend")}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {FIELDS.map((option) => (
                <label
                  key={option}
                  htmlFor={`field-${option}`}
                  className={cn(choiceClass, "items-center")}
                >
                  <input
                    id={`field-${option}`}
                    type="radio"
                    name="field"
                    value={option}
                    checked={field === option}
                    onChange={() => {
                      setField(option);
                      setValueText("");
                      setErrors((current) => ({
                        ...current,
                        field: undefined,
                        value: undefined,
                      }));
                    }}
                    className="accent-primary size-4"
                  />
                  {text(`field_${option}`)}
                </label>
              ))}
            </div>
            <FieldError id="field-error" message={errors.field} />
          </fieldset>

          {field && (
            <div className="space-y-2">
              <Label htmlFor="proposed-value">
                {field === "amount"
                  ? text("proposedAmountLabel")
                  : text("proposedDateLabel")}
              </Label>
              <Input
                id="proposed-value"
                name="proposed_value"
                type={field === "amount" ? "text" : "date"}
                inputMode={field === "amount" ? "decimal" : undefined}
                autoComplete="off"
                value={valueText}
                aria-invalid={errors.value ? true : undefined}
                aria-describedby={errors.value ? "value-error" : undefined}
                onChange={(event) => {
                  setValueText(event.target.value);
                  setErrors((current) => ({ ...current, value: undefined }));
                }}
                className="h-11 max-w-xs"
              />
              <FieldError id="value-error" message={errors.value} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="correction-reason">{text("reasonLabel")}</Label>
            <p id="reason-hint" className="text-muted-foreground text-xs">
              {text("reasonHint")}
            </p>
            <textarea
              id="correction-reason"
              name="reason"
              autoComplete="off"
              value={reason}
              maxLength={500}
              aria-invalid={errors.reason ? true : undefined}
              aria-describedby={cn(
                "reason-hint",
                errors.reason && "reason-error",
              )}
              onChange={(event) => {
                setReason(event.target.value);
                setErrors((current) => ({ ...current, reason: undefined }));
              }}
              className={textareaClass}
            />
            <FieldError id="reason-error" message={errors.reason} />
          </div>

          <Button type="submit" size="xl">
            {text("previewAction")}
          </Button>
        </form>
      )}

      {corrections === null ? (
        <p role="status" className="text-muted-foreground">
          {consentText("loading")}
        </p>
      ) : (
        <CorrectionList
          corrections={corrections}
          facts={facts}
          onChanged={changed}
        />
      )}
    </div>
  );
}

export function CorrectFactScreen({
  facts,
  initialFactId,
}: {
  facts: CorrectableFacts;
  initialFactId: string | null;
}) {
  const { text: consentText } = useConsentText();
  const text = useCorrectionText();

  return (
    <PrivacyFrame
      title={consentText("correctTitle")}
      intro={text("correctIntro")}
      back
    >
      {facts.status === "unavailable" ? (
        <AvailabilityState
          status="unavailable"
          title={text("factsUnavailableTitle")}
          description={facts.reason}
        />
      ) : facts.facts.length === 0 ? (
        <AvailabilityState
          status="missing"
          title={text("noFactsTitle")}
          description={text("noFactsBody")}
        />
      ) : (
        <CorrectionFlow facts={facts.facts} initialFactId={initialFactId} />
      )}
    </PrivacyFrame>
  );
}
