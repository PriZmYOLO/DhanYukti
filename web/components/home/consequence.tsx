import { Hourglass } from "lucide-react";
import type { ReactNode } from "react";

import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { HomeText } from "@/components/home/home-text";
import { ListenInHindi } from "@/components/voice/listen-hindi";
import { VOICE_ENABLED } from "@/lib/capabilities";
import type { Consequence } from "@/lib/contracts/decision-packet";

/**
 * Consequence of delay (Guide §21), rendered only from released fields.
 * A cash gap is described as a shortfall, never as a loss. An amount is shown
 * only when released as a positive magnitude; otherwise the sentence says the
 * amount isn't known rather than disappearing or showing ₹0.
 */
export function ConsequenceOfDelay({
  consequence,
}: {
  consequence: Consequence;
}) {
  const { kind, amount, on, horizon, description } = consequence;
  const knownAmount = amount && amount.amount_paise > 0 ? amount : null;

  const lead = on ? (
    <>
      <HomeText k="consequenceOn" /> <DateDisplay value={on} />,{" "}
    </>
  ) : (
    <>
      <HomeText k="consequenceBy" /> <DateDisplay value={horizon.end} />,{" "}
    </>
  );

  let sentence: ReactNode = null;
  switch (kind) {
    case "cash_gap":
      sentence = knownAmount ? (
        <>
          {lead}
          <HomeText k="consequenceCashGap" /> <Money value={knownAmount} />.
        </>
      ) : (
        <>
          {lead}
          <HomeText k="consequenceCashGapUnknown" />
        </>
      );
      break;
    case "cost":
      sentence = knownAmount ? (
        <>
          {lead}
          <HomeText k="consequenceCost" /> <Money value={knownAmount} />.
        </>
      ) : (
        <>
          {lead}
          <HomeText k="consequenceCostUnknown" />
        </>
      );
      break;
    case "deadline":
    case "exposure":
      // A released description says what actually happens; the generic
      // sentence is only a fallback when none was released.
      sentence = description ? (
        <>
          {on ? <HomeText k="consequenceOn" /> : <HomeText k="consequenceBy" />}{" "}
          <DateDisplay value={on ?? horizon.end} />: {description}
        </>
      ) : (
        <>
          {lead}
          <HomeText
            k={
              kind === "deadline"
                ? "consequenceDeadline"
                : "consequenceExposure"
            }
          />
        </>
      );
      break;
  }

  if (!sentence) return null;
  const extraDescription =
    description && (kind === "cash_gap" || kind === "cost")
      ? description
      : null;

  // A flat dark panel: the counterweight to the headline, not an alarm. The
  // raised mint next-step panel stays the page's one elevated surface.
  return (
    <div className="surface-forest space-y-3 rounded-xl p-5 sm:p-6">
      <p className="text-warning flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase">
        <Hourglass aria-hidden className="size-3.5" />
        <HomeText k="ifNothingChanges" />
      </p>
      <p className="font-heading text-[1.625rem] leading-snug tracking-tight lg:text-[1.875rem]">
        {sentence}
      </p>
      {(extraDescription || kind === "cash_gap") && (
        <div className="text-forest-muted space-y-1 border-t border-current/25 pt-3 text-sm">
          {extraDescription && <p>{extraDescription}</p>}
          {kind === "cash_gap" && (
            <p>
              <HomeText k="consequenceNotLoss" />
            </p>
          )}
        </div>
      )}
      {VOICE_ENABLED && kind === "cash_gap" && knownAmount && on && (
        <ListenInHindi amountPaise={knownAmount.amount_paise} date={on} />
      )}
    </div>
  );
}
