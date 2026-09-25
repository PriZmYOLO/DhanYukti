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

const sourceKindCopy: Record<
  SourceKind,
  { label: string; description: string; icon: LucideIcon }
> = {
  observed: {
    label: "From a connected source",
    description: "Received from a source a member gave permission for.",
    icon: Link2,
  },
  declared: {
    label: "Entered by a member",
    description: "Typed in by a household member; not checked against a bank.",
    icon: PencilLine,
  },
  inferred: {
    label: "Estimated",
    description: "Worked out from a pattern in permitted data; may be wrong.",
    icon: Sparkles,
  },
  scenario: {
    label: "What-if",
    description: "Part of a scenario; it does not change your real plan.",
    icon: FlaskConical,
  },
};

/** For a source kind the frontend doesn't recognise; claims nothing. */
const unknownSource = {
  label: "Source not known",
  description: "Where this came from could not be read.",
  icon: CircleHelp,
};

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
  const copy = sourceKindCopy[kind] ?? unknownSource;
  const Icon = copy.icon;
  const description = sourceLabel
    ? `${sourceLabel}. ${copy.description}`
    : copy.description;

  return (
    <span
      title={description}
      className={cn(
        "bg-muted/50 text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        className,
      )}
    >
      <Icon aria-hidden className="size-3 shrink-0" />
      <span>{copy.label}</span>
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
