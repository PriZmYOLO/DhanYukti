"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { useApp } from "@/lib/store";
import { inr } from "@/lib/format";
import type { SpendSlice } from "@/lib/types";

const COL: Record<SpendSlice["key"], string> = { ghar: "#2E2A6B", khana: "#F7C548", emi: "#E0473E", bachat: "#1F8A5B", baaki: "#F7C6D6" };
const EMOJI: Record<SpendSlice["key"], string> = { ghar: "🏠", khana: "🍛", emi: "🏦", bachat: "🪙", baaki: "🛍️" };

export default function Donut({ spend }: { spend: SpendSlice[] }) {
  const { t } = useApp();
  const [sel, setSel] = useState<number | null>(null);
  const total = spend.reduce((s, x) => s + x.amount, 0) || 1;
  const R = 52, C = 2 * Math.PI * R;
  const offs = spend.map((_, i) => spend.slice(0, i).reduce((a, x) => a + x.amount, 0) / total);
  const active = sel != null ? spend[sel] : null;
  return (
    <div>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 140 140" className="w-36 h-36 shrink-0 -rotate-90">
          {spend.map((s, i) => {
            const frac = s.amount / total; const off = offs[i];
            return (
              <motion.circle key={s.key} cx="70" cy="70" r={R} fill="none" stroke={COL[s.key]} strokeWidth={sel === i ? 26 : 20}
                strokeDasharray={`${Math.max(0, C * frac - 3)} ${C}`} strokeDashoffset={-C * off}
                initial={{ opacity: 0 }} animate={{ opacity: sel == null || sel === i ? 1 : 0.35 }}
                onClick={() => setSel(sel === i ? null : i)} style={{ cursor: "pointer" }} />
            );
          })}
        </svg>
        <div className="flex-1 space-y-1.5">
          {spend.map((s, i) => (
            <button key={s.key} onClick={() => setSel(sel === i ? null : i)} className={`w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-left ${sel === i ? "bg-lav" : ""}`}>
              <span className="text-base">{EMOJI[s.key]}</span>
              <span className="flex-1 text-sm font-semibold">{t(s.label)}</span>
              <span className="text-sm font-bold num">{inr(s.amount)}</span>
            </button>
          ))}
        </div>
      </div>
      {active && (
        <div className="mt-3 rounded-2xl bg-white p-3 space-y-1.5">
          {active.top.slice(0, 3).map((x, i) => (
            <div key={i} className="flex justify-between text-sm"><span className="truncate text-muted">{x.narration}</span><span className="font-bold num">{inr(x.amount)}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}
