"use client";
import { motion } from "motion/react";
import Avatar from "@/components/art/Avatar";
import { useApp } from "@/lib/store";
import { inr } from "@/lib/format";

export default function Mission() {
  const { data, t, lang } = useApp();
  if (!data) return null;
  const m = data.game.mission;
  const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
  return (
    <section className="mx-5 lg:mx-0 rounded-[32px] bg-rose p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#9E2A56]">{lang === "hi" ? "Parivaar mission" : "Family mission"}</p>
        <div className="flex -space-x-3">{data.household.members.map((mb) => <Avatar key={mb.id} kind={mb.avatar} size={32} ring />)}</div>
      </div>
      <p className="text-lg font-extrabold mt-1">{t(m.title)}</p>
      <div className="mt-3 h-4 rounded-full bg-white/70 overflow-hidden">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-clay to-rose-deep" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
      </div>
      <p className="mt-2 text-sm font-bold num">{inr(m.progress)} / {inr(m.target)} {lang === "hi" ? "bacha liye" : "saved"} · {pct}%</p>
    </section>
  );
}
