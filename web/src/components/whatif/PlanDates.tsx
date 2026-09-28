"use client";
import { useState } from "react";
import { ChevronDown, Hourglass } from "lucide-react";
import { ConfTag } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { day, inrSigned } from "@/lib/format";
import type { River } from "@/lib/types";

/**
 * The dates the plan rests on, each marked Confirmed (seen in bank data) or Estimate.
 * In a scenario, a bill the user asked to move keeps its real date: the new date is only a request
 * ("Conditional, not accepted") until the payee agrees.
 */
export default function PlanDates({ river, open: initial = false }: { river: River; open?: boolean }) {
  const { t, lang } = useApp();
  const [open, setOpen] = useState(initial);
  const hi = lang === "hi";
  const rows = river.days.flatMap((d) => d.events.filter((e) => !e.scenario).map((e) => ({ e, date: d.date })))
    .sort((a, b) => (a.e.original_date ?? a.date).localeCompare(b.e.original_date ?? b.date));
  if (!rows.length) return null;
  const est = rows.filter((r) => r.e.certainty === "andaaza").length;

  return (
    <div className="mt-3 rounded-[20px] bg-cream">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between gap-2 px-3 min-h-11 text-left">
        <span className="text-[13px] font-extrabold">
          {hi ? `Plan ki tareekhein (${rows.length})` : `Dates in this plan (${rows.length})`}
          {est > 0 && <span className="ml-2 text-[11px] font-semibold text-muted">{hi ? `${est} andaaza` : `${est} estimated`}</span>}
        </span>
        <ChevronDown size={18} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="px-3 pb-3 space-y-1.5">
          {rows.map(({ e, date }) => (
            <li key={e.id} className="rounded-2xl bg-white px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[13px] font-extrabold num">{day(e.original_date ?? date)}</span>
                <span className="flex-1 min-w-0 text-[13px] leading-snug truncate">{t(e.label)}</span>
                <span className={`shrink-0 text-[13px] font-bold num ${e.amount > 0 ? "text-leaf" : ""}`}>{inrSigned(e.amount)}</span>
              </div>
              <div className="mt-0.5 ml-16 flex flex-wrap items-center gap-x-2 gap-y-1">
                {e.certainty && <ConfTag c={e.certainty} />}
                {e.checked && (
                  <span className="text-[11px] font-extrabold text-leaf">
                    ✓ {e.checked === "corrected" ? (hi ? "aapne theek kiya" : "corrected by you") : (hi ? "aapne pakka kiya" : "confirmed by you")}
                  </span>
                )}
                {e.basis && <span className="text-[11px] text-muted leading-snug">{t(e.basis)}</span>}
              </div>
              {e.moved && (
                <p className="mt-1 ml-16 inline-flex flex-wrap items-center gap-1 rounded-xl bg-haldi px-2 py-1 text-[11px] font-extrabold">
                  <Hourglass size={11} />
                  {hi ? `${day(date)} ko karne ki maang — shart par, abhi maana nahi` : `Asked to move to ${day(date)} — conditional, not accepted`}
                  {e.needs && <span className="font-semibold">· {t(e.needs)}</span>}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
