/**
 * The Why drawer's data, built on the server.
 *
 * WhySheet is a client component, so everything passed to it is serialised
 * into the page payload. It therefore receives only what it renders: no raw
 * evidence_refs, need or packet ids, or unreleased packet fields. Evidence is
 * limited to facts already released to this viewer (see resolveEvidence).
 */
import type {
  MoneyPaise,
  IsoDate,
  SourceKind,
  Availability,
} from "@/lib/contracts/common";
import type {
  Confidence,
  DecisionPacket,
  GateDisposition,
  Horizon,
  MissingFact,
  Need,
} from "@/lib/contracts/decision-packet";
import type { FactSummary } from "@/lib/contracts/household-projection";

export interface WhyEvidenceItem {
  label: string;
  amount: MoneyPaise | null;
  per: "day" | "month" | null;
  effective_on: IsoDate | null;
  source_kind: SourceKind;
  source_label: string | null;
  availability: Availability;
}

export interface WhyView {
  title: string;
  reasons: string[];
  assumptions: string[];
  formula: string | null;
  horizon: Horizon | null;
  evidence: WhyEvidenceItem[];
  missing: Pick<MissingFact, "question" | "why" | "decisive">[];
  step: {
    title: string;
    gate: GateDisposition;
    reversible: boolean | null;
    is_ui_preview: boolean;
  } | null;
  confidence: Confidence;
  snapshot_id: string;
  rule_version: string;
  consent_version: string;
}

export function buildWhyView(
  packet: DecisionPacket,
  need: Need,
  evidence: FactSummary[],
  isUiPreview: boolean,
): WhyView {
  const proposal =
    packet.action.status === "released" ? packet.action.proposal : null;

  return {
    title: need.title,
    reasons: need.reasons.map((reason) => reason.text),
    assumptions: need.assumptions,
    formula: packet.consequence?.formula ?? null,
    horizon: packet.consequence?.horizon ?? need.cash_flow?.horizon ?? null,
    evidence: evidence.map((fact) => ({
      label: fact.label,
      amount: fact.amount,
      per: fact.per,
      effective_on: fact.effective_on,
      source_kind: fact.source_kind,
      source_label: fact.source_label,
      availability: fact.availability,
    })),
    missing: packet.missing_facts.map(({ question, why, decisive }) => ({
      question,
      why,
      decisive,
    })),
    step: proposal
      ? {
          title: proposal.title,
          gate: proposal.gate,
          reversible: proposal.reversible,
          is_ui_preview: isUiPreview,
        }
      : null,
    confidence: need.confidence,
    snapshot_id: packet.snapshot_id,
    rule_version: packet.versions.rule_version,
    consent_version: packet.versions.consent_version,
  };
}
