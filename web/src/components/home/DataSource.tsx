"use client";
import { useState } from "react";
import { Check, X, ChevronDown } from "lucide-react";
import { useApp } from "@/lib/store";

/** Shows where the numbers came from: Anumati AA + Perfios analytics, and where our E01 disagrees. */
export default function DataSource() {
  const { data, t, lang } = useApp();
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const ds = data.data_source;
  const mode = { live: { c: "bg-leaf", l: "Live sandbox" }, replay: { c: "bg-amber", l: "Replay (recorded sandbox)" }, fixture: { c: "bg-muted", l: "Demo fixture" } }[ds.mode];
  return (
    <section className="mx-5 lg:mx-0 rounded-[28px] bg-white/70 border border-white p-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 text-left">
        <span className={`h-2.5 w-2.5 rounded-full ${mode.c}`} />
        <span className="flex-1 text-[13px]"><b>{ds.aa}</b> + <b>{ds.analytics}</b><br /><span className="text-muted text-xs">{mode.l}</span></span>
        <ChevronDown size={18} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {data.crosscheck.length === 0 ? (
            <p className="text-xs text-muted leading-snug">{lang === "hi" ? `Yeh hisaab DhanYukti ke engines ne aapke apne bank data se banaya (${data.as_of} tak). Perfios ka mel-milaan is data par nahi chala.` : `Worked out by DhanYukti's engines from your own bank data (up to ${data.as_of}). No Perfios cross-check ran on this data.`}</p>
          ) : <p className="text-xs font-bold text-muted">{lang === "hi" ? "Hamara hisaab vs Perfios analytics" : "Our E01 vs Perfios analytics"}</p>}
          {data.crosscheck.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-xs rounded-xl bg-white px-3 py-2">
              <span className="font-semibold">{t(c.field)}</span><span className="num">{c.ours}</span><span className="num text-muted">{c.perfios}</span>
              {c.agree ? <Check size={14} className="text-leaf" /> : <X size={14} className="text-amber" />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
