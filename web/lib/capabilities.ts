/**
 * What this build can actually do, in one place. Screens read these flags
 * instead of assuming a capability exists.
 */

/**
 * Whether a released next step can be confirmed and sent from the app.
 *
 * false until the action service exists: confirmation and the audit trail
 * belong to Y08 (acceptance/action service), H09 (backend state for
 * actions) and Task Pack L08 (confirm flow). While false, the confirm button
 * stays disabled and the step is labelled "Preview only". Flip this only
 * when that service is connected end to end.
 */
export const CONFIRMATION_CONNECTED = false;

/**
 * Whether bank linking goes through the real Account Aggregator flow
 * (Anumati FIU module, `lib/provisional/h03/live-adapter.ts` →
 * `/api/aa/*`).
 *
 * Off by default: approval is simulated by the labelled demo adapter and
 * nothing is fetched. Set NEXT_PUBLIC_AA_LIVE=true on a deployment only
 * once ANUMATI_CLIENT_ID/SECRET and Redis are configured there and
 * /api/aa/status reports ready (the value is fixed at build time, so
 * redeploy after changing it).
 */
export const AA_CONNECTED = process.env.NEXT_PUBLIC_AA_LIVE === "true";

/**
 * Whether a bank statement file can be uploaded (Task Pack L04 upload
 * control; BSA path in Task Pack N04).
 *
 * false: no upload service exists (the BSA sandbox currently returns 403),
 * so the entry says "Not available in this build" and renders no file input.
 * Flip only when an authorised, server-side upload route exists that keeps
 * files private and reports processing/failed states.
 */
export const STATEMENT_UPLOAD_CONNECTED = false;
