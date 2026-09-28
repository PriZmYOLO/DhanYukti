"use client";
import { useState } from "react";
import { Wallet, CalendarHeart, Landmark, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { inr } from "@/lib/format";
import type { Dashboard, Metric } from "@/lib/types";
import MetricSheet, { type MetricKey } from "./MetricSheet";
import SurakshaPlanSheet from "@/components/gov/SurakshaPlanSheet";

const TILES = [
  { key: "safe_to_spend", tint: "bg-haldi-soft", Icon: Wallet, short: { hi: "Aaj kharch", en: "Spend today" } },
  { key: "resilience_days", tint: "bg-rose/50", Icon: CalendarHeart, short: { hi: "Bachav ke din", en: "Safety days" } },
  { key: "debt_load", tint: "bg-lav", Icon: Landmark, short: { hi: "Karz", en: "Debt" } },
  { key: "protection", tint: "bg-mint/60", Icon: ShieldCheck, short: { hi: "Bima", en: "Cover" } },
] as const;

const STATUS = {
  red: { dot: "bg-danger", hi: "Abhi karein", en: "Act now" },
  amber: { dot: "bg-amber", hi: "Dhyaan dein", en: "Watch" },
  green: { dot: "bg-leaf", hi: "Theek hai", en: "Safe" },
};

/** Big number + small unit, so values never overflow a narrow tile. */
function Value({ m, lang }: { m: Metric; lang: "hi" | "en" }) {
  const big = "text-[28px] font-extrabold num leading-none";
  const unit = "ml-1 text-[13px] font-semibold text-muted";
  if (m.unit === "status" || m.value == null) return <p className={`${big} text-[24px]`}>{metricValue(m, lang)}</p>;
  if (m.unit === "inr") return <p className={big}>{inr(m.value)}</p>;
  if (m.unit === "days") return <p className={big}>{m.value}<span className={unit}>{lang === "hi" ? "din" : "days"}</span></p>;
  if (m.unit === "per100") return <p className={big}>₹{m.value}<span className={unit}>{lang === "hi" ? "har ₹100 mein" : "per ₹100"}</span></p>;
  return <p className={big}>{m.value}</p>;
}

export function metricValue(m: Metric, lang: "hi" | "en") {
  if (m.unit === "status") return m.status === "green" ? (lang === "hi" ? "Poora" : "Covered") : m.status === "amber" ? (lang === "hi" ? "Aadha" : "Partial") : (lang === "hi" ? "Nahi" : "None");
  if (m.value == null) return lang === "hi" ? "Pata nahi" : "Unknown";
  if (m.unit === "inr") return inr(m.value);
  if (m.unit === "days") return `${m.value} ${lang === "hi" ? "din" : "days"}`;
  if (m.unit === "per100") return `₹${m.value}/₹100`;
  return String(m.value);
}

/** Four family numbers. Tap for Kyon? + "Yeh galat hai". */
export default function HealthTiles({ d }: { d: Dashboard }) {
  const { t, lang } = useApp();
  const [open, setOpen] = useState<MetricKey | null>(null);
  // The Cover tile opens the Suraksha plan (Jan Suraksha + cover engine), not just the metric.
  const [suraksha, setSuraksha] = useState(false);
  return (
    <div className="grid grid-cols-2 gap-3 px-5 lg:px-0">
      {TILES.map(({ key, tint, Icon, short }) => {
        const m = d.metrics[key];
        const st = STATUS[m.status];
        return (
          <button key={key} onClick={() => (key === "protection" ? setSuraksha(true) : setOpen(key))} className="min-w-0 rounded-[24px] bg-white p-4 text-left shadow-soft active:scale-[.98] transition">
            <div className="flex items-center gap-2">
              <span className={`grid place-items-center h-10 w-10 shrink-0 rounded-full ${tint}`}><Icon size={18} /></span>
              <span className="min-w-0 flex items-center gap-1.5 text-[12px] font-bold text-muted whitespace-nowrap overflow-hidden">
                <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot}`} /><span className="truncate">{st[lang]}</span>
              </span>
            </div>
            <p className="mt-4 text-[13px] font-semibold text-muted truncate">{t(short)}</p>
            <div className="mt-1"><Value m={m} lang={lang} /></div>
          </button>
        );
      })}
      <MetricSheet k={open} onClose={() => setOpen(null)} />
      <SurakshaPlanSheet open={suraksha} onClose={() => setSuraksha(false)} onTileDetails={() => { setSuraksha(false); setOpen("protection"); }} />
    </div>
  );
}
