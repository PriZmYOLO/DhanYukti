import { CircleHelp } from "lucide-react";

import { HomeText } from "@/components/home/home-text";
import type { MissingFact } from "@/lib/contracts/decision-packet";

type MissingFactItem = Pick<MissingFact, "question" | "why" | "decisive">;

/** Facts the decision does not have (Guide §23). Unknown is never zero. */
export function MissingFactsList({ facts }: { facts: MissingFactItem[] }) {
  return (
    <ul className="space-y-3">
      {facts.map((fact, index) => (
        <li key={`${index}-${fact.question}`} className="flex gap-2.5">
          <CircleHelp
            aria-hidden
            className="text-muted-foreground mt-0.5 size-4 shrink-0"
          />
          <div className="space-y-0.5">
            <p className="font-medium">
              {fact.question}
              {fact.decisive === true && (
                <span className="border-warning/50 bg-warning/15 text-warning-foreground ml-2 inline-flex rounded-full border px-2 py-0.5 align-middle text-xs font-normal">
                  <HomeText k="missingDecisive" />
                </span>
              )}
            </p>
            {fact.why && (
              <p className="text-muted-foreground text-sm">{fact.why}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
