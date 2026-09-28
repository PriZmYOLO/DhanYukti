/**
 * Where a member closes the consent itself: DhanYukti can stop using and
 * delete its copy, but only the Anumati app ends the consent at the AA.
 * This is the UAT (sandbox) web app until production access is granted.
 */
export const ANUMATI_APP = {
  url: "https://uat-web.anumati.co.in",
  sandbox: true,
} as const;
