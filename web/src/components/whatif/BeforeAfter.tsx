"use client";
import { useApp } from "@/lib/store";
import { day, inr, inrSigned } from "@/lib/format";
import type { SimResult } from "@/lib/types";

/**
 * Before vs after on the same baseline and horizon. Every figure comes from the engine's SimResult;
 * nothing is subtracted here. Falls back to "after only" if the backend didn't send the before figures.
 */
export default function BeforeAfter({ res, dark }: { res: SimResult; dark?: boolean }) {
  const { lang } = useApp();
  const hi = lang === "hi";
  const firstBefore = res.first_deficit_date_before;
  const firstAfter = res.first_deficit_date ?? res.river.days.find((d) => d.balance < 0)?.date ?? null;
  type V = { main: string; when?: string };
  const short = (gap: number, date: string | null | undefined): V =>
    gap > 0 && date ? { main: `−${inr(gap)}`, when: day(date) } : { main: hi ? "Koi kami nahi" : "No shortfall" };

  const rows: { k: string; label: string; before?: V; after: V; bad: boolean }[] = [
    {
      k: "first", label: hi ? "Pehli kami" : "First short",
      before: firstBefore !== undefined ? short(res.gap_before, firstBefore) : undefined,
      after: short(res.gap_after, firstAfter), bad: res.gap_after > 0,
    },
    {
      k: "low", label: hi ? "Sabse neeche" : "Lowest point",
      before: res.min_balance_before != null && res.min_date_before ? { main: inrSigned(res.min_balance_before), when: day(res.min_date_before) } : undefined,
      after: { main: inrSigned(res.river.min_balance), when: day(res.river.min_date) }, bad: res.river.min_balance < 0,
    },
    {
      k: "days", label: hi ? "Bina aamdani ke din" : "Days without income",
      before: res.resilience_before != null ? { main: String(res.resilience_before) } : undefined,
      after: { main: String(res.resilience_days) }, bad: res.resilience_days < 15,
    },
  ];
  const hasBefore = rows.some((r) => r.before !== undefined);
  const sub = dark ? "text-white/60" : "text-muted";
  const cell = dark ? "bg-white/10" : "bg-lav";

  return (
    <div className="mt-4" role="table" aria-label={hi ? "Pehle aur baad" : "Before and after"}>
      {hasBefore && (
        <div role="row" className={`grid grid-cols-[1fr_1fr_1fr] gap-2 text-[11px] font-bold uppercase tracking-wide ${sub}`}>
          <span role="columnheader" />
          <span role="columnheader">{hi ? "Abhi" : "Now"}</span>
          <span role="columnheader">{hi ? "Agar aisa hua" : "If this happens"}</span>
        </div>
      )}
      <div className="mt-1 space-y-2">
        {rows.map((r) => (
          <div key={r.k} role="row" className={`grid ${hasBefore ? "grid-cols-[1fr_1fr_1fr]" : "grid-cols-[1fr_1.2fr]"} gap-2 items-center rounded-[18px] ${cell} px-3 py-2`}>
            <span role="rowheader" className={`text-[12px] font-semibold ${sub}`}>{r.label}</span>
            {hasBefore && <Cell v={r.before} className="text-[13px] font-bold" sub={sub} />}
            <Cell v={r.after} sub={sub} className={`text-[14px] font-extrabold ${r.bad ? (dark ? "text-[#ff8a80]" : "text-danger") : dark ? "text-mint" : "text-leaf"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Cell({ v, className, sub }: { v?: { main: string; when?: string }; className: string; sub: string }) {
  return (
    <span role="cell" className="num leading-tight">
      <span className={`block ${className}`}>{v?.main ?? "—"}</span>
      {v?.when && <span className={`block text-[11px] font-semibold ${sub}`}>{v.when}</span>}
    </span>
  );
}
