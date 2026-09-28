"use client";
import { useEffect, useRef, useState } from "react";
import CashRiver from "@/components/ui/CashRiver";
import BeforeAfter from "@/components/whatif/BeforeAfter";
import Responses from "@/components/whatif/Responses";
import PlanDates from "@/components/whatif/PlanDates";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";
import type { SimResult } from "@/lib/types";

/** Agar…? shock simulator — always a scenario branch of E03. */
export default function WhatIf({ showRiver = false }: { showRiver?: boolean }) {
  const { hid, t, lang } = useApp();
  const [shock, setShock] = useState(0);
  const [delay, setDelay] = useState(0);
  const [res, setRes] = useState<SimResult | null>(null);
  // Never show old figures as if they were current: pending hides them until the engine answers.
  const [state, setState] = useState<"pending" | "ready" | "error">("pending");
  const [retry, setRetry] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const req = useRef(0);

  useEffect(() => {
    setState("pending");
    clearTimeout(timer.current);
    const n = ++req.current;
    timer.current = setTimeout(() => {
      api.simulate(hid, { shock_amount: shock, salary_delay_days: delay })
        .then((r) => { if (n === req.current) { setRes(r); setState("ready"); } })
        .catch(() => { if (n === req.current) setState("error"); });
    }, 180);
    return () => clearTimeout(timer.current);
  }, [hid, shock, delay, retry]);

  const hi = lang === "hi";
  return (
    <section className="mx-5 lg:mx-0 rounded-[32px] bg-ink text-white p-5 shadow-lift relative overflow-hidden">
      <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-haldi/10" />
      <div className="flex items-center justify-between">
        <p className="text-[19px] font-extrabold">Agar…? <span className="text-white/50 text-sm font-semibold">{hi ? "(What if?)" : ""}</span></p>
        <span className="rounded-full bg-haldi text-ink px-2.5 py-1 text-[11px] font-extrabold">🔮 {hi ? "SIRF ANDAAZA" : "SCENARIO ONLY"}</span>
      </div>
      <p className="mt-1 text-[12px] text-white/70">{hi ? "Aapka asli plan nahi badlega" : "Preview only — your real plan is unchanged"}</p>

      <label className="block mt-5">
        <div className="flex justify-between text-sm"><span>🏥 {t({ hi: "Hospital ka bill aaye", en: "A hospital bill comes" })}</span><b className="num text-haldi">{inr(shock)}</b></div>
        <input type="range" className="slider w-full mt-3" min={0} max={100000} step={5000} value={shock} onChange={(e) => setShock(+e.target.value)} />
      </label>
      <label className="block mt-5">
        <div className="flex justify-between text-sm"><span>⏳ {t({ hi: "Salary late ho", en: "Salary is late by" })}</span><b className="num text-haldi">{delay} {hi ? "din" : "days"}</b></div>
        <input type="range" className="slider w-full mt-3" min={0} max={15} step={1} value={delay} onChange={(e) => setDelay(+e.target.value)} />
      </label>

      <div aria-live="polite">
        {state === "pending" && (
          <div role="status" className="mt-5 rounded-[22px] bg-white/10 p-4 text-center">
            <p className="font-extrabold">{hi ? "Hisaab ho raha hai…" : "Recalculating…"}</p>
            <p className="text-[12px] text-white/60 mt-1">{hi ? "Naye aankde aane tak koi rakam nahi dikhayenge" : "Figures appear once the engine answers"}</p>
          </div>
        )}
        {state === "error" && (
          <div role="alert" className="mt-5 rounded-[22px] bg-white/10 p-4">
            <p className="font-extrabold">{hi ? "Abhi hisaab nahi ho paaya" : "Couldn't calculate right now"}</p>
            <button onClick={() => setRetry((x) => x + 1)} className="mt-2 rounded-full bg-white text-ink px-3 min-h-10 text-xs font-bold">{hi ? "Phir koshish karein" : "Try again"}</button>
          </div>
        )}
        {state === "ready" && res && (
          <>
            <BeforeAfter res={res} dark />
            <p className="mt-3 text-[13px] text-white/80 leading-snug">{t(res.message)}</p>
            <Responses res={res} dark />
            {showRiver && (
              <div className="mt-3 rounded-[22px] bg-cream text-ink p-3">
                <CashRiver river={res.river} compact />
                <PlanDates river={res.river} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
