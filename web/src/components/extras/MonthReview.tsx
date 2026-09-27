"use client";
import { useEffect } from "react";
import { motion } from "motion/react";
import { PiggyBank, ShieldCheck, Target } from "lucide-react";
import { SpeakBtn, Skeleton } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { inr } from "@/lib/format";

/** "Is mahine ka hisaab" — month-end review card. Display only; values come from the server. */
export default function MonthReview() {
  const { data, t, lang } = useApp();
  useEffect(() => () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);
  if (!data) return <Skeleton h={320} className="w-full" />;

  const saved = data.jars.reduce((s, j) => s + j.saved, 0);
  const ledger = data.game.ledger;
  const avoided = ledger.reduce((s, l) => s + l.amount, 0);
  const m = data.game.mission;
  const pct = m.target > 0 ? Math.min(100, Math.round((m.progress / m.target) * 100)) : 0;
  const done = m.progress >= m.target;

  const summary = {
    hi: `Is mahine aapne ${inr(saved)} bachaye aur ${inr(avoided)} ka nuksaan roka. Chalo, agle mahine ₹500 aur bachate hain.`,
    en: `This month you saved ${inr(saved)} and avoided ${inr(avoided)} in losses. Let's save ₹500 more next month.`,
  };

  return (
    <section className="w-full rounded-[28px] bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-[12px] font-bold uppercase tracking-widest text-clay">{t({ hi: "Mahine ka ant", en: "Month end" })}</p>
          <h3 className="text-[20px] font-extrabold tracking-tight leading-tight">{t({ hi: "Is mahine ka hisaab", en: "This month's review" })}</h3>
        </div>
        <SpeakBtn v={summary} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[22px] bg-haldi-soft p-3">
          <PiggyBank size={20} className="text-clay" />
          <p className="mt-1 text-[22px] font-extrabold num leading-none">{inr(saved)}</p>
          <p className="text-[12px] font-semibold text-muted mt-1">{t({ hi: "Gullak mein bachaye", en: "Saved in jars" })}</p>
        </div>
        <div className="rounded-[22px] bg-mint p-3">
          <ShieldCheck size={20} className="text-leaf" />
          <p className="mt-1 text-[22px] font-extrabold num leading-none text-leaf">{inr(avoided)}</p>
          <p className="text-[12px] font-semibold text-muted mt-1">{t({ hi: "Nuksaan roka", en: "Losses avoided" })}</p>
        </div>
      </div>

      {ledger.length > 0 && (
        <ul className="mt-3 divide-y divide-ink/5">
          {ledger.map((l, i) => (
            <li key={i} className="flex items-center gap-2 py-2">
              <span className="flex-1 text-[13px] font-semibold leading-snug">{t(l.what)}</span>
              <span className="font-extrabold num text-leaf text-sm">{inr(l.amount)}</span>
              <span className={`text-[11px] font-bold rounded px-1.5 py-0.5 ${l.evidenced ? "bg-leaf text-white" : "bg-lav text-muted"}`}>
                {l.evidenced ? (lang === "hi" ? "PAKKA" : "EVIDENCED") : (lang === "hi" ? "BATAYA" : "REPORTED")}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 rounded-[22px] bg-lav p-3">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-ink-2" />
          <p className="flex-1 text-[13px] font-bold leading-snug">{t(m.title)}</p>
          <span className="text-[12px] font-extrabold num">{done ? "🎉" : `${pct}%`}</span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-white overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-clay to-rose-deep" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
        </div>
        <p className="mt-1.5 text-[12px] font-semibold num text-muted">{inr(m.progress)} / {inr(m.target)}</p>
      </div>

      <p className="mt-4 text-[15px] font-extrabold text-ink-2">
        {t({ hi: "Chalo, agle mahine ₹500 aur bachate hain 💪", en: "Let's save ₹500 more next month 💪" })}
      </p>
    </section>
  );
}
