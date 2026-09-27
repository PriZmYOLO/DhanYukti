"use client";
import { useState } from "react";
import { MoveHorizontal, RotateCcw } from "lucide-react";
import CashRiver from "@/components/ui/CashRiver";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { day, inr } from "@/lib/format";
import type { RiverEvent, SimResult } from "@/lib/types";

export default function RiverCard() {
  const { data, hid, t, lang } = useApp();
  const [sim, setSim] = useState<SimResult | null>(null);
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const river = sim?.river ?? data.river;
  const movable = data.river.days.flatMap((d) => d.events.filter((e) => e.movable).map((e) => ({ e, date: d.date })));
  const salaryDay = data.river.days.find((d) => d.events.some((e) => e.type === "salary"))?.date;

  const move = async (ev: RiverEvent, newDate: string) => {
    setBusy(true);
    try { setSim(await api.simulate(hid, { moves: [{ event_id: ev.id, new_date: newDate }] })); } finally { setBusy(false); }
  };

  return (
    <section className="mx-5 lg:mx-0 rounded-[32px] bg-white p-4 shadow-soft">
      <div className="flex items-start justify-end gap-2">
        {sim ? (
          <button onClick={() => setSim(null)} className="flex items-center gap-1 rounded-full bg-lav px-3 min-h-9 text-xs font-bold"><RotateCcw size={14} />{lang === "hi" ? "Asli plan" : "Real plan"}</button>
        ) : river.gap > 0 ? (
          <span className="rounded-full bg-danger-soft text-danger px-3 py-1 text-xs font-extrabold num">−{inr(river.gap)} · {day(river.min_date)}</span>
        ) : <span className="rounded-full bg-mint text-leaf px-3 py-1 text-xs font-extrabold">{lang === "hi" ? "Kami nahi" : "No shortfall"}</span>}
      </div>
      {sim && <p className="mt-2 inline-block rounded-full bg-haldi px-3 py-1 text-[11px] font-extrabold">🔮 {lang === "hi" ? "SIRF ANDAAZA — asli plan nahi badla" : "SCENARIO ONLY — real plan unchanged"}</p>}
      <div className={`mt-3 transition ${busy ? "opacity-50" : ""}`}><CashRiver river={river} onMove={move} /></div>

      {!sim && movable.length > 0 && (
        <div className="mt-3 rounded-[20px] bg-haldi-soft p-3 flex items-center gap-3">
          <MoveHorizontal className="shrink-0" size={22} />
          <p className="text-[13px] flex-1 leading-snug">{t({ hi: "Peela bill khiskao ↔", en: "Drag the yellow bill ↔" })}</p>
          {salaryDay && (
            <button onClick={() => move(movable[0].e, salaryDay)} className="rounded-full bg-ink text-white px-3 min-h-10 text-xs font-bold shrink-0">
              {lang === "hi" ? `${day(salaryDay)} par` : `Move to ${day(salaryDay)}`}
            </button>
          )}
        </div>
      )}
      {sim && (
        <div className="mt-3 rounded-[20px] bg-lav p-3">
          <div className="flex items-center gap-3 text-sm font-bold num">
            <span className="text-danger line-through decoration-2">−{inr(sim.gap_before)}</span><span>→</span>
            <span className={sim.gap_after > 0 ? "text-danger" : "text-leaf"}>{sim.gap_after > 0 ? `−${inr(sim.gap_after)}` : lang === "hi" ? "Kami khatam" : "Gap closed"}</span>
          </div>
          <p className="text-[13px] mt-1 leading-snug">{t(sim.message)}</p>
        </div>
      )}
    </section>
  );
}
