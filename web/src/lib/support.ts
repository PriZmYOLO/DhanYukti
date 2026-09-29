/**
 * Real support contacts only. DhanYukti has no helpline or grievance inbox yet, so nothing is
 * shown unless the deployment sets one (Vercel env). No placeholder numbers or addresses:
 * a member who taps "call" must reach a person.
 *
 *   NEXT_PUBLIC_SUPPORT_PHONE      e.g. "+91 98xxxxxxx"  → tel: link / "Call us"
 *   NEXT_PUBLIC_GRIEVANCE_EMAIL    e.g. "grievance@…"    → DPDP grievance contact
 */
const clean = (v: string | undefined) => (v ?? "").trim() || null;

export const SUPPORT_PHONE = clean(process.env.NEXT_PUBLIC_SUPPORT_PHONE);
export const GRIEVANCE_EMAIL = clean(process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL);

/** tel: href for the configured number (digits and a leading +), or null. */
export const supportTel = SUPPORT_PHONE ? `tel:${SUPPORT_PHONE.replace(/[^\d+]/g, "")}` : null;

/** Official routes that exist today, for complaints about a bank, lender or NBFC. */
export const OFFICIAL_ROUTES = [
  { label: "RBI Sachet", url: "https://sachet.rbi.org.in" },
  { label: "RBI Ombudsman (CMS)", url: "https://cms.rbi.org.in" },
] as const;
