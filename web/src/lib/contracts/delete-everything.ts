/**
 * What "Delete everything" removed for this browser session, and what it
 * kept on purpose. Ids only; the screen words them.
 */
import type { PurposeId } from "@/lib/dpdp/notice";
import type { ConsentStatus } from "@/lib/provisional/h03/types";

export type DeletedItem =
  /** A bank link: its decrypted data, derived facts and the link itself. */
  | { kind: "aa_link"; ref: string; was: ConsentStatus }
  /** A DPDP purpose withdrawn; its data was deleted by the withdrawal. */
  | { kind: "dpdp_purpose"; purpose: PurposeId }
  | { kind: "reports"; count: number };

export interface DeleteEverythingResult {
  deleted: DeletedItem[];
  /** Value Ledger receipts: no financial data; they prove the withdrawals. */
  kept: { kind: "value_ledger"; receipts: number };
}
