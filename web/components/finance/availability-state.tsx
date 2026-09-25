import {
  Ban,
  CircleAlert,
  CircleDashed,
  CircleHelp,
  CloudOff,
  EyeOff,
  Hourglass,
  Link2Off,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import type { ErrorEnvelope } from "@/lib/contracts/common";
import { cn } from "@/lib/utils";

/**
 * Every "we can't show a figure" situation, drawn from fact availability
 * (Guide §2), import/connection states (Task Pack L04) and viewer visibility.
 * None of these is ever a zero balance or proof that something does not exist.
 */
export type AvailabilityStatus =
  | "unanswered"
  | "dont_know"
  | "not_connected"
  | "pending"
  | "partial"
  | "missing"
  | "unavailable"
  | "disputed"
  | "not_shared"
  | "denied"
  | "revoked"
  | "failed";

type Tone = "neutral" | "warning" | "destructive";

const statusCopy: Record<
  AvailabilityStatus,
  { title: string; description: string; icon: LucideIcon; tone: Tone }
> = {
  unanswered: {
    title: "Not answered yet",
    description:
      "This question has not been answered. It is not treated as zero or none.",
    icon: CircleHelp,
    tone: "neutral",
  },
  dont_know: {
    title: "Marked as not known",
    description:
      "The member said they don't know this yet. It is not treated as zero.",
    icon: CircleHelp,
    tone: "neutral",
  },
  not_connected: {
    title: "Not connected",
    description: "No source has been connected for this yet.",
    icon: Link2Off,
    tone: "neutral",
  },
  pending: {
    title: "Still processing",
    description: "Results will appear when ready. Nothing here means zero.",
    icon: Hourglass,
    tone: "neutral",
  },
  partial: {
    title: "Partly available",
    description: "Some information arrived and some is still missing.",
    icon: CircleDashed,
    tone: "warning",
  },
  missing: {
    title: "Not known yet",
    description:
      "We have not been told about this. It is not the same as none.",
    icon: CircleDashed,
    tone: "neutral",
  },
  unavailable: {
    title: "Not available",
    description:
      "We cannot see this right now. It does not mean it does not exist.",
    icon: CloudOff,
    tone: "neutral",
  },
  disputed: {
    title: "Being checked",
    description: "A member has questioned this. It is shown as disputed.",
    icon: TriangleAlert,
    tone: "warning",
  },
  not_shared: {
    title: "Not shared with you",
    description: "This member has not chosen to share this with you.",
    icon: EyeOff,
    tone: "neutral",
  },
  denied: {
    title: "Permission not given",
    description: "Access was declined, so this information is not used.",
    icon: Ban,
    tone: "warning",
  },
  revoked: {
    title: "Permission withdrawn",
    description: "Access was withdrawn, so this is no longer used.",
    icon: Ban,
    tone: "warning",
  },
  failed: {
    title: "Something went wrong",
    description:
      "We could not get this information. Nothing has been assumed in its place.",
    icon: CircleAlert,
    tone: "destructive",
  },
};

const toneClasses: Record<Tone, string> = {
  neutral: "border-border bg-muted/40 text-muted-foreground",
  warning: "border-warning/50 bg-warning/15 text-warning-foreground",
  // Red marks the icon and border; text stays at full contrast.
  destructive: "border-destructive/40 bg-destructive/5 text-foreground",
};

const iconClasses: Record<Tone, string> = {
  neutral: "",
  warning: "",
  destructive: "text-destructive",
};

interface AvailabilityStateProps {
  status: AvailabilityStatus;
  /** Heading; may be a mode-aware text element. */
  title?: ReactNode;
  /** Body text; may be a mode-aware text element. */
  description?: ReactNode;
  /** Safe error envelope from the backend; only safe fields are displayed. */
  error?: ErrorEnvelope;
  /** Single-line inline form for lists. */
  compact?: boolean;
  /**
   * Announce changes to assistive technology. Only for states that change
   * after a user action; static states would be re-read on every re-render.
   */
  live?: boolean;
  className?: string;
  children?: ReactNode;
}

/** Explains why a figure is not shown, without implying zero or absence. */
export function AvailabilityState({
  status,
  title,
  description,
  error,
  compact = false,
  live = false,
  className,
  children,
}: AvailabilityStateProps) {
  // An unrecognised status is shown as "not available", never as a crash.
  const copy = statusCopy[status] ?? statusCopy.unavailable;
  const Icon = copy.icon;
  const heading = title ?? copy.title;
  const body = error?.safe_message ?? description ?? copy.description;
  // With an error, the released description (if any) precedes its message.
  const lead = error && description ? description : null;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
          toneClasses[copy.tone],
          className,
        )}
        title={typeof body === "string" ? body : undefined}
      >
        <Icon
          aria-hidden
          className={cn("size-3 shrink-0", iconClasses[copy.tone])}
        />
        {heading}
        <span className="sr-only">. {body}</span>
      </span>
    );
  }

  return (
    <div
      role={live ? "status" : undefined}
      className={cn(
        "flex gap-3 rounded-lg border p-3 text-sm",
        toneClasses[copy.tone],
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-4 shrink-0", iconClasses[copy.tone])}
      />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{heading}</p>
        {lead && <p>{lead}</p>}
        <p>{body}</p>
        {error && (
          <p className="text-xs">
            Reference: <span className="font-mono">{error.request_id}</span>
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
