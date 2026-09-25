/**
 * Onboarding answers (Guide §4: context is written "with unanswered fields").
 *
 * Every field starts "unanswered". "unanswered", "dont_know" and "none" are
 * different answers, and none of them means zero.
 */
export type Answer<T> =
  | { state: "unanswered" }
  | { state: "dont_know" }
  | { state: "none" }
  | { state: "answered"; value: T };

export const UNANSWERED = { state: "unanswered" } as const;

export function answered<T>(value: T): Answer<T> {
  return { state: "answered", value };
}

export type ParseResult<T> =
  { ok: true; value: T } | { ok: false; error: string };

/** What the person has done with a free-text field in a form. */
export type FieldChoice = "value" | "dont_know" | "none";

export interface FieldDraft {
  choice: FieldChoice;
  text: string;
}

export const EMPTY_DRAFT: FieldDraft = { choice: "value", text: "" };

export function draftFromAnswer<T>(
  answer: Answer<T>,
  toText: (value: T) => string,
): FieldDraft {
  switch (answer.state) {
    case "answered":
      return { choice: "value", text: toText(answer.value) };
    case "dont_know":
      return { choice: "dont_know", text: "" };
    case "none":
      return { choice: "none", text: "" };
    default:
      return EMPTY_DRAFT;
  }
}

/** An empty field stays unanswered; it is never turned into zero. */
export function answerFromDraft<T>(
  draft: FieldDraft,
  parse: (text: string) => ParseResult<T>,
): ParseResult<Answer<T>> {
  if (draft.choice === "dont_know") {
    return { ok: true, value: { state: "dont_know" } };
  }
  if (draft.choice === "none") return { ok: true, value: { state: "none" } };

  const text = draft.text.trim();
  if (text === "") return { ok: true, value: UNANSWERED };

  const parsed = parse(text);
  return parsed.ok ? { ok: true, value: answered(parsed.value) } : parsed;
}
