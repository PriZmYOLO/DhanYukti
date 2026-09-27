"use client";
import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { useApp } from "@/lib/store";
import { gov, type Report } from "@/lib/gov";
import { REASON_LABEL } from "@/components/gov/ReportForm";

/** Reports this person filed, with their status. Saved is not resolved. */
export default function MyReports() {
  const { t, lang } = useApp();
  const [list, setList] = useState<Report[]>([]);
  useEffect(() => { gov.reports().then(setList).catch(() => {}); }, []);
  if (list.length === 0) return null;
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-soft">
      <p className="font-bold text-sm flex items-center gap-2"><Flag size={15} />{lang === "hi" ? "Meri reports" : "My reports"}</p>
      <div className="mt-2 divide-y divide-lav">
        {[...list].reverse().map((r) => (
          <div key={r.report_id} className="py-2 text-[13px]">
            <div className="flex items-center gap-2"><span className="flex-1 font-semibold">{t(REASON_LABEL[r.reason])} · {r.engine}</span>
              <span className="rounded-full bg-amber-soft text-[#9a5f00] px-2 py-0.5 text-[11px] font-bold">{lang === "hi" ? "Mili — jaanch baaki" : "Received — not yet reviewed"}</span></div>
            <p className="text-[11px] text-muted font-mono">{r.report_id} · {new Date(r.saved_at).toLocaleDateString("en-IN")}{r.receipt_id ? ` · ${r.receipt_id}` : ""}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
