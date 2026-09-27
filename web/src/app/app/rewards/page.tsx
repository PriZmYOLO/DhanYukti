"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { Flame, ShieldCheck, Baby } from "lucide-react";
import TopBar from "@/components/TopBar";
import LevelTree from "@/components/art/LevelTree";
import Avatar from "@/components/art/Avatar";
import MonthReview from "@/components/extras/MonthReview";
import Lessons from "@/components/extras/Lessons";
import KidsView from "@/components/extras/KidsView";
import Mission from "@/components/home/Mission";
import { HelpLink, SectionTitle, Skeleton } from "@/components/ui/bits";
import { useApp } from "@/lib/store";

const LEVELS = [
  { hi: "Beej", en: "Seed", at: 0 }, { hi: "Ankur", en: "Sprout", at: 200 }, { hi: "Paudha", en: "Plant", at: 500 },
  { hi: "Ped", en: "Tree", at: 1000 }, { hi: "Bargad", en: "Banyan", at: 2000 },
];

export default function Rewards() {
  const { data, t, lang, award } = useApp();
  const [kids, setKids] = useState(false);
  if (!data) return <div className="p-5 space-y-4"><Skeleton h={260} /><Skeleton h={200} /></div>;
  const g = data.game;
  const cur = LEVELS[g.level - 1], next = LEVELS[g.level];
  const pct = next ? Math.min(100, ((g.points - cur.at) / (next.at - cur.at)) * 100) : 100;
  const week = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div>
      <TopBar title={lang === "hi" ? "Inaam" : "Rewards"} speakText={{ hi: `Aapke ${g.points} Paisa Points hain. ${g.streak} din ka streak.`, en: `You have ${g.points} Paisa Points and a ${g.streak}-day streak.` }} />
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 mt-3">
        <section className="mx-5 lg:mx-0 rounded-[32px] bg-ink text-white p-5 relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-leaf/40 to-transparent" />
          <div className="relative flex items-center gap-2">
            <div className="flex-1">
              <p className="text-[12px] font-bold uppercase tracking-widest text-haldi">Level {g.level}</p>
              <p className="text-[34px] font-extrabold leading-none mt-1">{t(g.level_name)}</p>
              <p className="mt-3 text-[38px] font-extrabold num leading-none">{g.points}<span className="text-sm text-white/60 ml-1">points</span></p>
            </div>
            <LevelTree level={g.level} size={130} />
          </div>
          <div className="relative mt-3 h-3 rounded-full bg-white/15 overflow-hidden"><motion.div className="h-full bg-haldi rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} /></div>
          <div className="relative mt-2 flex justify-between text-[11px] text-white/60">{LEVELS.map((l, i) => <span key={l.hi} className={i < g.level ? "text-haldi font-bold" : ""}>{lang === "hi" ? l.hi : l.en}</span>)}</div>
        </section>
        <section className="mx-5 lg:mx-0 mt-4 lg:mt-0 rounded-[32px] bg-haldi p-5">
          <div className="flex items-center gap-2">
            <Flame className="text-clay fill-clay" size={28} />
            <p className="text-2xl font-extrabold num">{g.streak} {lang === "hi" ? "din" : "days"}</p>
            <span className="ml-auto flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold" title="Streak shield"><ShieldCheck size={14} />{g.streak_shield}</span>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {week.map((d, i) => (
              <div key={i} className={`rounded-2xl py-2 text-center ${i < g.streak % 8 ? "bg-ink text-haldi" : "bg-white/60"}`}>
                <p className="text-[11px] font-bold opacity-70">{d}</p><p className="text-base">{i < g.streak % 8 ? "🔥" : "·"}</p>
              </div>
            ))}
          </div>
          <button onClick={() => award("checkin", { hi: "Aaj ka hisaab dekha!", en: "Checked today!" })} className="mt-3 w-full min-h-12 rounded-[18px] bg-ink text-white font-bold">
            {lang === "hi" ? "Aaj ka hisaab dekha ✓" : "I checked today ✓"}
          </button>
        </section>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        <div>
          <SectionTitle v={{ hi: "Is mahine ka hisaab", en: "This month" }} />
          <div className="mx-5 lg:mx-0"><MonthReview /></div>
        </div>
        <div>
          <SectionTitle v={{ hi: "Parivaar mission", en: "Family mission" }} right={
            <button onClick={() => setKids(true)} className="flex items-center gap-1 rounded-full bg-white px-3 min-h-10 text-xs font-bold shadow-soft"><Baby size={14} />{lang === "hi" ? "Bachchon ka view" : "Kids view"}</button>} />
          <Mission />
          <div className="mx-5 lg:mx-0 mt-3 rounded-[28px] bg-white p-2 shadow-soft">
            {[...g.leaderboard].sort((a, b) => b.habits - a.habits).map((r, i) => {
              const m = data.household.members.find((x) => x.id === r.member_id);
              return (
                <div key={r.member_id} className="flex items-center gap-3 p-2.5">
                  <span className="w-6 text-center">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                  {m && <Avatar kind={m.avatar} size={36} />}
                  <span className="flex-1 font-bold">{r.name}</span>
                  <span className="text-sm num"><b>{r.habits}</b> <span className="text-muted text-xs">{lang === "hi" ? "aadat" : "habits"}</span></span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SectionTitle v={{ hi: "Badges", en: "Badges" }} />
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3 px-5 lg:px-0">
        {g.badges.map((b) => (
          <div key={b.id} className={`rounded-[24px] p-3 text-center ${b.earned ? "bg-white shadow-soft" : "bg-white/40"}`}>
            <div className={`mx-auto grid place-items-center h-14 w-14 rounded-full text-3xl ${b.earned ? "bg-haldi" : "bg-lav grayscale opacity-50"}`}>{b.icon}</div>
            <p className={`mt-2 text-[12px] font-extrabold leading-tight ${b.earned ? "" : "text-muted"}`}>{t(b.name)}</p>
          </div>
        ))}
      </div>

      <SectionTitle v={{ hi: "60 second seekho", en: "60-second lessons" }} />
      <div className="mx-5 lg:mx-0"><Lessons /></div>
      <HelpLink />
      <KidsView open={kids} onClose={() => setKids(false)} />
    </div>
  );
}
