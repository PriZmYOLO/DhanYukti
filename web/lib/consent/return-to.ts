/** Where the bank-link flow was started from, for its "back" links. */
export type ReturnTo = "setup" | null;

/** Only the known "setup" origin is honoured; anything else is ignored. */
export function parseReturnTo(value: string | string[] | undefined): ReturnTo {
  return value === "setup" ? "setup" : null;
}
