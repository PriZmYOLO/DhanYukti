"use client";
import { useState } from "react";
import { ArrowRight, Clock, Check } from "lucide-react";
import Scene from "@/components/art/Scene";
import { SpeakBtn } from "@/components/ui/bits";
import KyonSheet from "./KyonSheet";
import ActionSheet from "./ActionSheet";
import { useApp } from "@/lib/store";
import type { NBA } from "@/lib/types";

const DOT: Record<NBA["severity"], string> = { red: "bg-danger", amber: "bg-amber", green: "bg-leaf" };

/** Aaj ka kaam — one calm white card per need; swipe for the next two. */
export default function TodayCards({ nba }: { nba: NBA[] }) {
  const { t, lang, doneIds } = useApp();
  const [idx, setIdx] = useState(0);
  const [why, setWhy] = useState<NBA | null>(null);
  const [act, setAct] = useState<NBA | null>(null);
  const [later, setLater] = useState<string[]>([]);
  const cards = nba.filter((n) => !later.includes(n.id)).slice(0, 3);

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar px-5 lg:px-0"
        onScroll={(e) => { const el = e.currentTarget; setIdx(Math.round(el.scrollLeft / (el.clientWidth * 0.9))); }}>
        {cards.map((n) => {
          const done = doneIds.includes(n.id);
          return (
            <article key={n.id} className="snap-center shrink-0 w-[90%] lg:w-full rounded-[28px] bg-white p-5 shadow-soft relative overflow-hidden">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${DOT[n.severity]}`} />
                <span className="text-[13px] font-bold text-muted">{t(n.tier_label)}</span>
                <span className="ml-auto"><SpeakBtn v={{ hi: `${n.title.hi}. ${n.task.hi}`, en: `${n.title.en}. ${n.task.en}` }} /></span>
              </div>

              <div className="mt-2 flex items-start gap-3">
                <h3 className="flex-1 text-[21px] font-extrabold leading-snug text-ink">{t(n.title)}</h3>
                <Scene kind={n.icon} size={60} />
              </div>

              <p className="mt-2 text-[15px] leading-snug text-ink/80">{t(n.task)}</p>
              <p className="mt-2 flex items-start gap-1.5 text-[13px] text-muted">
                <Clock size={14} className="mt-0.5 shrink-0" />{t(n.if_not)}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <button onClick={() => setWhy(n)} className="min-h-12 rounded-[16px] bg-lav px-5 font-bold text-ink">Kyon?</button>
                <button onClick={() => setAct(n)} className="flex-1 min-h-12 rounded-[16px] bg-ink text-white font-bold flex items-center justify-center gap-2">
                  {t(n.action.label)} <ArrowRight size={18} />
                </button>
                <button onClick={() => setLater([...later, n.id])} className="min-h-12 px-2 text-sm font-semibold text-muted">{lang === "hi" ? "Baad mein" : "Later"}</button>
              </div>

              {done && (
                <div className="absolute inset-0 grid place-items-center bg-white/95 text-center p-6">
                  <div>
                    <span className="mx-auto grid place-items-center h-14 w-14 rounded-full bg-leaf text-white"><Check size={28} /></span>
                    <p className="mt-3 text-xl font-extrabold">{lang === "hi" ? "Ho gaya!" : "Done!"}</p>
                    <p className="text-sm text-muted">+{n.points} Paisa Points</p>
                    {n.second_step && <p className="mt-3 text-sm text-ink/80">{t(n.second_step)}</p>}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {cards.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {cards.map((c, i) => <span key={c.id} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-ink" : "w-1.5 bg-ink/25"}`} />)}
        </div>
      )}
      <KyonSheet nba={why} open={!!why} onClose={() => setWhy(null)} />
      <ActionSheet action={act?.action ?? null} nba={act} open={!!act} onClose={() => setAct(null)} />
    </div>
  );
}
