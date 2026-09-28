import "server-only";

/** Store keys for a linked member's Household Twin (one per browser session). */
export const twinKeys = {
  /** Derived facts from their own bank data (no full ledger, no narration text), ≤ 30 days. */
  twin: (sid: string) => `twin:${sid}`,
  /** Their own jars, game and corrections. */
  state: (sid: string) => `twin:state:${sid}`,
  lock: (sid: string) => `twin:lock:${sid}`,
};

const DAY = 24 * 60 * 60;
/**
 * Jars, game and corrections: 30 days from the last change, the same cap as
 * every other fact derived from bank data (some corrections name a payment).
 */
export const STATE_TTL = 30 * DAY;

/**
 * Corrections that refer to bank-found payments (`series:*`, `event:*`,
 * everyday spend). They go with the bank data: on stop/revoke, and whenever
 * the twin they were made on no longer exists.
 */
export function withoutBankCorrections<T extends Record<string, unknown>>(state: T): T {
  const overlays = (state.overlays ?? {}) as Record<string, unknown>;
  const kept = Object.fromEntries(
    Object.entries(overlays).filter(([k]) => !k.startsWith("series:") && !k.startsWith("event:") && k !== "essentials_per_day"),
  );
  return { ...state, overlays: kept };
}
