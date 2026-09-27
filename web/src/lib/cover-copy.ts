/**
 * Words for the family cover engine's codes, in Hinglish and English. The
 * engine returns codes only; the screen renders them here. Nothing in this
 * file names an insurer, a product or a price (FIREWALL).
 */
import type { L } from "@/lib/types";
import type { CityTier, Condition, CoverSpec, CoverUnit, FeatureCode, HaveItem, NoteCode, PublicStep, Relation } from "@/lib/contracts/cover-engine";

export const RELATION: Record<Relation, L> = {
  self: { hi: "Main", en: "Me" }, spouse: { hi: "Pati/Patni", en: "Spouse" }, child: { hi: "Bachcha", en: "Child" },
  parent: { hi: "Maa/Pitaji", en: "Parent" }, other: { hi: "Aur", en: "Other" },
};
export const CITY: Record<CityTier, L> = {
  metro: { hi: "Bada sheher (metro)", en: "Metro city" }, tier2: { hi: "Beech ka sheher", en: "Tier-2 city" }, tier3: { hi: "Chhota sheher / gaon", en: "Small town / village" },
};
export const CONDITION: Record<Condition, L> = {
  diabetes: { hi: "Sugar", en: "Diabetes" }, hypertension: { hi: "BP", en: "Blood pressure" }, heart: { hi: "Dil", en: "Heart" },
  thyroid: { hi: "Thyroid", en: "Thyroid" }, asthma: { hi: "Asthma", en: "Asthma" }, other: { hi: "Aur", en: "Other" },
};
export const SCHEME: Record<PublicStep["scheme"], L> = {
  pmsby: { hi: "PMSBY (durghatna)", en: "PMSBY (accident)" }, pmjjby: { hi: "PMJJBY (jeevan)", en: "PMJJBY (life)" },
  vay_vandana: { hi: "Ayushman Vay Vandana (70+ hospital)", en: "Ayushman Vay Vandana (70+ hospital)" },
};
export const PSTATUS: Record<PublicStep["status"], L & { cls: string }> = {
  already: { hi: "Pehle se hai", en: "Already has it", cls: "bg-mint text-leaf" },
  consider: { hi: "Judne par sochein", en: "Consider enrolling", cls: "bg-haldi-soft text-ink" },
  not_eligible: { hi: "Umar ke hisaab se nahi", en: "Not eligible by age", cls: "bg-lav text-muted" },
  unknown: { hi: "Umar nahi batayi", en: "Age not told", cls: "bg-lav text-muted" },
};
export const UNIT: Record<string, L> = {
  "health:family": { hi: "Health: parivaar floater", en: "Health: family floater" },
  "health:parents": { hi: "Health: maa-pitaji", en: "Health: parents" },
  "health:member": { hi: "Health", en: "Health" },
  "life:earner": { hi: "Jeevan (term)", en: "Life (term)" },
  "accident:earner": { hi: "Durghatna", en: "Accident" },
};
export const unitLabel = (u: CoverUnit) => UNIT[`${u.kind}:${u.label}`] ?? { hi: u.kind, en: u.kind };
export const USTATUS: Record<CoverUnit["status"], L & { cls: string }> = {
  gap: { hi: "Kami hai", en: "Gap", cls: "bg-danger-soft text-danger" },
  covered: { hi: "Theek hai", en: "Covered", cls: "bg-mint text-leaf" },
  not_needed: { hi: "Abhi zaroori nahi", en: "Not needed now", cls: "bg-lav text-muted" },
  unknown: { hi: "Abhi pata nahi", en: "Can't tell yet", cls: "bg-amber-soft text-[#9a5f00]" },
};
export const HAVE_NOTE: Record<HaveItem["note"], L> = {
  counted: { hi: "gina gaya", en: "counted" },
  employer_not_counted: { hi: "nahi gina: naukri badli to khatam", en: "not counted: ends if you change jobs" },
  not_all_members: { hi: "sirf kuch logon ke liye, isliye kami band nahi", en: "covers only some members, so the gap stays" },
  public_scheme: { hi: "sarkari yojana", en: "government scheme" },
};
export const RULE: Record<string, L> = {
  H1: { hi: "Floater ka size sheher par nirbhar — hospital ka kharcha alag hai.", en: "Family floater size depends on where you live (hospital costs differ)." },
  H2: { hi: "Floater mein 4 se zyada log: har extra vyakti ke liye thoda aur.", en: "More than 4 people in a floater: a little more per extra person." },
  H3: { hi: "60+ maa-pitaji ki alag policy — warna unke claim parivaar ka cover kha jaate hain aur daam badhta hai.", en: "Parents aged 60+ need their own policy; in your floater their claims use up the family's cover and raise its price." },
  H4: { hi: "Maa-pitaji ka cover bhi sheher par nirbhar.", en: "Parents' cover size depends on where you live." },
  H5: { hi: "Policy tabhi kami band karti hai jab group ke sab log cover hon — sabse kam wale ko ginte hain.", en: "A policy only closes a gap if it covers everyone in that group; we count the least-covered person." },
  H6: { hi: "Naukri wala bima dikhaya jaata hai, gina nahi — naukri ke saath khatam.", en: "Employer cover is shown but not counted: it ends with the job." },
  H7: { hi: "Batayi bimaari: waiting period aapki seema mein ho, aur insurer ko zaroor batayein.", en: "Declared conditions: waiting period within your limit, and always declare them." },
  L1: { hi: "Jeevan cover sabse chhote bachche ke apne pairon par khade hone tak (kam se kam 10 saal) sahara de.", en: "Life cover should replace your support until the youngest child is independent (at least 10 years)." },
  L2: { hi: "Kharcha nahi bataya, isliye aamdani ka 10 guna + loan liya.", en: "Spending not told, so we used 10× income plus loans." },
  L3: { hi: "Koi nirbhar nahi aur loan nahi — abhi jeevan cover zaroori nahi.", en: "No dependants and no loans: life cover isn't a priority now." },
  L4: { hi: "Term cover kam se kam 60, zyada se zyada 70 saal tak.", en: "Term cover runs to at least 60, at most 70." },
  A1: { hi: "Durghatna cover saal ki aamdani ka lagbhag 5 guna — viklangta mein aamdani ki jagah.", en: "Accident cover of about 5× yearly income replaces income after disability." },
  P1: { hi: "Pehle sarkari yojana, phir private.", en: "Public schemes before any private cover." },
  P2: { hi: "Kram: parivaar health, maa-pitaji health, kamaane walon ka jeevan, durghatna.", en: "Order: family health, parents' health, earners' life, accident." },
  S1: { hi: "Rakam upar ki taraf gol ki gayi.", en: "Amounts rounded up." },
};
export const MISSING: Record<string, L> = {
  city_tier: { hi: "Aap kahaan rehte hain", en: "Where you live" },
  self_member: { hi: "List mein 'Main'", en: "You, in the family list" },
  member_age: { hi: "Har sadasya ki umar", en: "Every member's age" },
  annual_expenses: { hi: "Saal ka ghar kharcha", en: "Household spending a year" },
  annual_income: { hi: "Kamaane walon ki aamdani", en: "Earners' incomes" },
  existing_sum_insured: { hi: "Har policy ki rakam", en: "Sum insured of every policy" },
};
export const SPEC: Record<CoverSpec["cover_type"], L> = {
  family_floater: { hi: "Parivaar floater health policy", en: "Family floater health policy" },
  senior_floater: { hi: "Maa-pitaji ke liye senior floater", en: "Senior floater for parents" },
  individual_health: { hi: "Individual health policy", en: "Individual health policy" },
  term_life: { hi: "Term life policy", en: "Term life policy" },
  personal_accident: { hi: "Personal accident policy", en: "Personal accident policy" },
};
export const FEATURE: Record<FeatureCode, L> = {
  no_room_rent_cap: { hi: "Room rent ki koi seema nahi", en: "No room-rent limit" },
  copay_max: { hi: "Co-payment zyada se zyada (%)", en: "Co-payment no more than (%)" },
  ped_wait_max: { hi: "Purani bimaari ka intezaar zyada se zyada (mahine)", en: "Existing-illness wait no longer than (months)" },
  restore_benefit: { hi: "Restore benefit (cover dobara bhare)", en: "Restore benefit" },
  maternity: { hi: "Maternity cover", en: "Maternity cover" },
  opd: { hi: "OPD (doctor visit)", en: "OPD cover" },
  no_disease_sublimits: { hi: "Bimaari-waar sub-limit nahi", en: "No disease-wise sub-limits" },
  cashless_network_nearby: { hi: "Paas ke hospital cashless", en: "Cashless hospitals near you" },
  pre_post_hospitalisation: { hi: "Hospital se pehle aur baad ka kharcha", en: "Pre- and post-hospitalisation" },
  day_care: { hi: "Day-care ilaaj", en: "Day-care procedures" },
  super_top_up_structure: { hi: "Maujooda policy par super top-up ho sakta hai (aksar sasta)", en: "Can be a super top-up over your existing policy (often cheaper)" },
  separate_from_family_floater: { hi: "Parivaar floater se alag", en: "Separate from the family floater" },
  pure_term: { hi: "Sirf term (koi nivesh ya paisa-wapsi nahi)", en: "Pure term (no investment or return-of-premium)" },
  rider_accidental_death: { hi: "Accidental death rider", en: "Accidental death rider" },
  rider_critical_illness: { hi: "Critical illness rider", en: "Critical illness rider" },
  rider_waiver_of_premium: { hi: "Waiver of premium rider", en: "Waiver of premium rider" },
  permanent_disability: { hi: "Sthaayi viklangta cover", en: "Permanent disability cover" },
  temporary_disability_income: { hi: "Asthaayi viklangta mein hafta-waar aamdani", en: "Weekly income during temporary disability" },
};
export const NOTE: Record<NoteCode, L> = {
  disclose_conditions: { hi: "Proposal form mein har bimaari likhein — chhupana claim reject hone ki sabse badi wajah hai.", en: "Declare every condition on the proposal form. Hiding one is the top reason claims are refused." },
  senior_loading_possible: { hi: "Buzurgon ka premium zyada ya medical check ho sakta hai. 2024 se sirf umar par mana nahi kar sakte.", en: "Premiums for seniors may be higher or need a medical check. Since 2024 insurers can't refuse for age alone." },
  moratorium_five_years: { hi: "5 saal lagataar ke baad, fraud chhod kar, 'na batane' par claim mana nahi ho sakta.", en: "After 5 continuous years a claim can't be refused for non-disclosure except for fraud." },
  employer_cover_ends: { hi: "Naukri badli to naukri wala bima khatam.", en: "Your employer cover ends if you change jobs." },
  motor_pa_not_counted: { hi: "Gaadi bima ka accident cover sirf gaadi ki durghatna par — isliye nahi gina.", en: "Accident cover in a motor policy only applies to vehicle accidents, so it isn't counted." },
  cover_capped_by_income: { hi: "Insurer umar aur aamdani se term cover seemit karte hain — kam de sakte hain.", en: "Insurers limit term cover by age and income; they may offer less." },
};

/** Bima Sugam: IRDAI-backed insurance marketplace (buying rolls out in stages). */
export const BIMA_SUGAM_URL = "https://bimasugam.co.in";
