import type { IsoDate, IsoTimestamp } from "@/lib/contracts/common";
import {
  formatIsoDate,
  formatIsoDateShort,
  formatTimestamp,
  isIsoDate,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface DateDisplayProps {
  /** ISO date ("2026-09-28") or timezone-aware timestamp. null = unknown. */
  value: IsoDate | IsoTimestamp | null;
  unknownLabel?: string;
  /** "short" drops the year ("28 Sept") for compact date columns. */
  format?: "long" | "short";
  className?: string;
}

/** Displays a backend date as supplied; calendar dates are never time-shifted. */
export function DateDisplay({
  value,
  unknownLabel = "Date not known",
  format = "long",
  className,
}: DateDisplayProps) {
  if (value === null) {
    return (
      <span className={cn("text-muted-foreground italic", className)}>
        {unknownLabel}
      </span>
    );
  }

  const text = isIsoDate(value)
    ? format === "short"
      ? formatIsoDateShort(value)
      : formatIsoDate(value)
    : formatTimestamp(value);
  if (text === null) {
    return (
      <span className={cn("text-destructive", className)}>Invalid date</span>
    );
  }

  return (
    <time dateTime={value} className={cn("whitespace-nowrap", className)}>
      {text}
    </time>
  );
}
