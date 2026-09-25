import { FlaskConical } from "lucide-react";
import type { ReactNode } from "react";

interface FixtureNoticeProps {
  label: string;
  /** Overrides the default fixture explanation, e.g. for a demo session. */
  description?: string;
  /** Extra fixture detail, e.g. the active demo scenario. */
  children?: ReactNode;
}

/** Rendered wherever a screen shows fixture data instead of a backend response. */
export function FixtureNotice({
  label,
  description,
  children,
}: FixtureNoticeProps) {
  return (
    <div
      role="note"
      className="border-warning/50 bg-warning/15 text-warning-foreground flex gap-3 rounded-lg border p-3 text-sm"
    >
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-semibold tracking-wide">{label}</p>
        <p>
          {description ??
            "A made-up test household used while the app is being built. These are not real people or real money, and no bank is connected."}
        </p>
        {children}
      </div>
    </div>
  );
}
