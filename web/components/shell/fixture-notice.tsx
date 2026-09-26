import { ChevronDown, FlaskConical } from "lucide-react";
import type { ReactNode } from "react";

const DEFAULT_DESCRIPTION =
  "A made-up test household used while the app is being built. These are not real people or real money, and no bank is connected.";

/** The one-line disclosure shown while the full notice is collapsed. */
const COMPACT_SUMMARY = "Demo household · not real money · no bank connected";

interface FixtureNoticeProps {
  label: string;
  /** Overrides the default fixture explanation, e.g. for a demo session. */
  description?: string;
  /** Extra fixture detail, e.g. the active demo scenario. */
  children?: ReactNode;
  /**
   * One line plus a disclosure that reveals the full text and any children.
   * Collapsed by default; the one line always says it is demo data.
   */
  compact?: boolean;
}

/** Rendered wherever a screen shows fixture data instead of a backend response. */
export function FixtureNotice({
  label,
  description,
  children,
  compact = false,
}: FixtureNoticeProps) {
  const body = (
    <>
      <p>{description ?? DEFAULT_DESCRIPTION}</p>
      {children}
    </>
  );

  if (compact) {
    return (
      <div
        role="note"
        aria-label={label}
        className="border-warning/50 bg-warning/15 text-warning-foreground rounded-lg border text-sm"
      >
        <details className="group">
          <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 [&::-webkit-details-marker]:hidden">
            <FlaskConical aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 font-medium">
              {COMPACT_SUMMARY}
            </span>
            <span className="shrink-0 text-xs underline underline-offset-4">
              Details
            </span>
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="space-y-1 border-t border-current/20 px-3 pt-2 pb-3">
            <p className="font-semibold tracking-wide">{label}</p>
            {body}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div
      role="note"
      className="border-warning/50 bg-warning/15 text-warning-foreground flex gap-3 rounded-lg border p-3 text-sm"
    >
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-semibold tracking-wide">{label}</p>
        {body}
      </div>
    </div>
  );
}
