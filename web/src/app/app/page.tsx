"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import TodayCards from "@/components/home/TodayCards";
import HealthTiles from "@/components/home/HealthTiles";
import RiverCard from "@/components/home/RiverCard";
import JarsRow from "@/components/home/JarsRow";
import AffordCheck from "@/components/AffordCheck";
import DemoDataChip from "@/components/DemoDataChip";
import { HelpLink, SectionTitle, Skeleton } from "@/components/ui/bits";
import { useApp } from "@/lib/store";

export default function Home() {
  const { data, error, onboarded, lang, mode, refresh, speak } = useApp();
  const router = useRouter();
  const spoke = useRef(false);
  useEffect(() => { if (!onboarded) router.replace("/"); }, [onboarded, router]);
  // Aasaan mode: read today's task aloud once.
  useEffect(() => {
    if (mode !== "aasaan" || !data?.nba[0] || spoke.current) return;
    spoke.current = true;
    const n = data.nba[0];
    const id = setTimeout(() => speak({ hi: `${n.title.hi}. Aaj ka kaam: ${n.task.hi}`, en: `${n.title.en}. Today's task: ${n.task.en}` }), 800);
    return () => clearTimeout(id);
  }, [mode, data, speak]);

  if (error && !data) return (
    <div className="p-8 text-center mt-24">
      <p className="text-5xl">📡</p>
      <p className="mt-4 text-lg font-bold">{lang === "hi" ? "Network kamzor hai" : "Network is weak"}</p>
      <button onClick={refresh} className="mt-5 rounded-[20px] bg-ink text-white px-6 min-h-12 font-bold">{lang === "hi" ? "Dobara" : "Retry"}</button>
    </div>
  );
  if (!data) return <div className="p-5 space-y-4 mt-4"><Skeleton h={56} /><Skeleton h={300} /><Skeleton h={200} /></div>;

  return (
    <div>
      <TopBar />
      <div className="px-5 lg:px-0"><DemoDataChip /></div>
      <div className="lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-6 lg:items-start mt-2">
        <div>
          <SectionTitle v={{ hi: "Aaj ka kaam", en: "Today's task" }} />
          <TodayCards nba={data.nba} />
        </div>
        <div>
          <SectionTitle v={{ hi: "Parivaar ki sehat", en: "Family health" }} />
          <HealthTiles d={data} />
        </div>
      </div>
      <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-6 lg:items-start">
        <div>
          <SectionTitle v={{ hi: "Agle 30 din", en: "Next 30 days" }} />
          <RiverCard />
        </div>
        <div>
          <SectionTitle v={{ hi: "Gullak", en: "Savings jars" }} />
          <JarsRow />
        </div>
      </div>
      {mode === "pro" && <div className="mt-6"><AffordCheck /></div>}
      <HelpLink />
    </div>
  );
}
