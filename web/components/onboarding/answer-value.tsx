"use client";

import type { ReactNode } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { useText } from "@/components/onboarding/onboarding-provider";
import type { Answer } from "@/lib/onboarding/answer";

interface AnswerValueProps<T> {
  answer: Answer<T>;
  render: (value: T) => ReactNode;
  /** Text for an explicit "none" answer; required where "none" is possible. */
  noneText?: string;
}

/** Read-only display of an answer, keeping every non-answer distinct. */
export function AnswerValue<T>({
  answer,
  render,
  noneText,
}: AnswerValueProps<T>) {
  const text = useText();

  switch (answer.state) {
    case "answered":
      return <>{render(answer.value)}</>;
    case "none":
      return <span>{noneText}</span>;
    case "dont_know":
      return (
        <AvailabilityState
          status="dont_know"
          compact
          title={text("statusDontKnow")}
          description={text("statusDontKnowBody")}
        />
      );
    default:
      return (
        <AvailabilityState
          status="unanswered"
          compact
          title={text("statusUnanswered")}
          description={text("statusUnansweredBody")}
        />
      );
  }
}
