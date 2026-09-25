import type { MoneyPaise } from "@/lib/contracts/common";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MoneyProps {
  /** null means unknown; it renders as "Not known", never as ₹0. */
  value: MoneyPaise | null;
  per?: "day" | "month" | null;
  unknownLabel?: string;
  className?: string;
}

/** Displays a backend money value exactly as supplied (integer paise). */
export function Money({
  value,
  per = null,
  unknownLabel = "Not known",
  className,
}: MoneyProps) {
  if (value === null) {
    return (
      <span className={cn("text-muted-foreground italic", className)}>
        {unknownLabel}
      </span>
    );
  }

  const text = formatMoney(value);
  if (text === null) {
    return (
      <span className={cn("text-destructive", className)}>Invalid amount</span>
    );
  }

  // Always Geist with tabular digits, even inside a serif sentence. A negative
  // amount is muted red; it also carries "−" and sits beside a label, so the
  // colour is never the only signal.
  return (
    <>
      <data
        value={value.amount_paise}
        className={cn(
          "font-sans font-medium whitespace-nowrap tabular-nums",
          value.amount_paise < 0 && "text-negative",
          className,
        )}
      >
        {text}
        {per && (
          <span aria-hidden className="text-muted-foreground font-normal">
            {" "}
            / {per}
          </span>
        )}
      </data>
      {per && <span className="sr-only"> per {per}</span>}
    </>
  );
}
