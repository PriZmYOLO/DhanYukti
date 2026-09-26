/**
 * Browser calls for DPDP consent and the Value Ledger. The server decides
 * and records; these only fetch. Nothing secret is sent or returned.
 */
import type { ErrorEnvelope } from "@/lib/contracts/common";
import type { DpdpState, LedgerEntry, PurposeId } from "@/lib/dpdp/notice";

export class DpdpError extends Error {
  constructor(readonly envelope: ErrorEnvelope | null) {
    super(envelope?.safe_message ?? "Consent records are unavailable.");
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "same-origin",
  });
  const body = (await response.json().catch(() => null)) as
    (T & { error?: ErrorEnvelope }) | null;
  if (!response.ok || !body) throw new DpdpError(body?.error ?? null);
  return body;
}

export async function loadDpdpState(): Promise<DpdpState> {
  return (await call<{ state: DpdpState }>("/api/dpdp/state")).state;
}

export async function setDpdpConsent(
  purpose: PurposeId,
  action: "grant" | "withdraw",
): Promise<{ receipt: LedgerEntry | null; state: DpdpState }> {
  return call(`/api/dpdp/consents/${purpose}`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

/** A receipt as a JSON file the person can keep. */
export function downloadReceipt(entry: LedgerEntry, purposeTitle: string) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          issuer: "DhanYukti",
          type: "consent_receipt",
          purpose: entry.subject,
          purpose_title: purposeTitle,
          event: entry.kind,
          at: entry.at,
          receipt_id: entry.receipt_id,
          notice_version: entry.notice_version,
          notice_sha256: entry.notice_hash,
          ledger_seq: entry.seq,
          ledger_prev_hash: entry.prev_hash,
          ledger_hash: entry.hash,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dhanyukti-consent-${entry.receipt_id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
