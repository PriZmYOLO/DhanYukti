/**
 * Golden fixtures for the family cover engine. Every expected number is
 * worked out by hand from the rules in lib/server/engines/cover/engine.ts.
 * Run: npm run test:engine
 */
import assert from "node:assert/strict";

import type {
  CoverProfile,
  DeclaredCover,
  ProfileMember,
} from "../lib/contracts/cover-engine";
import { DEFAULT_FILTERS } from "../lib/contracts/cover-engine";
import { planCover } from "../lib/server/engines/cover/engine";

const L = 100_000 * 100;
const inr = (lakh: number) => ({
  amount_paise: Math.round(lakh * L),
  currency: "INR" as const,
});
const now = new Date("2026-09-27T06:00:00+05:30");
let passed = 0;

function member(
  id: string,
  relation: ProfileMember["relation"],
  age: number | null,
  incomeLakh?: number,
): ProfileMember {
  return {
    id,
    relation,
    age,
    earns: incomeLakh !== undefined,
    annual_income: incomeLakh === undefined ? null : inr(incomeLakh),
  };
}
function cover(
  id: string,
  kind: DeclaredCover["kind"],
  ids: string[],
  lakh: number | null,
  employer = false,
): DeclaredCover {
  return {
    id,
    kind,
    member_ids: ids,
    sum_insured: lakh === null ? null : inr(lakh),
    employer,
    source: "declared",
  };
}
function profile(p: Partial<CoverProfile>): CoverProfile {
  return {
    version: 1,
    city_tier: "metro",
    members: [],
    annual_expenses: null,
    loans_outstanding: null,
    liquid_savings: null,
    existing: [],
    pmjjby_member_ids: [],
    pmsby_member_ids: [],
    vay_vandana_member_ids: [],
    filters: DEFAULT_FILTERS,
    updated_at: null,
    ...p,
  };
}
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`PASS  ${name}`);
}
const unit = (plan: ReturnType<typeof planCover>, id: string) => {
  const u = plan.units.find((x) => x.unit_id === id);
  assert.ok(u, `unit ${id} exists`);
  return u!;
};

// 1. The team's example household (metro).
const example = profile({
  members: [
    member("me", "self", 35, 12),
    member("wife", "spouse", 33),
    member("son", "child", 8),
    member("daughter", "child", 5),
    member("father", "parent", 64),
    member("mother", "parent", 61),
  ],
  annual_expenses: inr(6),
  loans_outstanding: inr(20),
  liquid_savings: inr(3),
  existing: [
    cover("c1", "health", ["me", "wife", "son", "daughter"], 10),
    cover("c2", "health", ["father", "mother"], 5),
    cover("c3", "life", ["me"], 100),
    cover("c4", "health", ["daughter"], 3),
    cover("c5", "health", ["me"], 5, true),
  ],
});
const p1 = planCover(
  example,
  { father: ["diabetes"] },
  { input_hash: "t", now },
);

check(
  "family floater: ₹10L need, ₹10L have (least-covered member) → covered",
  () => {
    const u = unit(p1, "health-family");
    assert.equal(u.need!.amount_paise, 10 * L);
    assert.equal(u.have.amount_paise, 10 * L);
    assert.equal(u.status, "covered");
    assert.equal(
      u.have_items.find((i) => i.source_id === "c5")!.counted,
      false,
    );
    assert.equal(
      u.have_items.find((i) => i.source_id === "c4")!.note,
      "not_all_members",
    );
  },
);
check("parents: ₹10L need, ₹5L have → ₹5L gap, priority 1", () => {
  const u = unit(p1, "health-parents");
  assert.equal(u.gap!.amount_paise, 5 * L);
  assert.equal(u.priority, 1);
});
check(
  "life (me): 6L × 20 yrs + 20L loans − 3L savings = ₹1.37 Cr; have ₹1 Cr → ₹37L gap; term to 60",
  () => {
    const u = unit(p1, "life-me");
    assert.equal(u.years_needed, 20);
    assert.equal(u.need!.amount_paise, 137 * L);
    assert.equal(u.gap!.amount_paise, 37 * L);
    assert.equal(u.term_until_age, 60);
    assert.equal(u.priority, 2);
  },
);
check("accident (me): 5 × ₹12L = ₹60L gap, priority 3", () => {
  const u = unit(p1, "accident-me");
  assert.equal(u.gap!.amount_paise, 60 * L);
  assert.equal(u.priority, 3);
});
check(
  "specs: parents senior floater ₹5L (top-up structure, disclose diabetes), term ₹40L (rounded to ₹5L), PA ₹60L",
  () => {
    const parents = p1.specs.find((s) => s.unit_id === "health-parents")!;
    assert.equal(parents.cover_type, "senior_floater");
    assert.equal(parents.sum_insured.amount_paise, 5 * L);
    assert.ok(parents.must_have.includes("super_top_up_structure"));
    assert.ok(parents.must_have.includes("separate_from_family_floater"));
    assert.ok(parents.notes.includes("disclose_conditions"));
    assert.equal(
      p1.specs.find((s) => s.unit_id === "life-me")!.sum_insured.amount_paise,
      40 * L,
    );
    assert.equal(
      p1.specs.find((s) => s.unit_id === "accident-me")!.sum_insured
        .amount_paise,
      60 * L,
    );
    assert.equal(
      p1.specs.some((s) => s.unit_id === "health-family"),
      false,
    );
  },
);
check(
  "public first: PMSBY/PMJJBY for adults by age band; children excluded",
  () => {
    const s = (m: string, sch: string) =>
      p1.public_first.find((x) => x.member_id === m && x.scheme === sch)
        ?.status;
    assert.equal(s("me", "pmjjby"), "consider");
    assert.equal(s("father", "pmjjby"), "not_eligible");
    assert.equal(s("father", "pmsby"), "consider");
    assert.equal(s("son", "pmsby"), undefined);
  },
);
check(
  "firewall: output has no insurer names or prices, and is deterministic",
  () => {
    const again = planCover(
      example,
      { father: ["diabetes"] },
      { input_hash: "t", now },
    );
    assert.deepEqual(again, p1);
    const text = JSON.stringify(p1).toUpperCase();
    const insurer =
      /\b(HDFC|ICICI|SBI|ACKO|LOMBARD|ERGO|MAX LIFE|AXIS|NIVA|BUPA|STAR HEALTH|LIC|BAJAJ|TATA)\b/;
    assert.equal(
      insurer.test(text),
      false,
      `output mentions an insurer: ${text.match(insurer)?.[0]}`,
    );
  },
);

// 2. Unknowns stay unknown.
const p2 = planCover(
  profile({
    city_tier: null,
    members: [member("me", "self", 30, undefined), member("w", "spouse", null)],
    existing: [],
  }),
  {},
  { input_hash: "t", now },
);
check("no city tier → health unknown (not zero), missing city_tier", () => {
  const u = unit(p2, "health-family");
  assert.equal(u.status, "unknown");
  assert.equal(u.need, null);
  assert.ok(p2.missing.includes("city_tier"));
});
check("no earners → no life or accident lines", () => {
  assert.equal(
    p2.units.some((u) => u.kind === "life" || u.kind === "accident"),
    false,
  );
});
const p2b = planCover(
  profile({ members: [member("me", "self", 30), member("k", "child", 3)] }),
  {},
  { input_hash: "t", now },
);
check("earner with income not told → life/accident unknown", () => {
  const withIncomeUnknown = profile({
    members: [
      { ...member("me", "self", 30), earns: true },
      member("k", "child", 3),
    ],
  });
  const p = planCover(withIncomeUnknown, {}, { input_hash: "t", now });
  assert.equal(unit(p, "life-me").status, "unknown");
  assert.ok(unit(p, "life-me").missing.includes("annual_income"));
  assert.equal(
    p2b.units.some((u) => u.kind === "life"),
    false,
  );
});

// 3. No dependants, no loans → life not needed; accident still 5×.
const p3 = planCover(
  profile({ members: [member("me", "self", 26, 8)] }),
  {},
  { input_hash: "t", now },
);
check("single earner, no dependants → life not_needed; accident ₹40L", () => {
  assert.equal(unit(p3, "life-me").status, "not_needed");
  assert.equal(unit(p3, "accident-me").need!.amount_paise, 40 * L);
});

// 4. Parent 72 enrolled in Vay Vandana.
const p4 = planCover(
  profile({
    city_tier: "tier2",
    members: [member("me", "self", 45, 10), member("dad", "parent", 72)],
    vay_vandana_member_ids: ["dad"],
  }),
  {},
  { input_hash: "t", now },
);
check("tier-2 parent 72 with Vay Vandana: need ₹7L, have ₹5L → ₹2L gap", () => {
  const u = unit(p4, "health-parents");
  assert.equal(u.need!.amount_paise, 7 * L);
  assert.equal(u.have.amount_paise, 5 * L);
  assert.equal(u.gap!.amount_paise, 2 * L);
  assert.equal(
    p4.public_first.find((s) => s.scheme === "vay_vandana")!.status,
    "already",
  );
});

// 5. Two earners share the household need by income.
const p5 = planCover(
  profile({
    members: [
      member("a", "self", 34, 12),
      member("b", "spouse", 32, 6),
      member("c", "child", 10),
    ],
    annual_expenses: inr(6),
  }),
  {},
  { input_hash: "t", now },
);
check("two earners: 6L × 15 yrs = ₹90L split 2:1 → ₹60L and ₹30L", () => {
  assert.equal(unit(p5, "life-a").need!.amount_paise, 60 * L);
  assert.equal(unit(p5, "life-b").need!.amount_paise, 30 * L);
  assert.equal(unit(p5, "life-a").term_until_age, 60);
});

// 6. Without expenses: 10× income + loans (L2), and PMJJBY counts.
const p6 = planCover(
  profile({
    members: [member("me", "self", 40, 10), member("w", "spouse", 38)],
    loans_outstanding: inr(15),
    pmjjby_member_ids: ["me"],
  }),
  {},
  { input_hash: "t", now },
);
check(
  "no expenses: 10 × ₹10L + ₹15L loans = ₹1.15 Cr; PMJJBY ₹2L counted → ₹1.13 Cr gap",
  () => {
    const u = unit(p6, "life-me");
    assert.equal(u.need!.amount_paise, 115 * L);
    assert.equal(u.gap!.amount_paise, 113 * L);
    assert.ok(u.rule_ids.includes("L2"));
    assert.ok(u.missing.includes("annual_expenses"));
  },
);

// 7. A policy with unknown sum insured doesn't count and is flagged.
const p7 = planCover(
  profile({
    members: [member("me", "self", 30, 9)],
    existing: [cover("x", "health", ["me"], null)],
  }),
  {},
  { input_hash: "t", now },
);
check(
  "existing policy without sum insured → not counted, flagged as missing",
  () => {
    const u = unit(p7, "health-family");
    assert.equal(u.have.amount_paise, 0);
    assert.ok(u.missing.includes("existing_sum_insured"));
  },
);

console.log(`\n${passed} checks passed`);
