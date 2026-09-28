import "server-only";

/** Store keys for a linked member's Household Twin (one per browser session). */
export const twinKeys = {
  /** Derived facts from their own bank data (no full ledger), ≤ 30 days. */
  twin: (sid: string) => `twin:${sid}`,
  /** Their own jars, game and corrections. */
  state: (sid: string) => `twin:state:${sid}`,
  lock: (sid: string) => `twin:lock:${sid}`,
};
