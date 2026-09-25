import type { FactSummary } from "@/lib/contracts/household-projection";

/**
 * Resolves a decision's evidence references against the viewer's projection.
 *
 * Only facts already released to this viewer can be shown. A reference that
 * does not resolve is skipped without comment: announcing "one item you can't
 * see" would reveal that a hidden fact exists (Guide §2), so a mismatch must
 * be fixed in the release policy, not surfaced here.
 */
export function resolveEvidence(
  facts: readonly FactSummary[],
  ...refLists: readonly (readonly string[])[]
): FactSummary[] {
  const byId = new Map(facts.map((fact) => [fact.fact_id, fact]));
  const seen = new Set<string>();
  const resolved: FactSummary[] = [];

  for (const ref of refLists.flat()) {
    if (seen.has(ref)) continue;
    seen.add(ref);
    const fact = byId.get(ref);
    if (fact) resolved.push(fact);
  }
  return resolved;
}
