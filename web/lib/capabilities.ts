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
