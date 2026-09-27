"use client";
import { useEffect, useRef, useState } from "react";
import CashRiver from "@/components/ui/CashRiver";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";
import type { SimResult } from "@/lib/types";

/** Agar…? shock simulator — always a scenario branch of E03. */
export default function WhatIf({ showRiver = false }: { showRiver?: boolean }) {
  const { hid, t, lang, data } = useApp();
  const [shock, setShock] = useState(0);
  const [delay, setDelay] = useState(0);
  const [res, setRes] = useState<SimResult | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.simulate(hid, { shock_amount: shock, salary_delay_days: delay }).then(setRes).catch(() => {});
    }, 180);
    return () => clearTimeout(timer.current);
  }, [hid, shock, delay]);

  const base = data?.metrics.resilience_days.value ?? null;
  return (
    <section className="mx-5 lg:mx-0 rounded-[32px] bg-ink text-white p-5 shadow-lift relative overflow-hidden">
      <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-haldi/10" />
      <div className="flex items-center justify-between">
        <p className="text-[19px] font-extrabold">Agar…? <span className="text-white/50 text-sm font-semibold">{lang === "hi" ? "(What if?)" : ""}</span></p>
        <span className="rounded-full bg-haldi text-ink px-2.5 py-1 text-[11px] font-extrabold">🔮 {lang === "hi" ? "SIRF ANDAAZA" : "SCENARIO ONLY"}</span>
      </div>

      <label className="block mt-5">
        <div className="flex justify-between text-sm"><span>🏥 {t({ hi: "Hospital ka bill aaye", en: "A hospital bill comes" })}</span><b className="num text-haldi">{inr(shock)}</b></div>
        <input type="range" className="slider w-full mt-3" min={0} max={100000} step={5000} value={shock} onChange={(e) => setShock(+e.target.value)} />
      </label>
      <label className="block mt-5">
        <div className="flex justify-between text-sm"><span>⏳ {t({ hi: "Salary late ho", en: "Salary is late by" })}</span><b className="num text-haldi">{delay} {lang === "hi" ? "din" : "days"}</b></div>
        <input type="range" className="slider w-full mt-3" min={0} max={15} step={1} value={delay} onChange={(e) => setDelay(+e.target.value)} />
      </label>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[22px] bg-white/10 p-3">
          <p className="text-[11px] text-white/60">{lang === "hi" ? "Bachav ke din" : "Resilience days"}</p>
          <p className="text-3xl font-extrabold num">{res?.resilience_days ?? "—"}<span className="text-sm text-white/50 ml-1">{base != null && res && res.resilience_days !== base ? `(${base})` : ""}</span></p>
        </div>
        <div className="rounded-[22px] bg-white/10 p-3">
          <p className="text-[11px] text-white/60">{lang === "hi" ? "Sabse badi kami" : "Biggest shortfall"}</p>
          <p className={`text-3xl font-extrabold num ${res && res.river.gap > 0 ? "text-[#ff8a80]" : "text-mint"}`}>{res ? (res.river.gap > 0 ? `−${inr(res.river.gap)}` : "₹0") : "—"}</p>
        </div>
      </div>
      {res && <p className="mt-3 text-[13px] text-white/80 leading-snug">{t(res.message)}</p>}
      {showRiver && res && <div className="mt-3 rounded-[22px] bg-cream text-ink p-3"><CashRiver river={res.river} compact /></div>}
    </section>
  );
}
