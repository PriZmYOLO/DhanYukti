"use client";

import { useText } from "@/components/onboarding/onboarding-provider";
import type { Answer } from "@/lib/onboarding/answer";

interface ChoiceFieldProps<T extends string> {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: Answer<T>;
  onChange: (answer: Answer<T>) => void;
  /** Label for an explicit "none" answer, e.g. "I have no income of my own". */
  noneLabel?: string;
  allowDontKnow?: boolean;
}

type RadioValue = string;

const SKIP = "__unanswered";
const DONT_KNOW = "__dont_know";
const NONE = "__none";

function toRadio<T extends string>(answer: Answer<T>): RadioValue {
  switch (answer.state) {
    case "answered":
      return answer.value;
    case "dont_know":
      return DONT_KNOW;
    case "none":
      return NONE;
    default:
      return SKIP;
  }
}

/** Single-choice question where skipping stays "Not answered yet". */
export function ChoiceField<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  noneLabel,
  allowDontKnow = false,
}: ChoiceFieldProps<T>) {
  const text = useText();
  const selected = toRadio(value);

  const rows: { radio: RadioValue; label: string; answer: Answer<T> }[] = [
    ...options.map((option) => ({
      radio: option.value as RadioValue,
      label: option.label,
      answer: { state: "answered", value: option.value } as Answer<T>,
    })),
    ...(noneLabel
      ? [{ radio: NONE, label: noneLabel, answer: { state: "none" } as const }]
      : []),
    ...(allowDontKnow
      ? [
          {
            radio: DONT_KNOW,
            label: text("dontKnow"),
            answer: { state: "dont_know" } as const,
          },
        ]
      : []),
    {
      radio: SKIP,
      label: `${text("skip")} · ${text("statusUnanswered")}`,
      answer: { state: "unanswered" } as const,
    },
  ];

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => {
          const id = `${name}-${row.radio}`;
          return (
            <label
              key={row.radio}
              htmlFor={id}
              className="has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:outline-ring flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={row.radio}
                checked={selected === row.radio}
                onChange={() => onChange(row.answer)}
                className="accent-primary size-4"
              />
              <span
                className={
                  row.radio === SKIP ? "text-muted-foreground" : undefined
                }
              >
                {row.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
