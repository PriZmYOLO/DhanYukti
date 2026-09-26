import { Gauge } from "lucide-react";

import { HomeText } from "@/components/home/home-text";
import type {
  Confidence,
  ConfidenceLevel,
} from "@/lib/contracts/decision-packet";
import { cn } from "@/lib/utils";

const toneClasses: Record<ConfidenceLevel, string> = {
  high: "border-primary/40 text-primary",
  medium: "border-border text-foreground",
  low: "border-warning/50 bg-warning/15 text-warning-foreground",
  insufficient_evidence:
    "border-warning/50 bg-warning/15 text-warning-foreground",
  not_assessed: "border-border text-muted-foreground",
};

interface ConfidenceBadgeProps {
  confidence: Confidence;
  className?: string;
}

/** Claim-level confidence as released (Guide §23). Never a percentage. */
export function ConfidenceBadge({
  confidence,
  className,
}: ConfidenceBadgeProps) {
  return (
    // The basis is screen-reader text, not a title tooltip (unreachable on
    // touch); it is shown in full in the Why sheet.
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs",
        toneClasses[confidence.level],
        className,
      )}
    >
      <Gauge aria-hidden className="size-3.5 shrink-0" />
      <span>
        <HomeText k="confidence" />:{" "}
        <span className="font-medium">
          <HomeText k={`confidence_${confidence.level}`} />
        </span>
      </span>
      {confidence.basis && (
        <span className="sr-only">. {confidence.basis}</span>
      )}
    </span>
  );
}
