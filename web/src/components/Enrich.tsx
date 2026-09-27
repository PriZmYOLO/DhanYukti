"use client";
import { useState } from "react";
import { Zap, Bike, Wheat, PiggyBank, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import type { L } from "@/lib/types";

type Kind = "electricity" | "rc" | "ration" | "epf";
const ITEMS: { k: Kind; Icon: typeof Zap; name: L; why: L; bg: string }[] = [
  { k: "electricity", Icon: Zap, name: { hi: "Bijli ka bill", en: "Electricity bill" }, why: { hi: "Bill ki pakki tareekh calendar mein", en: "Confirmed bill date in your calendar" }, bg: "bg-haldi-soft" },
  { k: "rc", Icon: Bike, name: { hi: "Gaadi (RC)", en: "Vehicle (RC)" }, why: { hi: "Kaam ki gaadi ka bima kab khatam", en: "When your work vehicle's insurance ends" }, bg: "bg-lav" },
  { k: "ration", Icon: Wheat, name: { hi: "Ration card", en: "Ration card" }, why: { hi: "Sarkari yojana ke liye", en: "For welfare scheme hints" }, bg: "bg-mint" },
  { k: "epf", Icon: PiggyBank, name: { hi: "PF passbook", en: "EPF passbook" }, why: { hi: "Retirement bachat — kharch ke liye nahi", en: "Retirement savings — locked, not spendable" }, bg: "bg-rose" },
];

/** Perfios Hub enrichment — each source asked separately, only when it changes a decision. */
export default function Enrich() {
  const { hid, t, lang } = useApp();
  const [res, setRes] = useState<Partial<Record<Kind, { used_for: L; mode: string; result: Record<string, unknown> }>>>({});
  const [busy, setBusy] = useState<Kind | null>(null);
  const run = async (k: Kind) => {
    setBusy(k);
    try { const r = await api.enrich(hid, k); setRes((x) => ({ ...x, [k]: r })); } catch { /* shown as not connected */ } finally { setBusy(null); }
  };
  return (
    <div className="mx-5 lg:mx-0 space-y-2">
      {ITEMS.map(({ k, Icon, name, why, bg }) => {
        const r = res[k];
        return (
          <div key={k} className={`rounded-[24px] p-3 ${bg}`}>
            <div className="flex items-center gap-3">
              <span className="grid place-items-center h-11 w-11 rounded-full bg-white/80"><Icon size={20} /></span>
              <div className="flex-1"><p className="font-bold text-sm">{t(name)}</p><p className="text-[11px] opacity-70 leading-snug">{r ? t(r.used_for) : t(why)}</p></div>
              {r ? <span className="grid place-items-center h-9 w-9 rounded-full bg-leaf text-white"><Check size={18} /></span> : (
                <button onClick={() => run(k)} disabled={busy === k} className="min-h-10 rounded-full bg-ink text-white px-3 text-xs font-bold disabled:opacity-50">
                  {busy === k ? "…" : lang === "hi" ? "Haan, jodo" : "Yes, add"}
                </button>
              )}
            </div>
            {r && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {Object.entries(r.result).filter(([, v]) => typeof v !== "object").slice(0, 4).map(([key, v]) => (
                  <div key={key} className="rounded-xl bg-white/70 px-2.5 py-1.5"><p className="text-[11px] uppercase font-bold text-muted truncate">{key.replace(/_/g, " ")}</p><p className="text-xs font-bold truncate">{String(v)}</p></div>
                ))}
                <p className="col-span-2 text-[11px] text-muted">Perfios Hub · {r.mode}</p>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-[11px] text-muted px-1">{t({ hi: "Har jaankari ke liye alag permission. Sirf tab poochte hain jab isse faisla badle.", en: "Separate consent for each. We only ask when it changes a decision." })}</p>
    </div>
  );
}
