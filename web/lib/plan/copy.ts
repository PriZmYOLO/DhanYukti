/**
 * Family cover check wording (Plan area), both display modes. Amounts and
 * dates are never in here; they are rendered through Money/DateDisplay.
 */
import type { ModeText } from "@/lib/display-mode";

export const planCopy = {
  planTitle: "Plan",
  planIntro: {
    standard:
      "Work out what your family needs, before anyone tries to sell you something.",
    simple: "See what your family needs first.",
  },
  planCoverCardTitle: {
    standard: "Family cover check",
    simple: "Family insurance check",
  },
  planCoverCardBody: {
    standard:
      "Health, life and accident cover: what each part of your family needs, what you have, and the gap.",
    simple: "What insurance your family needs and what's missing.",
  },
  planOtherSoon: {
    standard: "Other planning tools aren't in this build yet.",
    simple: "More tools are coming.",
  },
  label: "FAMILY COVER CHECK · ESTIMATES, NOT ADVICE",
  labelBody: {
    standard:
      "DhanYukti works out needs and gaps from what you tell it, using published assumptions. It doesn't sell, rank or earn from any insurance, and it never sees insurer names, prices or commissions.",
    simple:
      "We work out what you need. We don't sell insurance or earn from it.",
  },
  coverTitle: {
    standard: "Family cover check",
    simple: "Family insurance check",
  },
  coverIntro: {
    standard:
      "Tell us about your family. We'll show what cover each part needs, what you have, and what to look for.",
    simple: "Tell us about your family. We'll show what's missing.",
  },
  consentTitle: { standard: "First, your consent", simple: "First, your OK" },
  consentBody: {
    standard:
      "This check uses ages, incomes, city, loans and the cover you already have. It's kept only while you allow it (up to 90 days) and deleted the moment you withdraw.",
    simple:
      "We need your OK to use your family details. You can stop any time.",
  },
  consentGive: {
    standard: "Give consent and start",
    simple: "Allow and start",
  },
  loading: "Loading…",
  unavailable: {
    standard:
      "The cover check can't load right now. Nothing has been saved or assumed.",
    simple: "This isn't working right now.",
  },

  // Form
  cityHeading: { standard: "Where you live", simple: "Your city" },
  city_metro: { standard: "Metro city", simple: "Big city" },
  city_tier2: { standard: "Tier-2 city", simple: "Mid-size city" },
  city_tier3: { standard: "Smaller town", simple: "Small town" },
  membersHeading: { standard: "Your family", simple: "Your family" },
  membersLead: {
    standard:
      "Everyone the plan should protect. Leave a box empty if you don't know; it stays unknown.",
    simple: "Add everyone. Leave empty if you don't know.",
  },
  relation: { standard: "Relation", simple: "Who" },
  relation_self: { standard: "Me", simple: "Me" },
  relation_spouse: { standard: "Spouse", simple: "Husband/wife" },
  relation_child: { standard: "Child", simple: "Child" },
  relation_parent: { standard: "Parent", simple: "Parent" },
  relation_other: { standard: "Other", simple: "Other" },
  age: { standard: "Age", simple: "Age" },
  earns: { standard: "Earns", simple: "Earns money" },
  income: { standard: "Income a year (₹)", simple: "Yearly income (₹)" },
  addMember: { standard: "Add a family member", simple: "Add person" },
  remove: { standard: "Remove", simple: "Remove" },
  moneyHeading: { standard: "Household money", simple: "Money" },
  expenses: {
    standard: "Household spending a year (₹)",
    simple: "Yearly spending (₹)",
  },
  loans: { standard: "Loans still to repay (₹)", simple: "Loans left (₹)" },
  savings: { standard: "Savings you could use (₹)", simple: "Savings (₹)" },
  existingHeading: {
    standard: "Cover you already have",
    simple: "Insurance you have",
  },
  existingLead: {
    standard:
      "Only the kind, who it covers and the sum insured. No insurer names are needed or used.",
    simple: "Just what kind, who, and how much.",
  },
  kind: { standard: "Kind", simple: "Kind" },
  kind_health: { standard: "Health", simple: "Health" },
  kind_life: { standard: "Life (term)", simple: "Life" },
  kind_accident: { standard: "Accident", simple: "Accident" },
  who: { standard: "Covers", simple: "For" },
  sumInsured: { standard: "Sum insured (₹)", simple: "Cover amount (₹)" },
  employer: { standard: "From employer", simple: "From job" },
  addCover: { standard: "Add a policy", simple: "Add insurance" },
  hintsHeading: {
    standard: "Found in your bank data",
    simple: "Found in your bank",
  },
  hintsLead: {
    standard:
      "Premiums seen in your linked accounts. Add one, then enter its sum insured.",
    simple: "Payments we found. Add them and type the amount.",
  },
  hintAdd: { standard: "Add", simple: "Add" },
  hintAdded: { standard: "Added", simple: "Added" },
  publicHeading: {
    standard: "Government schemes you already have",
    simple: "Government schemes you have",
  },
  pays_pmsby: { standard: "Pays PMSBY", simple: "Has PMSBY" },
  pays_pmjjby: { standard: "Pays PMJJBY", simple: "Has PMJJBY" },
  has_vay_vandana: {
    standard: "Has Ayushman Vay Vandana card",
    simple: "Has Vay Vandana card",
  },
  conditionsHeading: {
    standard: "Health conditions (optional)",
    simple: "Health problems (optional)",
  },
  conditionsLead: {
    standard:
      "Only yes/no. Used to flag waiting periods and to remind you to declare them; hiding a condition is the most common reason claims are refused.",
    simple: "Only yes or no. Always tell the insurer about these.",
  },
  conditionsConsent: {
    standard: "This needs its own consent, separate from the family details.",
    simple: "This needs a separate OK.",
  },
  conditionsGive: {
    standard: "Give consent for health conditions",
    simple: "Allow health info",
  },
  condition_diabetes: { standard: "Diabetes", simple: "Sugar" },
  condition_hypertension: { standard: "Blood pressure", simple: "BP" },
  condition_heart: { standard: "Heart", simple: "Heart" },
  condition_thyroid: { standard: "Thyroid", simple: "Thyroid" },
  condition_asthma: { standard: "Asthma", simple: "Asthma" },
  condition_other: { standard: "Other", simple: "Other" },
  filtersHeading: { standard: "Your filters", simple: "What you want" },
  filtersLead: {
    standard: "These become requirements in your cover specification.",
    simple: "We'll add these to your checklist.",
  },
  f_room_rent: { standard: "No room-rent limit", simple: "Any hospital room" },
  f_copay: {
    standard: "Highest co-payment you accept",
    simple: "Most you'll pay yourself",
  },
  f_copay_0: { standard: "None", simple: "None" },
  f_ped: {
    standard: "Longest wait for existing illnesses",
    simple: "Longest wait for old illness",
  },
  f_ped_12: { standard: "1 year", simple: "1 year" },
  f_ped_24: { standard: "2 years", simple: "2 years" },
  f_ped_36: {
    standard: "3 years (the IRDAI maximum)",
    simple: "3 years (the most allowed)",
  },
  f_restore: { standard: "Restore benefit", simple: "Cover refills" },
  f_maternity: { standard: "Maternity", simple: "Pregnancy" },
  f_opd: { standard: "OPD (doctor visits)", simple: "Doctor visits" },
  f_riders: { standard: "Term life add-ons", simple: "Life extras" },
  rider_accidental_death: { standard: "Accidental death", simple: "Accident" },
  rider_critical_illness: {
    standard: "Critical illness",
    simple: "Serious illness",
  },
  rider_waiver_of_premium: {
    standard: "Waiver of premium",
    simple: "Stop paying if disabled",
  },
  run: { standard: "Save and check our cover", simple: "Check now" },
  saving: { standard: "Checking…", simple: "Checking…" },

  // Results
  resultsTitle: { standard: "Your family's cover", simple: "Your result" },
  firewall: {
    standard:
      "Worked out without any insurer, product, price or commission. The same details always give the same result.",
    simple: "No company paid for this. Same details, same answer.",
  },
  ruleset: { standard: "Rules", simple: "Rules" },
  receipt: { standard: "Receipt", simple: "Receipt" },
  missingTitle: {
    standard: "Add these for a more exact result",
    simple: "Tell us more",
  },
  missing_city_tier: { standard: "Where you live", simple: "Your city" },
  missing_self_member: {
    standard: "You, in the family list",
    simple: "Add yourself",
  },
  missing_member_age: {
    standard: "Every member's age",
    simple: "Everyone's age",
  },
  missing_annual_expenses: {
    standard: "Household spending a year",
    simple: "Yearly spending",
  },
  missing_annual_income: { standard: "Earners' incomes", simple: "Incomes" },
  missing_existing_sum_insured: {
    standard: "Sum insured of every policy",
    simple: "Amount of each policy",
  },
  step1: {
    standard: "1 · Government schemes first",
    simple: "1 · Government schemes first",
  },
  step1Lead: {
    standard: "Cheapest cover available. DhanYukti earns nothing from them.",
    simple: "Cheapest cover. We earn nothing.",
  },
  scheme_pmsby: { standard: "PMSBY (accident)", simple: "PMSBY (accident)" },
  scheme_pmjjby: { standard: "PMJJBY (life)", simple: "PMJJBY (life)" },
  scheme_vay_vandana: {
    standard: "Ayushman Vay Vandana (hospital, 70+)",
    simple: "Vay Vandana (70+)",
  },
  pstatus_already: { standard: "Already has it", simple: "Has it" },
  pstatus_consider: {
    standard: "Consider enrolling",
    simple: "Think about joining",
  },
  pstatus_not_eligible: {
    standard: "Not eligible by age",
    simple: "Not for this age",
  },
  pstatus_unknown: { standard: "Age not told", simple: "Age not given" },
  perYear: { standard: "a year", simple: "a year" },
  free: { standard: "Free", simple: "Free" },
  cover: { standard: "cover", simple: "cover" },
  step2: {
    standard: "2 · What you need, what you have",
    simple: "2 · Need and have",
  },
  unit_health_family: {
    standard: "Health: family floater",
    simple: "Health: family",
  },
  unit_health_parents: {
    standard: "Health: parents",
    simple: "Health: parents",
  },
  unit_health_member: { standard: "Health", simple: "Health" },
  unit_life_earner: { standard: "Life (term)", simple: "Life" },
  unit_accident_earner: { standard: "Accident", simple: "Accident" },
  need: { standard: "Need", simple: "Need" },
  have: { standard: "Have", simple: "Have" },
  gap: { standard: "Gap", simple: "Missing" },
  status_gap: { standard: "Gap", simple: "Missing" },
  status_covered: { standard: "Covered", simple: "OK" },
  status_not_needed: { standard: "Not needed now", simple: "Not needed" },
  status_unknown: { standard: "Can't tell yet", simple: "Don't know yet" },
  priority: { standard: "Do", simple: "Step" },
  why: { standard: "Why this?", simple: "Why?" },
  until: { standard: "until age", simple: "until age" },
  note_counted: { standard: "counted", simple: "counted" },
  note_employer_not_counted: {
    standard: "not counted: employer cover ends if you change jobs",
    simple: "not counted: ends if you leave your job",
  },
  note_not_all_members: {
    standard: "covers only some members, so it doesn't close this gap",
    simple: "only for some people",
  },
  note_public_scheme: { standard: "government scheme", simple: "government" },
  src_pmjjby: "PMJJBY",
  src_pmsby: "PMSBY",
  src_vay_vandana: "Vay Vandana",
  srcPolicy: { standard: "Policy", simple: "Policy" },
  rule_H1: {
    standard:
      "Family floater size depends on where you live (hospital costs differ).",
    simple: "Bigger cities cost more in hospital.",
  },
  rule_H2: {
    standard: "More than 4 people in a floater: add a little per extra person.",
    simple: "Bigger family, bigger cover.",
  },
  rule_H3: {
    standard:
      "Parents aged 60+ need their own policy; in your floater their claims would use up the family's cover and raise its price.",
    simple: "Parents need their own policy.",
  },
  rule_H4: {
    standard: "Parents' cover size depends on where you live.",
    simple: "Depends on your city.",
  },
  rule_H5: {
    standard:
      "A policy only closes a gap if it covers everyone in that group; we count the least-covered person.",
    simple: "Everyone in the group must be covered.",
  },
  rule_H6: {
    standard: "Employer cover is shown but not counted: it ends with the job.",
    simple: "Job insurance can end.",
  },
  rule_L1: {
    standard:
      "Life cover should replace your support until the youngest child is independent (at least 10 years).",
    simple: "Covers your family until your youngest grows up.",
  },
  rule_L2: {
    standard:
      "Spending not told, so we used 10× income plus loans as a rule of thumb.",
    simple: "We used 10 times income.",
  },
  rule_L3: {
    standard: "No dependants and no loans: life cover isn't a priority now.",
    simple: "Nobody depends on you yet.",
  },
  rule_L4: {
    standard: "Term cover runs to at least 60, at most 70.",
    simple: "Cover till age 60–70.",
  },
  rule_A1: {
    standard:
      "Accident cover of about 5× yearly income replaces income after disability.",
    simple: "Accident cover: 5 times income.",
  },
  step3: {
    standard: "3 · Your cover specification",
    simple: "3 · Your checklist",
  },
  step3Lead: {
    standard:
      "Take this to Bima Sugam, IRDAI's insurance marketplace, or to any insurer. Compare only plans that meet every line.",
    simple: "Show this to any insurer or on Bima Sugam.",
  },
  noSpecs: {
    standard: "No gaps to fill from what you told us.",
    simple: "Nothing missing.",
  },
  spec_family_floater: {
    standard: "Family floater health policy",
    simple: "Family health policy",
  },
  spec_senior_floater: {
    standard: "Senior floater for parents",
    simple: "Health policy for parents",
  },
  spec_individual_health: {
    standard: "Individual health policy",
    simple: "Health policy",
  },
  spec_term_life: { standard: "Term life policy", simple: "Life policy" },
  spec_personal_accident: {
    standard: "Personal accident policy",
    simple: "Accident policy",
  },
  specAdd: { standard: "Add cover of", simple: "Add" },
  specFor: { standard: "For", simple: "For" },
  specMust: { standard: "Must have", simple: "Must have" },
  feat_no_room_rent_cap: { standard: "No room-rent limit", simple: "Any room" },
  feat_copay_max: {
    standard: "Co-payment no more than (%)",
    simple: "You pay at most (%)",
  },
  feat_ped_wait_max: {
    standard: "Existing-illness wait no longer than (months)",
    simple: "Old illness wait at most (months)",
  },
  feat_restore_benefit: {
    standard: "Restore benefit",
    simple: "Cover refills",
  },
  feat_maternity: { standard: "Maternity cover", simple: "Pregnancy" },
  feat_opd: { standard: "OPD cover", simple: "Doctor visits" },
  feat_no_disease_sublimits: {
    standard: "No disease-wise sub-limits",
    simple: "No limits by illness",
  },
  feat_cashless_network_nearby: {
    standard: "Cashless hospitals near you",
    simple: "Cashless hospitals nearby",
  },
  feat_pre_post_hospitalisation: {
    standard: "Pre- and post-hospitalisation",
    simple: "Before and after hospital",
  },
  feat_day_care: { standard: "Day-care procedures", simple: "Day treatments" },
  feat_super_top_up_structure: {
    standard: "Can be a super top-up over your existing policy (often cheaper)",
    simple: "Can be a top-up on your policy",
  },
  feat_separate_from_family_floater: {
    standard: "Separate from the family floater",
    simple: "Separate from family policy",
  },
  feat_pure_term: {
    standard: "Pure term (no investment or return-of-premium)",
    simple: "Plain life cover only",
  },
  feat_rider_accidental_death: {
    standard: "Accidental death rider",
    simple: "Accident extra",
  },
  feat_rider_critical_illness: {
    standard: "Critical illness rider",
    simple: "Serious illness extra",
  },
  feat_rider_waiver_of_premium: {
    standard: "Waiver of premium rider",
    simple: "Stop paying if disabled",
  },
  feat_permanent_disability: {
    standard: "Permanent disability cover",
    simple: "Disability cover",
  },
  feat_temporary_disability_income: {
    standard: "Weekly income during temporary disability",
    simple: "Pay while injured",
  },
  notesTitle: { standard: "Before you buy", simple: "Before you buy" },
  note_disclose_conditions: {
    standard:
      "Declare every health condition on the proposal form. Hiding one is the top reason claims are refused.",
    simple: "Always tell the insurer about health problems.",
  },
  note_senior_loading_possible: {
    standard:
      "Premiums for seniors may be higher or need a medical check. Since 2024 insurers can't refuse cover for age alone.",
    simple: "It may cost more for older people.",
  },
  note_moratorium_five_years: {
    standard:
      "After 5 continuous years, a claim can't be refused for non-disclosure except for fraud.",
    simple: "After 5 years, fewer claim problems.",
  },
  note_employer_cover_ends: {
    standard: "Your employer cover ends if you change jobs.",
    simple: "Job insurance can end.",
  },
  note_motor_pa_not_counted: {
    standard:
      "Accident cover in a motor policy only applies to vehicle accidents, so it isn't counted.",
    simple: "Car insurance only covers car accidents.",
  },
  note_cover_capped_by_income: {
    standard:
      "Insurers limit term cover by age and income; they may offer less than this.",
    simple: "Insurers may give less.",
  },
  download: {
    standard: "Download specification",
    simple: "Download checklist",
  },
  print: { standard: "Print", simple: "Print" },
  noAdvice: {
    standard:
      "This is an estimate from published assumptions, not insurance advice. DhanYukti doesn't recommend, sell or earn from any policy.",
    simple: "This is a guide, not advice. We don't sell insurance.",
  },
  assumptionsTitle: { standard: "Assumptions used", simple: "What we assumed" },
  a_floater: { standard: "Family floater base", simple: "Family cover base" },
  a_senior: { standard: "Parents' cover", simple: "Parents' cover" },
  a_extra: {
    standard: "Extra per person above 4",
    simple: "Extra per person above 4",
  },
  a_life: {
    standard: "Life cover without spending",
    simple: "Life cover rule",
  },
  a_life_suffix: {
    standard: "× yearly income, plus loans",
    simple: "× income, plus loans",
  },
  a_accident: { standard: "Accident cover", simple: "Accident cover" },
  a_accident_suffix: { standard: "× yearly income", simple: "× income" },
  a_years: {
    standard: "Support until youngest child is",
    simple: "Until youngest child is",
  },
  a_years_min: { standard: "at least (years)", simple: "at least (years)" },
  editAgain: { standard: "Change details", simple: "Change" },
} satisfies Record<string, ModeText>;

export type PlanCopyKey = keyof typeof planCopy;
