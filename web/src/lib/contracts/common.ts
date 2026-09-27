/**
 * PROVISIONAL client contract types.
 *
 * Hand-written from Technical Guide §2–3 until H01 publishes generated
 * OpenAPI/JSON schemas; replace this file with the generated types then.
 * Field names follow the backend's snake_case so the swap stays mechanical.
 */

/** Money is integer paise in INR (Guide §2). Never a float, never implied zero. */
export interface MoneyPaise {
  amount_paise: number;
  currency: "INR";
}

/** ISO calendar date, e.g. "2026-09-28". */
export type IsoDate = string;

/** Timezone-aware ISO timestamp, e.g. "2026-09-23T18:00:00+05:30". */
export type IsoTimestamp = string;

/** Where a fact came from (Guide §2). Provenance, not availability. */
export type SourceKind = "observed" | "declared" | "inferred" | "scenario";

/** Whether a fact can be used (Guide §2). Missing is never zero. */
export type Availability =
  "present" | "missing" | "unavailable" | "disputed" | "revoked";

/** Common error envelope (Guide §3). */
export interface ErrorEnvelope {
  request_id: string;
  code: string;
  safe_message: string;
  retryable: boolean;
  missing_fields?: string[];
}
