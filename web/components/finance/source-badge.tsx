import {
  CircleHelp,
  FlaskConical,
  Link2,
  PencilLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { DateDisplay } from "@/components/finance/date-display";
import type { IsoDate, IsoTimestamp, SourceKind } from "@/lib/contracts/common";
import { cn } from "@/lib/utils";

interface SourceCopy {
  label: string;
  description: string;
  /** Legend wording: "All amounts <phrase> · <note>". */
  phrase: string;
  note: string;
  icon: LucideIcon;
}

const sourceKindCopy: Record<SourceKind, SourceCopy> = {
  observed: {
    label: "From a connected source",
    description: "Received from a source a member gave permission for.",
    phrase: "from a source a member gave permission for",
    note: "received, not typed in",
    icon: Link2,
  },
  declared: {
    label: "Entered by a member",
    description: "Typed in by a household member; not checked against a bank.",
    phrase: "entered by a household member",
    note: "not checked against a bank",
    icon: PencilLine,
  },
  inferred: {
    label: "Estimated",
    description: "Worked out from a pattern in permitted data; may be wrong.",
    phrase: "estimated from a pattern",
    note: "may be wrong",
    icon: Sparkles,
  },
  scenario: {
    label: "What-if",
    description: "Part of a scenario; it does not change your real plan.",
    phrase: "part of a what-if",
    note: "your real plan is unchanged",
    icon: FlaskConical,
  },
};

/** For a source kind the frontend doesn't recognise; claims nothing. */
const unknownSource: SourceCopy = {
  label: "Source not known",
  description: "Where this came from could not be read.",
  phrase: "from a source that could not be read",
  note: "treat with care",
  icon: CircleHelp,
};

const copyFor = (kind: SourceKind): SourceCopy =>
  sourceKindCopy[kind] ?? unknownSource;

const mostCommon = <T,>(values: T[]): T => {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

interface SourceItem {
  source_kind: SourceKind;
  source_label: string | null;
}

/**
 * How a list's sources group: the most common kind and source name, and
 * whether every item shares both. Used to show one legend line instead of a
 * badge on every row; `differs` says which rows still need their own badge.
 */
export function groupSources(items: SourceItem[]): {
  common: SourceKind | null;
  commonLabel: string | null;
  uniform: boolean;
  differs: (item: SourceItem) => boolean;
} {
  if (items.length === 0) {
    return {
      common: null,
      commonLabel: null,
      uniform: true,
      differs: () => false,
    };
  }
  const common = mostCommon(items.map((item) => item.source_kind));
  const commonLabel = mostCommon(items.map((item) => item.source_label));
  const differs = (item: SourceItem) =>
    item.source_kind !== common || item.source_label !== commonLabel;
  return {
    common,
    commonLabel,
    uniform: !items.some(differs),
    differs,
  };
}

/**
 * One visible line describing where a list's amounts came from.
 * - "all": every item shares the kind ("All amounts entered by …")
 * - "single": a one-item list ("Entered by …")
 * - "unless-marked": most items share it; the others carry their own badge.
 */
export function SourceLegend({
  kind,
  scope,
  sourceLabel,
  className,
}: {
  kind: SourceKind;
  scope: "all" | "single" | "unless-marked";
  /** The shared specific source name, if the items have one. */
  sourceLabel?: string | null;
  className?: string;
}) {
  const copy = copyFor(kind);
  const Icon = copy.icon;
  const lead =
    scope === "all"
      ? `All amounts ${copy.phrase}`
      : scope === "single"
        ? copy.phrase.charAt(0).toUpperCase() + copy.phrase.slice(1)
        : `Unless marked, amounts are ${copy.phrase}`;
  return (
    <p
      className={cn(
        "text-muted-foreground flex items-start gap-1.5 text-xs",
        className,
      )}
    >
      <Icon aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>
        {lead} · {copy.note}
        {sourceLabel && <> · {sourceLabel}</>}
      </span>
    </p>
  );
}

interface SourceBadgeProps {
  kind: SourceKind;
  /** Specific source name, shown as a hover/assistive description. */
  sourceLabel?: string | null;
  asOf?: IsoDate | IsoTimestamp | null;
  className?: string;
}

/** Shows where a figure came from and how current it is. */
export function SourceBadge({
  kind,
  sourceLabel,
  asOf,
  className,
}: SourceBadgeProps) {
  const copy = copyFor(kind);
  const Icon = copy.icon;
  const description = sourceLabel
    ? `${sourceLabel}. ${copy.description}`
    : copy.description;

  // No title tooltip (unreachable on touch): the specific source name is
  // shown, and the full description is available to screen readers.
  return (
    <span
      className={cn(
        "bg-muted/50 text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        className,
      )}
    >
      <Icon aria-hidden className="size-3 shrink-0" />
      <span>{sourceLabel ?? copy.label}</span>
      {asOf && (
        <>
          <span aria-hidden>·</span>
          <span>
            as of <DateDisplay value={asOf} />
          </span>
        </>
      )}
      <span className="sr-only">. {description}</span>
    </span>
  );
}
