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
 * Whether bank linking goes through a real Account Aggregator flow.
 *
 * false: the Perfios Hub sandbox has no AA/Anumati APIs and real AA access
 * is still pending, so approval is simulated by the labelled demo adapter
 * (`lib/provisional/h03`) and nothing is fetched. Flip only when a real
 * ConsentPort adapter (consent request, approval handoff, fetch status and
 * revoke) is wired in `lib/provisional/h03/index.ts` and tested end to end.
 */
export const AA_CONNECTED = false;

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
