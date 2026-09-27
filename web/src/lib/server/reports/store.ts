import "server-only";

import { randomUUID } from "node:crypto";

import { appendLedger } from "@/lib/server/dpdp/ledger";
import { kvGet, kvSet } from "@/lib/server/aa/store";

/**
 * "Report a recommendation": the person's redress route for a card they
 * think is wrong, unsuitable, unclear or a privacy problem. A saved report
 * is not a resolved one: it gets a receipt in the Value Ledger and stays
 * "received" until someone reviews it. Stores the card's id and engine,
 * never the card text (which can carry names or amounts).
 */

export const REPORT_REASONS = ["wrong_fact", "not_suitable", "unclear", "privacy", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface RecommendationReport {
  report_id: string;
  card_id: string;
  engine: string;
  reason: ReportReason;
  details: string;
  saved_at: string;
  status: "received";
  receipt_id: string | null;
}

const TTL = 90 * 24 * 60 * 60;
const key = (sid: string) => `report:${sid}`;

export async function listReports(sid: string): Promise<RecommendationReport[]> {
  return (await kvGet<RecommendationReport[]>(key(sid))) ?? [];
}

export async function fileReport(sid: string, input: { card_id?: unknown; engine?: unknown; reason?: unknown; details?: unknown }): Promise<RecommendationReport | null> {
  if (!REPORT_REASONS.includes(input.reason as ReportReason)) return null;
  const cardId = typeof input.card_id === "string" && /^[\w:.-]{1,64}$/.test(input.card_id) ? input.card_id : null;
  const engine = typeof input.engine === "string" && /^[\w .:-]{1,32}$/.test(input.engine) ? input.engine : "unknown";
  if (!cardId) return null;
  const details = typeof input.details === "string" ? input.details.trim().slice(0, 500) : "";
  const report: RecommendationReport = {
    report_id: `rep_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    card_id: cardId,
    engine,
    reason: input.reason as ReportReason,
    details,
    saved_at: new Date().toISOString(),
    status: "received",
    receipt_id: null,
  };
  try {
    report.receipt_id = (await appendLedger(sid, "report_filed", `report:${report.report_id}`)).receipt_id;
  } catch {
    report.receipt_id = null;
  }
  const all = await listReports(sid);
  await kvSet(key(sid), [...all, report].slice(-50), TTL);
  // Server log for the team's review queue: ids and reason only.
  console.info("[report] filed", JSON.stringify({ report: report.report_id, card: cardId, engine, reason: report.reason }));
  return report;
}
