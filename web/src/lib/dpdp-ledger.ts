/**
 * Records DPDP choices in the server-side Value Ledger (/api/dpdp, hash-chained
 * receipts; see src/lib/server/dpdp). The screens keep their own grant state;
 * this makes every toggle leave a verifiable receipt.
 *
 * Screen keys → notice purposes (src/lib/dpdp/notice.ts).
 */
import { ensureSession } from "@/lib/session";

const PURPOSE: Record<string, string> = {
  profile: "member_profile",
  device_signals: "device_signals",
  ration: "ration",
  electricity: "electricity",
  rc: "rc",
  epf: "epf",
};

export async function recordDpdp(key: string, granted: boolean): Promise<{ receipt_id: string } | null> {
  const purpose = PURPOSE[key];
  if (!purpose) return null;
  try {
    await ensureSession();
    const res = await fetch(`/api/dpdp/consents/${purpose}`, {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: granted ? "grant" : "withdraw" }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { receipt?: { receipt_id: string } | null };
    return body.receipt ?? null;
  } catch {
    return null; // the ledger never blocks the screen
  }
}
