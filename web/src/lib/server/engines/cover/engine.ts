/**
 * DhanYukti family cover engine (health, life, accident).
 *
 * Deterministic and versioned: the same inputs always give the same plan,
 * and every line names the rules that produced it. The engine never sees
 * an insurer name, a product, a price or a commission (FIREWALL): it can't
 * favour anyone because nobody is in its inputs.
 *
 * Amounts are integer paise. Unknown inputs stay unknown: a line that
 * needs a missing input is "unknown", never a guess and never zero.
 *
 * Rule values below are DhanYukti defaults based on common planning
 * practice, not IRDAI rules; they are shown to the family as assumptions.
 * Public-scheme facts are from the Department of Financial Services
 * (PMJJBY, PMSBY) and the National Health Authority (Ayushman Vay Vandana).
 *
 * Pure, type-only imports: runs in Next and in scripts/cover-engine-fixtures.ts.
 */
import type { MoneyPaise } from "../../../contracts/common";
import type {
  CityTier,
  CoverKind,
  CoverPlan,
  CoverProfile,
  CoverSpec,
  CoverUnit,
  FeatureCode,
  HaveItem,
  MemberConditions,
  NoteCode,
  ProfileMember,
  PublicStep,
} from "../../../contracts/cover-engine";

export const RULESET_VERSION = "cover-2026-09-27.1";

const L = 100_000 * 100; // ₹1 lakh in paise
const rs = (paise: number): MoneyPaise => ({
  amount_paise: Math.round(paise),
  currency: "INR",
});

/** Every rule, with the value it uses. Shown to the family as assumptions. */
export const RULES = {
  H1: { floater_base: { metro: 10 * L, tier2: 7 * L, tier3: 5 * L } },
  H2: { extra_per_member_over_4: 2.5 * L },
  H3: { senior_age: 60 },
  H4: { senior_base: { metro: 10 * L, tier2: 7 * L, tier3: 5 * L } },
  H5: {}, // a policy counts for a unit only if it covers every member of it
  H6: {}, // employer group cover is shown, not counted
  H7: {}, // declared conditions: PED wait within the family's filter, disclose
  L1: { child_independence_age: 25, min_years: 10 },
  L2: { income_multiple: 10 },
  L3: {}, // no dependants and no loans: life cover not needed
  L4: { term_min_end_age: 60, term_max_end_age: 70 },
  A1: { income_multiple: 5 },
  P1: {}, // public schemes before any private cover
  P2: {}, // order: family health, parents' health, earners' life, accident
  S1: { round_health: 1 * L, round_life: 5 * L, round_accident: 1 * L },
} as const;

export const PUBLIC = {
  pmjjby: { premium: 436 * 100, cover: 2 * L, join: [18, 50] as const },
  pmsby: { premium: 20 * 100, cover: 2 * L, join: [18, 70] as const },
  vay_vandana: { premium: 0, cover: 5 * L, min_age: 70 },
};

function roundUp(paise: number, step: number) {
  return Math.ceil(paise / step) * step;
}

function isAdult(m: ProfileMember) {
  return m.age === null ? m.relation !== "child" : m.age >= 18;
}

/* ------------------------------ public first ---------------------------- */

function publicSteps(profile: CoverProfile): PublicStep[] {
  const steps: PublicStep[] = [];
  for (const m of profile.members) {
    if (!isAdult(m)) continue;
    const add = (
      scheme: PublicStep["scheme"],
      enrolled: boolean,
      eligible: boolean | null,
    ) =>
      steps.push({
        scheme,
        member_id: m.id,
        status: enrolled
          ? "already"
          : eligible === null
            ? "unknown"
            : eligible
              ? "consider"
              : "not_eligible",
        annual_premium: rs(PUBLIC[scheme].premium),
        cover: rs(PUBLIC[scheme].cover),
      });
    const inBand = (band: readonly [number, number]) =>
      m.age === null ? null : m.age >= band[0] && m.age <= band[1];
    add(
      "pmsby",
      profile.pmsby_member_ids.includes(m.id),
      inBand(PUBLIC.pmsby.join),
    );
    add(
      "pmjjby",
      profile.pmjjby_member_ids.includes(m.id),
      inBand(PUBLIC.pmjjby.join),
    );
    if (m.age !== null && m.age >= PUBLIC.vay_vandana.min_age) {
      add("vay_vandana", profile.vay_vandana_member_ids.includes(m.id), true);
    }
  }
  return steps;
}

/* -------------------------------- helpers ------------------------------- */

/**
 * Cover a unit already has: per member, the sum of counted policies
 * covering them; the unit has what its least-covered member has (H5).
 */
function haveFor(
  profile: CoverProfile,
  kind: CoverKind,
  memberIds: string[],
  extras: (memberId: string) => { source_id: string; amount: number }[],
): { have: number; items: HaveItem[]; unknownSums: boolean } {
  const items: HaveItem[] = [];
  let unknownSums = false;
  const perMember = new Map<string, number>(memberIds.map((id) => [id, 0]));

  for (const cover of profile.existing.filter((c) => c.kind === kind)) {
    const touches = cover.member_ids.some((id) => perMember.has(id));
    if (!touches) continue;
    if (cover.sum_insured === null) {
      unknownSums = true;
      continue;
    }
    const amount = cover.sum_insured.amount_paise;
    if (cover.employer) {
      items.push({
        source_id: cover.id,
        amount: rs(amount),
        counted: false,
        note: "employer_not_counted",
      });
      continue;
    }
    for (const id of cover.member_ids) {
      if (perMember.has(id)) perMember.set(id, perMember.get(id)! + amount);
    }
    const coversAll = memberIds.every((id) => cover.member_ids.includes(id));
    items.push({
      source_id: cover.id,
      amount: rs(amount),
      counted: coversAll,
      note: coversAll ? "counted" : "not_all_members",
    });
  }
  for (const id of memberIds) {
    for (const extra of extras(id)) {
      perMember.set(id, perMember.get(id)! + extra.amount);
      if (!items.some((i) => i.source_id === extra.source_id)) {
        items.push({
          source_id: extra.source_id,
          amount: rs(extra.amount),
          counted: true,
          note: "public_scheme",
        });
      }
    }
  }
  const have = memberIds.length
    ? Math.min(...Array.from(perMember.values()))
    : 0;
  return { have, items, unknownSums };
}

function finish(
  unit: Omit<CoverUnit, "gap" | "status" | "priority">,
): CoverUnit {
  if (unit.need === null) {
    return { ...unit, gap: null, status: "unknown", priority: null };
  }
  const gap = Math.max(0, unit.need.amount_paise - unit.have.amount_paise);
  return {
    ...unit,
    gap: rs(gap),
    status: gap > 0 ? "gap" : "covered",
    priority: null,
  };
}

/* --------------------------------- health ------------------------------- */

function healthUnits(
  profile: CoverProfile,
  tier: CityTier | null,
): CoverUnit[] {
  const units: CoverUnit[] = [];
  const family = profile.members.filter((m) =>
    ["self", "spouse", "child"].includes(m.relation),
  );
  const parents = profile.members.filter((m) => m.relation === "parent");
  const others = profile.members.filter((m) => m.relation === "other");
  const vv = (id: string) => {
    const m = profile.members.find((x) => x.id === id);
    const eligible =
      m !== undefined &&
      m.age !== null &&
      m.age >= PUBLIC.vay_vandana.min_age &&
      profile.vay_vandana_member_ids.includes(id);
    return eligible
      ? [{ source_id: "vay_vandana", amount: PUBLIC.vay_vandana.cover }]
      : [];
  };

  if (family.length) {
    const ids = family.map((m) => m.id);
    const extra =
      Math.max(0, family.length - 4) * RULES.H2.extra_per_member_over_4;
    const need = tier ? RULES.H1.floater_base[tier] + extra : null;
    const { have, items, unknownSums } = haveFor(
      profile,
      "health",
      ids,
      () => [],
    );
    units.push(
      finish({
        unit_id: "health-family",
        kind: "health",
        label: "family",
        member_ids: ids,
        need: need === null ? null : rs(need),
        have: rs(have),
        have_items: items,
        rule_ids: ["H1", "H2", "H5", "H6"],
        missing: [
          ...(tier ? [] : ["city_tier"]),
          ...(unknownSums ? ["existing_sum_insured"] : []),
        ],
        term_until_age: null,
        years_needed: null,
      }),
    );
  }

  if (parents.length) {
    const ids = parents.map((m) => m.id);
    const need = tier ? RULES.H4.senior_base[tier] : null;
    const { have, items, unknownSums } = haveFor(profile, "health", ids, vv);
    units.push(
      finish({
        unit_id: "health-parents",
        kind: "health",
        label: "parents",
        member_ids: ids,
        need: need === null ? null : rs(need),
        have: rs(have),
        have_items: items,
        rule_ids: ["H3", "H4", "H5", "H6"],
        missing: [
          ...(tier ? [] : ["city_tier"]),
          ...(parents.some((p) => p.age === null) ? ["member_age"] : []),
          ...(unknownSums ? ["existing_sum_insured"] : []),
        ],
        term_until_age: null,
        years_needed: null,
      }),
    );
  }

  for (const m of others) {
    const need = tier ? RULES.H1.floater_base[tier] / 2 : null;
    const { have, items, unknownSums } = haveFor(profile, "health", [m.id], vv);
    units.push(
      finish({
        unit_id: `health-${m.id}`,
        kind: "health",
        label: "member",
        member_ids: [m.id],
        need: need === null ? null : rs(need),
        have: rs(have),
        have_items: items,
        rule_ids: ["H1", "H5", "H6"],
        missing: [
          ...(tier ? [] : ["city_tier"]),
          ...(unknownSums ? ["existing_sum_insured"] : []),
        ],
        term_until_age: null,
        years_needed: null,
      }),
    );
  }
  return units;
}

/* ---------------------------------- life -------------------------------- */

function lifeAndAccidentUnits(profile: CoverProfile): CoverUnit[] {
  const units: CoverUnit[] = [];
  const earners = profile.members.filter((m) => m.earns);
  if (!earners.length) return units;

  const dependants = profile.members.filter(
    (m) =>
      !m.earns &&
      (m.relation === "spouse" ||
        m.relation === "child" ||
        m.relation === "parent"),
  );
  const children = profile.members.filter((m) => m.relation === "child");
  const youngest = children
    .map((c) => c.age)
    .filter((a): a is number => a !== null)
    .sort((a, b) => a - b)[0];
  const childAgeUnknown = children.some((c) => c.age === null);
  const yearsNeeded =
    children.length && youngest !== undefined
      ? Math.max(RULES.L1.child_independence_age - youngest, RULES.L1.min_years)
      : RULES.L1.min_years;

  const loans = profile.loans_outstanding?.amount_paise ?? 0;
  const savings = profile.liquid_savings?.amount_paise ?? 0;
  const knownIncomes = earners.every((e) => e.annual_income !== null);
  const totalIncome = earners.reduce(
    (sum, e) => sum + (e.annual_income?.amount_paise ?? 0),
    0,
  );

  for (const e of earners) {
    const income = e.annual_income?.amount_paise ?? null;
    const share =
      knownIncomes && totalIncome > 0 ? (income ?? 0) / totalIncome : null;
    const noDependants = dependants.length === 0 && loans === 0;

    // Life (L1–L4)
    let lifeNeed: number | null = null;
    const lifeRules = ["L1", "L4"];
    const missing: string[] = [];
    if (noDependants) {
      lifeRules.push("L3");
    } else if (income === null || share === null) {
      missing.push("annual_income");
    } else if (profile.annual_expenses) {
      const household =
        profile.annual_expenses.amount_paise * yearsNeeded + loans - savings;
      lifeNeed = Math.max(0, household) * share;
    } else {
      lifeRules.push("L2");
      lifeNeed = RULES.L2.income_multiple * income + loans * share;
      missing.push("annual_expenses");
    }
    if (childAgeUnknown) missing.push("member_age");

    const pmjjby = profile.pmjjby_member_ids.includes(e.id)
      ? [{ source_id: "pmjjby", amount: PUBLIC.pmjjby.cover }]
      : [];
    const life = haveFor(profile, "life", [e.id], () => pmjjby);
    if (life.unknownSums) missing.push("existing_sum_insured");
    const until =
      e.age === null
        ? null
        : Math.min(
            RULES.L4.term_max_end_age,
            Math.max(RULES.L4.term_min_end_age, e.age + yearsNeeded),
          );

    if (noDependants) {
      units.push({
        unit_id: `life-${e.id}`,
        kind: "life",
        label: "earner",
        member_ids: [e.id],
        need: null,
        have: rs(life.have),
        have_items: life.items,
        gap: null,
        status: "not_needed",
        priority: null,
        rule_ids: lifeRules,
        missing: [],
        term_until_age: null,
        years_needed: null,
      });
    } else {
      units.push(
        finish({
          unit_id: `life-${e.id}`,
          kind: "life",
          label: "earner",
          member_ids: [e.id],
          need: lifeNeed === null ? null : rs(lifeNeed),
          have: rs(life.have),
          have_items: life.items,
          rule_ids: lifeRules,
          missing,
          term_until_age: until,
          years_needed: yearsNeeded,
        }),
      );
    }

    // Accident (A1)
    const pmsby = profile.pmsby_member_ids.includes(e.id)
      ? [{ source_id: "pmsby", amount: PUBLIC.pmsby.cover }]
      : [];
    const acc = haveFor(profile, "accident", [e.id], () => pmsby);
    units.push(
      finish({
        unit_id: `accident-${e.id}`,
        kind: "accident",
        label: "earner",
        member_ids: [e.id],
        need: income === null ? null : rs(RULES.A1.income_multiple * income),
        have: rs(acc.have),
        have_items: acc.items,
        rule_ids: ["A1"],
        missing: [
          ...(income === null ? ["annual_income"] : []),
          ...(acc.unknownSums ? ["existing_sum_insured"] : []),
        ],
        term_until_age: null,
        years_needed: null,
      }),
    );
  }
  return units;
}

/* -------------------------------- specs --------------------------------- */

function specFor(
  unit: CoverUnit,
  profile: CoverProfile,
  conditions: MemberConditions,
): CoverSpec | null {
  if (unit.status !== "gap" || !unit.gap) return null;
  const f = profile.filters;
  const hasConditions = unit.member_ids.some(
    (id) => (conditions[id] ?? []).length > 0,
  );
  const notes: NoteCode[] = [];
  const must: FeatureCode[] = [];
  const members = unit.member_ids
    .map((id) => profile.members.find((m) => m.id === id))
    .filter((m): m is ProfileMember => Boolean(m));

  if (unit.kind === "health") {
    must.push(
      "cashless_network_nearby",
      "no_disease_sublimits",
      "pre_post_hospitalisation",
      "day_care",
    );
    if (f.room_rent_no_cap) must.push("no_room_rent_cap");
    must.push("copay_max", "ped_wait_max");
    if (f.restore_benefit) must.push("restore_benefit");
    if (
      f.maternity &&
      unit.label === "family" &&
      members.some(
        (m) =>
          (m.relation === "self" || m.relation === "spouse") &&
          (m.age === null || m.age < 45),
      )
    ) {
      must.push("maternity");
    }
    if (f.opd) must.push("opd");
    if (unit.have.amount_paise > 0) must.push("super_top_up_structure");
    if (unit.label === "parents") must.push("separate_from_family_floater");
    if (hasConditions)
      notes.push("disclose_conditions", "moratorium_five_years");
    if (unit.label === "parents") notes.push("senior_loading_possible");
    if (unit.have_items.some((i) => i.note === "employer_not_counted")) {
      notes.push("employer_cover_ends");
    }
    return {
      unit_id: unit.unit_id,
      cover_type:
        unit.label === "family"
          ? "family_floater"
          : unit.label === "parents" && members.length > 1
            ? "senior_floater"
            : "individual_health",
      member_ids: unit.member_ids,
      sum_insured: rs(roundUp(unit.gap.amount_paise, RULES.S1.round_health)),
      term_until_age: null,
      must_have: must,
      notes,
      filter_values: {
        copay_max_pct: f.copay_max_pct,
        ped_wait_max_months: f.ped_wait_max_months,
      },
    };
  }

  if (unit.kind === "life") {
    must.push("pure_term");
    for (const r of f.term_riders) must.push(`rider_${r}` as FeatureCode);
    notes.push("cover_capped_by_income");
    if (hasConditions) notes.push("disclose_conditions");
    if (unit.have_items.some((i) => i.note === "employer_not_counted")) {
      notes.push("employer_cover_ends");
    }
    return {
      unit_id: unit.unit_id,
      cover_type: "term_life",
      member_ids: unit.member_ids,
      sum_insured: rs(roundUp(unit.gap.amount_paise, RULES.S1.round_life)),
      term_until_age: unit.term_until_age,
      must_have: must,
      notes,
      filter_values: {
        copay_max_pct: f.copay_max_pct,
        ped_wait_max_months: f.ped_wait_max_months,
      },
    };
  }

  must.push("permanent_disability", "temporary_disability_income");
  notes.push("motor_pa_not_counted");
  return {
    unit_id: unit.unit_id,
    cover_type: "personal_accident",
    member_ids: unit.member_ids,
    sum_insured: rs(roundUp(unit.gap.amount_paise, RULES.S1.round_accident)),
    term_until_age: null,
    must_have: must,
    notes,
    filter_values: {
      copay_max_pct: f.copay_max_pct,
      ped_wait_max_months: f.ped_wait_max_months,
    },
  };
}

/** P2: family health, parents' health, earners' life (highest income first), accident, others. */
function orderKey(unit: CoverUnit, profile: CoverProfile): number {
  const income = (id: string) =>
    profile.members.find((m) => m.id === id)?.annual_income?.amount_paise ?? 0;
  if (unit.unit_id === "health-family") return 0;
  if (unit.unit_id === "health-parents") return 1;
  if (unit.kind === "life") return 2 + 1 / (1 + income(unit.member_ids[0]));
  if (unit.kind === "accident") return 4 + 1 / (1 + income(unit.member_ids[0]));
  return 6;
}

export function planCover(
  profile: CoverProfile,
  conditions: MemberConditions,
  meta: { input_hash: string; now?: Date },
): CoverPlan {
  const units = [
    ...healthUnits(profile, profile.city_tier),
    ...lifeAndAccidentUnits(profile),
  ].sort((a, b) => orderKey(a, profile) - orderKey(b, profile));

  let priority = 1;
  for (const unit of units) {
    if (unit.status === "gap") unit.priority = priority++;
  }

  const missing = new Set<string>();
  if (!profile.city_tier) missing.add("city_tier");
  if (!profile.members.some((m) => m.relation === "self"))
    missing.add("self_member");
  if (profile.members.some((m) => m.age === null)) missing.add("member_age");
  if (!profile.annual_expenses) missing.add("annual_expenses");

  return {
    ruleset_version: RULESET_VERSION,
    generated_at: (meta.now ?? new Date()).toISOString(),
    input_hash: meta.input_hash,
    public_first: publicSteps(profile),
    units,
    specs: units
      .map((u) => specFor(u, profile, conditions))
      .filter((s): s is CoverSpec => s !== null),
    missing: Array.from(missing),
    receipt_id: null,
    rules_used: {
      floater_base: {
        metro: rs(RULES.H1.floater_base.metro),
        tier2: rs(RULES.H1.floater_base.tier2),
        tier3: rs(RULES.H1.floater_base.tier3),
      },
      senior_base: {
        metro: rs(RULES.H4.senior_base.metro),
        tier2: rs(RULES.H4.senior_base.tier2),
        tier3: rs(RULES.H4.senior_base.tier3),
      },
      extra_per_member_over_4: rs(RULES.H2.extra_per_member_over_4),
      senior_age: RULES.H3.senior_age,
      child_independence_age: RULES.L1.child_independence_age,
      min_years: RULES.L1.min_years,
      life_income_multiple: RULES.L2.income_multiple,
      accident_income_multiple: RULES.A1.income_multiple,
      term_end_age: [RULES.L4.term_min_end_age, RULES.L4.term_max_end_age],
    },
  };
}
