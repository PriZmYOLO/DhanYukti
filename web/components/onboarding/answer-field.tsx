"use client";

import type { ComponentProps } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { useText } from "@/components/onboarding/onboarding-provider";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldDraft } from "@/lib/onboarding/answer";
import type { CopyKey } from "@/lib/onboarding/copy";
import { groupRupeeText, rupeeUnitsText } from "@/lib/onboarding/parse";
import { cn } from "@/lib/utils";

interface AnswerFieldProps {
  id: string;
  label: string;
  /** Muted text under the label, e.g. what to enter. */
  description?: string;
  /** Copy key for the side panel's "Why we ask this" while focused. */
  why?: CopyKey;
  draft: FieldDraft;
  onChange: (draft: FieldDraft) => void;
  error?: string | null;
  /** Offer an explicit "I don't know" answer. */
  allowDontKnow?: boolean;
  /** Offer an explicit "none" answer with this label, e.g. "No regular income". */
  noneLabel?: string;
  /**
   * A rupee amount: ₹ prefix, en-IN grouping on blur (5,00,000) and a helper
   * in Indian units (5 lakh). Display only; the text is parsed exactly as typed.
   */
  money?: boolean;
  inputProps?: Omit<
    ComponentProps<"input">,
    "id" | "value" | "onChange" | "disabled"
  >;
}

/**
 * A free-text answer with explicit states. An empty field is shown as
 * "Not answered yet"; "I don't know" and "none" are separate choices.
 */
export function AnswerField({
  id,
  label,
  description,
  why,
  draft,
  onChange,
  error,
  allowDontKnow = false,
  noneLabel,
  money = false,
  inputProps,
}: AnswerFieldProps) {
  const text = useText();
  const units =
    money && draft.choice === "value" ? rupeeUnitsText(draft.text) : null;
  const describedBy =
    [
      description && `${id}-description`,
      units && `${id}-units`,
      error && `${id}-error`,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  function toggle(choice: "dont_know" | "none") {
    onChange(
      draft.choice === choice
        ? { choice: "value", text: "" }
        : { choice, text: "" },
    );
  }

  return (
    <div className="space-y-2" data-why={why}>
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        {description && (
          <p id={`${id}-description`} className="text-muted-foreground text-sm">
            {description}
          </p>
        )}
      </div>
      <div className="relative">
        {money && (
          <span
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm"
          >
            ₹
          </span>
        )}
        <Input
          id={id}
          value={draft.choice === "value" ? draft.text : ""}
          disabled={draft.choice !== "value"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) =>
            onChange({ choice: "value", text: event.target.value })
          }
          className={cn("h-10", money && "pl-7 tabular-nums")}
          {...inputProps}
          onBlur={(event) => {
            inputProps?.onBlur?.(event);
            if (!money || draft.choice !== "value") return;
            const grouped = groupRupeeText(draft.text.trim());
            if (grouped !== draft.text) {
              onChange({ choice: "value", text: grouped });
            }
          }}
        />
      </div>
      {units && (
        <p id={`${id}-units`} className="text-muted-foreground text-xs">
          {units}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {allowDontKnow && (
          <button
            type="button"
            aria-pressed={draft.choice === "dont_know"}
            onClick={() => toggle("dont_know")}
            className={buttonVariants({
              variant: draft.choice === "dont_know" ? "secondary" : "outline",
              size: "sm",
            })}
          >
            {text("dontKnow")}
          </button>
        )}
        {noneLabel && (
          <button
            type="button"
            aria-pressed={draft.choice === "none"}
            onClick={() => toggle("none")}
            className={buttonVariants({
              variant: draft.choice === "none" ? "secondary" : "outline",
              size: "sm",
            })}
          >
            {noneLabel}
          </button>
        )}
        {draft.choice === "value" && draft.text.trim() === "" && (
          <AvailabilityState
            status="unanswered"
            compact
            title={text("statusUnanswered")}
            description={text("statusUnansweredBody")}
          />
        )}
        {draft.choice === "dont_know" && (
          <AvailabilityState
            status="dont_know"
            compact
            title={text("statusDontKnow")}
            description={text("statusDontKnowBody")}
          />
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
