"use client";

import { useHomeText } from "@/components/home/home-text";
import { WhySheet } from "@/components/home/why-sheet";
import type { WhyView } from "@/lib/home/why-view";

/**
 * "Worked out from N amounts entered by your household · Why this?"
 *
 * N is the number of released evidence items already in the Why view — a
 * count of what is shown there, not a calculation. The source phrase appears
 * only when every item was entered by a household member; the method itself
 * is never described here (the released formula lives in the Why sheet).
 */
export function EvidenceLine({ view }: { view: WhyView }) {
  const text = useHomeText();
  const count = view.evidence.length;
  const allMemberEntered =
    count > 0 && view.evidence.every((item) => item.source_kind === "declared");

  return (
    <p className="text-muted-foreground text-sm">
      {count > 0 && (
        <>
          {text("workedOutFrom")} {count}{" "}
          {count === 1 ? text("amountOne") : text("amountMany")}
          {allMemberEntered && <> {text("enteredByHousehold")}</>}
          <span aria-hidden> · </span>
        </>
      )}
      <WhySheet view={view} trigger="link" />
    </p>
  );
}
