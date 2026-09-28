import { noStore } from "@/lib/server/aa/http";

/**
 * The member's own consents are the live links (Consent tab, LiveLinkCard)
 * and the DPDP purposes (/api/dpdp). No replay artefacts from a demo family.
 */
export async function GET() {
  return Response.json({ aa: [], dpdp: [] }, { headers: noStore });
}
