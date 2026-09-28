import { DEFAULT_FI_TYPES, type FiType } from "@/lib/aa/fi-types";
import type { ConsentRequestTerms } from "@/lib/provisional/h03/types";

/**
 * The terms the live Anumati adapter actually sends (see
 * `lib/server/aa/fiu-client.ts` → ONBOARDING_CONSENT): purpose 103
 * "Aggregated statement", the link's FI types (DEPOSIT unless the member
 * chose more and AA_FI_TYPES allows them), 12 months of history, fetched
 * once on approval, consent valid 12 months. Keep both files in step.
 */
export const LIVE_TERMS: ConsentRequestTerms = {
  partner_name: "Anumati (Perfios Account Aggregator)",
  data_kind: "savings_account_transactions",
  history_months: 12,
  purposes: ["aggregated_statement", "budgeting"],
  fetch_frequency: "once_on_approval",
  consent_months: 12,
  retention: "while_consent_active",
  is_provisional: false,
  fi_types: DEFAULT_FI_TYPES,
};

/** The terms for one link: exactly the FI types it requests. */
export function liveTerms(fiTypes: FiType[]): ConsentRequestTerms {
  return { ...LIVE_TERMS, fi_types: fiTypes };
}
