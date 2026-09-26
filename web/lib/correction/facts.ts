/**
 * The correction screen's data, built on the server from the released Home
 * view (read through lib/data/home.ts, never changed).
 *
 * The correction flow is a client component, so everything here is
 * serialised into the page payload. It therefore carries only what the flow
 * renders, and only facts this viewer owns: a member corrects their own
 * facts, not a relative's.
 */
import type {
  Availability,
  IsoDate,
  MoneyPaise,
  SourceKind,
} from "@/lib/contracts/common";
import type { HomeData } from "@/lib/data/home";

export interface CorrectableFact {
  fact_id: string;
  label: string;
  amount: MoneyPaise | null;
  per: "day" | "month" | null;
  effective_on: IsoDate | null;
  source_kind: SourceKind;
  source_label: string | null;
  availability: Availability;
  /** Where the fact is used, for the text-only "what would change". */
  used_in: {
    /** The released priority's title, when the priority rests on it. */
    priority_title: string | null;
    consequence: boolean;
  };
}

export type CorrectableFacts =
  | { status: "released"; facts: CorrectableFact[] }
  | { status: "unavailable"; reason: string };

export function buildCorrectableFacts(data: HomeData): CorrectableFacts {
  if (data.projection.status !== "released") {
    return { status: "unavailable", reason: data.projection.reason };
  }
  const { projection } = data.projection;
  const packet =
    data.decision.status === "released" ? data.decision.packet : null;
  const need =
    packet?.priority.status === "released" ? packet.priority.need : null;
  const needRefs = new Set(need?.evidence_refs ?? []);
  const consequenceRefs = new Set(packet?.consequence?.evidence_refs ?? []);

  return {
    status: "released",
    facts: projection.facts
      .filter((fact) => fact.owner_member_id === projection.viewer_member_id)
      .map((fact) => ({
        fact_id: fact.fact_id,
        label: fact.label,
        amount: fact.amount,
        per: fact.per,
        effective_on: fact.effective_on,
        source_kind: fact.source_kind,
        source_label: fact.source_label,
        availability: fact.availability,
        used_in: {
          priority_title:
            need && needRefs.has(fact.fact_id) ? need.title : null,
          consequence: consequenceRefs.has(fact.fact_id),
        },
      })),
  };
}
