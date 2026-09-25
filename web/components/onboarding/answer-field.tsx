"use client";

import type { ComponentProps } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { useText } from "@/components/onboarding/onboarding-provider";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldDraft } from "@/lib/onboarding/answer";
import { cn } from "@/lib/utils";

interface AnswerFieldProps {
  id: string;
  label: string;
  hint?: string;
  draft: FieldDraft;
  onChange: (draft: FieldDraft) => void;
  error?: string | null;
  /** Offer an explicit "I don't know" answer. */
  allowDontKnow?: boolean;
  /** Offer an explicit "none" answer with this label, e.g. "No regular income". */
  noneLabel?: string;
  /** Shows a ₹ prefix for rupee amounts. */
  rupee?: boolean;
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
  hint,
  draft,
  onChange,
  error,
  allowDontKnow = false,
  noneLabel,
  rupee = false,
  inputProps,
}: AnswerFieldProps) {
  const text = useText();
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined;

  function toggle(choice: "dont_know" | "none") {
    onChange(
      draft.choice === choice
        ? { choice: "value", text: "" }
        : { choice, text: "" },
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      <div className="relative">
        {rupee && (
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
          className={cn("h-10", rupee && "pl-7")}
          {...inputProps}
        />
      </div>
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
