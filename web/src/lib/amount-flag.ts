/**
 * Assisted mode flag, read by lib/format (inr, inrSigned, figure). A global on
 * purpose: the bundler trims each page's copy of a shared module to the exports
 * that page uses, so a setter exported from lib/format could go missing.
 */
type G = { __dyHideAmounts?: boolean };
export function setHideAmounts(v: boolean): void {
  (globalThis as G).__dyHideAmounts = v;
}
