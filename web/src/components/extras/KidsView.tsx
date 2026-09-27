"use client";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Gullak from "@/components/art/Gullak";
import { useApp } from "@/lib/store";
import type { Jar } from "@/lib/types";

const TONE: Record<Jar["kind"], "clay" | "haldi" | "rose"> = { emergency: "clay", school: "haldi", festival: "rose", education: "haldi" };
const EMOJI: Record<Jar["kind"], string> = { emergency: "☂️", school: "🎒", festival: "🪔", education: "📚" };

const TIPS = [
  { hi: "Light band karke kamre se niklo 💡", en: "Switch off the light when you leave 💡" },
  { hi: "Ek sikka aaj gullak mein daalo 🪙", en: "Drop one coin in the gullak today 🪙" },
  { hi: "Paani ki bottle ghar se le jao 💧", en: "Carry a water bottle from home 💧" },
  { hi: "Khilona lene se pehle 2 din socho 🤔", en: "Wait 2 days before asking for a toy 🤔" },
];

/** Kids view — only percentages and emoji, never rupee amounts or balances. */
export default function KidsView({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, t, speak, lang } = useApp();
  const [tip, setTip] = useState(0);
  useEffect(() => { if (!open && typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, [open]);
  useEffect(() => () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);
  if (!data) return null;
  const m = data.game.mission;
  const mPct = m.target > 0 ? Math.min(100, Math.round((m.progress / m.target) * 100)) : 0;

  return (
    <Sheet open={open} onClose={onClose} title={<p className="text-[24px] font-extrabold">{t({ hi: "Bachchon ki duniya 🧸", en: "Kids corner 🧸" })}</p>}>
      <div className="grid grid-cols-2 gap-3">
        {data.jars.map((j) => {
          const pct = j.goal > 0 ? Math.min(100, Math.round((j.saved / j.goal) * 100)) : 0;
          return (
            <motion.button key={j.id} whileTap={{ scale: 0.94 }}
              onClick={() => speak({ hi: `${j.name.hi} ${pct} pratishat bhar gaya!`, en: `${j.name.en} is ${pct} percent full!` })}
              className="rounded-[28px] bg-clay-soft p-3 min-h-44 flex flex-col items-center justify-center">
              <Gullak fill={pct / 100} size={110} tone={TONE[j.kind]} />
              <p className="text-[28px] font-extrabold num leading-none mt-1">{EMOJI[j.kind]} {pct}%</p>
              <p className="text-[13px] font-bold mt-1">{t(j.name)}</p>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[28px] bg-lav p-4">
        <p className="text-[16px] font-extrabold">🚀 {t(m.title)}</p>
        <div className="mt-3 h-6 rounded-full bg-white overflow-hidden relative">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-haldi to-clay" initial={{ width: 0 }} animate={{ width: `${mPct}%` }} transition={{ duration: 1.2 }} />
          <span className="absolute inset-0 grid place-items-center text-[13px] font-extrabold">{mPct}%</span>
        </div>
      </div>

      <div className="mt-4 rounded-[28px] bg-haldi p-4 flex items-center gap-3">
        <motion.span className="text-[48px] leading-none" animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>🔥</motion.span>
        <p className="text-[26px] font-extrabold num">{data.game.streak} {lang === "hi" ? "din!" : "days!"}</p>
      </div>

      <button onClick={() => { const n = (tip + 1) % TIPS.length; setTip(n); speak(TIPS[n]); }}
        className="mt-4 w-full min-h-20 rounded-[28px] bg-mint p-4 text-left active:scale-[.98] transition">
        <p className="text-[12px] font-bold uppercase tracking-widest text-leaf">{t({ hi: "Aaj ki chhoti aadat", en: "Today's tiny habit" })}</p>
        <p className="text-[18px] font-extrabold mt-1">{t(TIPS[tip])}</p>
      </button>
    </Sheet>
  );
}
