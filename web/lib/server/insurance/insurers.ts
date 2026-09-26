/**
 * Insurers by how they are licensed by IRDAI, matched on bank narrations.
 * Order matters: the more specific name comes first (HDFC ERGO before HDFC
 * LIFE, Max Bupa before Max Life). Includes recent renames (Axis Max Life,
 * Bajaj General/Life, Niva Bupa). A premium is recognised only from a
 * debit whose narration names the insurer; amounts alone never count.
 *
 * Pure (type-only imports) so scripts can run it.
 */
import type { InsurerLicence } from "../../contracts/insurance-cover";

export interface Insurer {
  id: string;
  name: string;
  licence: InsurerLicence;
  pattern: RegExp;
}

export const INSURERS: Insurer[] = [
  // Standalone health insurers
  {
    id: "niva_bupa",
    name: "Niva Bupa Health",
    licence: "health",
    pattern: /NIVA\s*BUPA|MAX\s*BUPA/,
  },
  {
    id: "star_health",
    name: "Star Health",
    licence: "health",
    pattern: /STAR\s*HEALTH/,
  },
  {
    id: "care_health",
    name: "Care Health",
    licence: "health",
    pattern: /CARE\s*HEALTH|RELIGARE\s*HEALTH/,
  },
  {
    id: "aditya_birla_health",
    name: "Aditya Birla Health",
    licence: "health",
    pattern: /ADITYA\s*BIRLA\s*HEALTH|\bABHICL\b/,
  },
  {
    id: "manipal_cigna",
    name: "ManipalCigna Health",
    licence: "health",
    pattern: /MANIPAL\s*CIGNA/,
  },
  // General insurers
  {
    id: "hdfc_ergo",
    name: "HDFC ERGO",
    licence: "general",
    pattern: /HDFC\s*ERGO/,
  },
  {
    id: "icici_lombard",
    name: "ICICI Lombard",
    licence: "general",
    pattern: /ICICI\s*LOMBARD/,
  },
  {
    id: "sbi_general",
    name: "SBI General",
    licence: "general",
    pattern: /SBI\s*GEN(ERAL)?/,
  },
  { id: "acko", name: "ACKO", licence: "general", pattern: /\bACKO\b/ },
  {
    id: "go_digit",
    name: "Go Digit",
    licence: "general",
    pattern: /GO\s*DIGIT|DIGIT\s*INSURANCE/,
  },
  {
    id: "tata_aig",
    name: "Tata AIG",
    licence: "general",
    pattern: /TATA\s*AIG/,
  },
  {
    id: "bajaj_general",
    name: "Bajaj General",
    licence: "general",
    pattern: /BAJAJ\s*(ALLIANZ\s*)?GEN(ERAL)?|BAJAJ\s*ALLIANZ(?!\s*LIFE)/,
  },
  {
    id: "new_india",
    name: "New India Assurance",
    licence: "general",
    pattern: /NEW\s*INDIA\s*ASS/,
  },
  {
    id: "united_india",
    name: "United India Insurance",
    licence: "general",
    pattern: /UNITED\s*INDIA\s*INS/,
  },
  {
    id: "oriental",
    name: "Oriental Insurance",
    licence: "general",
    pattern: /ORIENTAL\s*INS/,
  },
  {
    id: "national",
    name: "National Insurance",
    licence: "general",
    pattern: /NATIONAL\s*INS(URANCE)?\s*CO/,
  },
  {
    id: "iffco_tokio",
    name: "IFFCO Tokio",
    licence: "general",
    pattern: /IFFCO\s*TOKIO/,
  },
  {
    id: "royal_sundaram",
    name: "Royal Sundaram",
    licence: "general",
    pattern: /ROYAL\s*SUNDARAM/,
  },
  {
    id: "reliance_general",
    name: "Reliance General",
    licence: "general",
    pattern: /RELIANCE\s*GEN/,
  },
  {
    id: "chola_ms",
    name: "Chola MS",
    licence: "general",
    pattern: /CHOLA\s*MS|CHOLAMANDALAM\s*MS/,
  },
  {
    id: "future_generali",
    name: "Future Generali",
    licence: "general",
    pattern: /FUTURE\s*GENERALI/,
  },
  {
    id: "kotak_general",
    name: "Zurich Kotak General",
    licence: "general",
    pattern: /ZURICH\s*KOTAK|KOTAK\s*GEN/,
  },
  // Life insurers
  {
    id: "lic",
    name: "LIC",
    licence: "life",
    pattern: /\bLIC\b|LIFE\s*INSURANCE\s*CORP/,
  },
  {
    id: "hdfc_life",
    name: "HDFC Life",
    licence: "life",
    pattern: /HDFC\s*LIFE|HDFC\s*STANDARD\s*LIFE/,
  },
  {
    id: "icici_pru",
    name: "ICICI Prudential Life",
    licence: "life",
    pattern: /ICICI\s*PRU/,
  },
  { id: "sbi_life", name: "SBI Life", licence: "life", pattern: /SBI\s*LIFE/ },
  {
    id: "max_life",
    name: "Axis Max Life",
    licence: "life",
    pattern: /MAX\s*LIFE/,
  },
  {
    id: "tata_aia",
    name: "Tata AIA Life",
    licence: "life",
    pattern: /TATA\s*AIA/,
  },
  {
    id: "bajaj_life",
    name: "Bajaj Life",
    licence: "life",
    pattern: /BAJAJ\s*(ALLIANZ\s*)?LIFE/,
  },
  {
    id: "kotak_life",
    name: "Kotak Life",
    licence: "life",
    pattern: /KOTAK\s*(MAHINDRA\s*)?LIFE/,
  },
  {
    id: "pnb_metlife",
    name: "PNB MetLife",
    licence: "life",
    pattern: /PNB\s*MET\s*LIFE/,
  },
  {
    id: "absli",
    name: "Aditya Birla Sun Life",
    licence: "life",
    pattern: /BIRLA\s*SUN\s*LIFE|\bABSLI\b/,
  },
  {
    id: "canara_hsbc_life",
    name: "Canara HSBC Life",
    licence: "life",
    pattern: /CANARA\s*HSBC/,
  },
  {
    id: "reliance_nippon_life",
    name: "Reliance Nippon Life",
    licence: "life",
    pattern: /NIPPON\s*LIFE/,
  },
];

/** Narrations that are not premiums even if they name an insurer. */
const NOT_A_PREMIUM =
  /REFUND|REVERSAL|CLAIM|MATURITY|SURRENDER|POLICY\s*LOAN|LOAN\s*REPAY/;

export function matchInsurer(narration: string | null): Insurer | null {
  if (!narration) return null;
  const text = narration.toUpperCase();
  if (NOT_A_PREMIUM.test(text)) return null;
  return INSURERS.find((insurer) => insurer.pattern.test(text)) ?? null;
}
