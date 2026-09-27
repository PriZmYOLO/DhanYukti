import { fileReport, listReports } from "@/lib/server/reports/store";
import { errorResponse, noStore, sessionId, storageGuard } from "@/lib/server/aa/http";

/** This browser's reports and their status. */
export async function GET() {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  return Response.json({ reports: sid ? await listReports(sid) : [] }, { headers: noStore });
}

/** File a report on one recommendation card. No consent needed: redress is a right. */
export async function POST(request: Request) {
  const guard = storageGuard();
  if (guard) return guard;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const sid = await sessionId(true);
  const report = await fileReport(sid!, body);
  if (!report) return errorResponse(400, "invalid_request", "Choose a reason for the report.");
  return Response.json({ report }, { status: 201, headers: noStore });
}
