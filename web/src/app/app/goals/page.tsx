"use client";
import { useEffect, useMemo } from "react";
import TopBar from "@/components/TopBar";
import JarsRow from "@/components/home/JarsRow";
import Mission from "@/components/home/Mission";
import WhatIf from "@/components/home/WhatIf";
import AffordCheck from "@/components/AffordCheck";
import Donut from "@/components/ui/Donut";
import ProCharts from "@/components/extras/ProCharts";
import Gullak from "@/components/art/Gullak";
import { HelpLink, SectionTitle, Skeleton } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import CoverCheck from "@/components/gov/CoverCheck";
import AgentCheck from "@/components/AgentCheck";
import SurakshaCheck from "@/components/gov/SurakshaCheck";
import { inr } from "@/lib/format";

export default function Goals() {
  const { data, t, lang, mode, speak } = useApp();
  const saved = data?.jars.reduce((s, j) => s + j.saved, 0) ?? 0;
  const goal = data?.jars.reduce((s, j) => s + j.goal, 0) ?? 0;
  const progress = useMemo(() => ({ hi: `Aapke Gullak mein ${inr(saved)} hain, lakshya ${inr(goal)}.`, en: `Your jars hold ${inr(saved)} of ${inr(goal)}.` }), [saved, goal]);

  // Shake the phone to hear jar progress.
  useEffect(() => {
    let last = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity; if (!a) return;
      const force = Math.abs(a.x ?? 0) + Math.abs(a.y ?? 0) + Math.abs(a.z ?? 0);
      if (force > 35 && Date.now() - last > 4000) { last = Date.now(); speak(progress); }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [speak, progress]);

  // Deep link from the Home cover card: /app/goals#cover
  useEffect(() => {
    if (data && window.location.hash === "#cover") setTimeout(() => document.getElementById("cover")?.scrollIntoView({ behavior: "smooth" }), 150);
  }, [data]);

  if (!data) return <div className="p-5 space-y-4"><Skeleton h={220} /><Skeleton h={300} /></div>;
  return (
    <div>
      <TopBar title={lang === "hi" ? "Lakshya" : "Goals"} speakText={progress} />
      <div className="lg:grid lg:grid-cols-[1fr_1.2fr] lg:gap-6 lg:items-start">
        <div>
          <section className="mx-5 lg:mx-0 mt-3 rounded-[32px] bg-clay text-white p-5 relative overflow-hidden min-h-[170px]">
            <div className="absolute -right-4 -bottom-3"><Gullak fill={saved / Math.max(1, goal)} size={120} tone="haldi" /></div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-white/80">{lang === "hi" ? "Kul bachat" : "Total saved"}</p>
            <p className="text-[42px] font-extrabold num leading-tight">{inr(saved)}</p>
            <p className="text-sm text-white/85">{t({ hi: `Lakshya ${inr(goal)}`, en: `Goal ${inr(goal)}` })}</p>
            <p className="text-[11px] text-white/70 mt-2">📳 {t({ hi: "Phone hilaiye, sunaiye", en: "Shake to hear progress" })}</p>
          </section>
          <SectionTitle v={{ hi: "Mere Gullak", en: "My jars" }} />
          <JarsRow big />
          <div className="mt-5"><Mission /></div>
        </div>
        <div>
          <SectionTitle v={{ hi: "Agar…?", en: "What if…?" }} />
          <WhatIf showRiver />
          <SectionTitle v={{ hi: "Khareedne se pehle", en: "Before you buy" }} />
          <AffordCheck />
        </div>
      </div>
      <section id="cover" className="scroll-mt-4">
        <SectionTitle v={{ hi: "Parivaar ki suraksha", en: "Family protection" }} right={<span className="text-[11px] font-bold text-muted">{lang === "hi" ? "Engine, product nahi" : "Engine, not a product"}</span>} />
        <div className="lg:grid lg:grid-cols-[1fr_1.2fr] lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
          <SurakshaCheck />
          <CoverCheck />
        </div>
        <div className="mt-4 lg:max-w-xl"><AgentCheck /></div>
      </section>
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        <div>
          <SectionTitle v={{ hi: "Kahaan gaya paisa", en: "Where the money went" }} />
          <div className="mx-5 lg:mx-0 rounded-[28px] bg-white p-4 shadow-soft"><Donut spend={data.spend} /></div>
        </div>
        {mode === "pro" && <div><SectionTitle v={{ hi: "Pro: mahine dar mahine", en: "Pro: month by month" }} /><div className="mx-5 lg:mx-0"><ProCharts /></div></div>}
      </div>
      <HelpLink />
    </div>
  );
}
