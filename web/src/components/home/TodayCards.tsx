"use client";
import { useState } from "react";
import { ArrowRight, Clock, Check } from "lucide-react";
import Scene from "@/components/art/Scene";
import { SpeakBtn } from "@/components/ui/bits";
import KyonSheet from "./KyonSheet";
import ActionSheet from "./ActionSheet";
import { useApp } from "@/lib/store";
import type { NBA } from "@/lib/types";
import { useRouter } from "next/navigation";
import { inr } from "@/lib/format";
import { LAST_KEY, type CoverSummary } from "@/components/gov/CoverCheck";

/** The old E06 card offered one product (PMJJBY ₹2 lakh) to every family. It now opens the family cover check. */
const isCoverCard = (n: NBA) => n.engine === "E06" || n.action.type === "protect";
function lastCover(): CoverSummary | null {
  try { const r = localStorage.getItem(LAST_KEY); const v = r ? (JSON.parse(r) as CoverSummary) : null; return v && typeof v.top_gap_paise === "number" ? v : null; } catch { return null; }
}

const DOT: Record<NBA["severity"], string> = { red: "bg-danger", amber: "bg-amber", green: "bg-leaf" };

/** Aaj ka kaam — one calm white card per need; swipe for the next two. */
export default function TodayCards({ nba }: { nba: NBA[] }) {
  const { t, lang, doneIds } = useApp();
  const router = useRouter();
  const [cover] = useState<CoverSummary | null>(() => lastCover());
  const [idx, setIdx] = useState(0);
  const [why, setWhy] = useState<NBA | null>(null);
  const [act, setAct] = useState<NBA | null>(null);
  const [later, setLater] = useState<string[]>([]);
  const cards = nba.filter((n) => !later.includes(n.id)).slice(0, 3);

  if (!nba.length) return (
    <div className="mx-5 lg:mx-0 rounded-[28px] bg-white p-5 shadow-soft">
      <p className="text-[21px] font-extrabold leading-snug">{t({ hi: "Aaj koi zaroori kaam nahi 🌿", en: "Nothing urgent today 🌿" })}</p>
      <p className="mt-2 text-[15px] text-ink/80">{t({ hi: "Agle 30 din mein paisa kam padta nahi dikh raha. Gullak mein thoda daalte rahein.", en: "No shortfall in the next 30 days. Keep adding a little to the Gullak." })}</p>
    </div>
  );

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar px-5 lg:px-0"
        onScroll={(e) => { const el = e.currentTarget; setIdx(Math.round(el.scrollLeft / (el.clientWidth * 0.9))); }}>
        {cards.map((n) => {
          const done = doneIds.includes(n.id);
          if (isCoverCard(n)) return (
            <article key={n.id} className="snap-center shrink-0 w-[90%] lg:w-full rounded-[28px] bg-white p-5 shadow-soft relative overflow-hidden">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${DOT[n.severity]}`} />
                <span className="text-[13px] font-bold text-muted">{t(n.tier_label)}</span>
                <span className="ml-auto rounded-full bg-mint text-leaf px-2 py-0.5 text-[10px] font-extrabold">₹0 COMMISSION</span>
                <SpeakBtn v={cover && cover.gaps > 0 && cover.top ? { hi: `Bima mein ${cover.gaps} kami. Pehle ${cover.top.hi}: ${inr(Math.round(cover.top_gap_paise / 100))}`, en: `${cover.gaps} cover gaps. First, ${cover.top.en}: ${inr(Math.round(cover.top_gap_paise / 100))}` } : { hi: "Parivaar ko kitna bima chahiye? Check karein", en: "How much cover does your family need? Check it" }} />
              </div>
              <div className="mt-2 flex items-start gap-3">
                <h3 className="flex-1 text-[21px] font-extrabold leading-snug text-ink">
                  {cover && cover.gaps > 0 && cover.top
                    ? t({ hi: `Bima mein ${cover.gaps} kami — pehle ${cover.top.hi}: ${inr(Math.round(cover.top_gap_paise / 100))}`, en: `${cover.gaps} cover gaps — first ${cover.top.en}: ${inr(Math.round(cover.top_gap_paise / 100))}` })
                    : t({ hi: "Parivaar ko kitna bima chahiye? Check karein", en: "How much cover does your family need? Check it" })}
                </h3>
                <Scene kind="shield" size={60} />
              </div>
              <p className="mt-2 text-[15px] leading-snug text-ink/80">
                {cover && cover.gaps > 0
                  ? t({ hi: "Sarkari yojana pehle, phir aapke parivaar ke hisaab se spec — kisi company ke bina. Bima Sugam ya kisi bhi insurer ke paas le jaayein.", en: "Government schemes first, then a spec sized to your family — no insurer involved. Take it to Bima Sugam or any insurer." })
                  : t({ hi: "Umar, aamdani aur nirbhar logon se ginti: kitna chahiye, kitna hai, kitna kam — aur Bima Sugam ke liye spec.", en: "From ages, income and dependants: what you need, what you have, the gap — and a spec for Bima Sugam." })}
              </p>
              <p className="mt-2 flex items-start gap-1.5 text-[13px] text-muted"><Clock size={14} className="mt-0.5 shrink-0" />{t(n.if_not)}</p>
              <div className="mt-4 flex items-center gap-2">
                <button onClick={() => setWhy(n)} className="min-h-12 rounded-[16px] bg-lav px-5 font-bold text-ink">Kyon?</button>
                <button onClick={() => router.push("/app/goals#cover")} className="flex-1 min-h-12 rounded-[16px] bg-ink text-white font-bold flex items-center justify-center gap-2">
                  {lang === "hi" ? "Bima check kholein" : "Open cover check"} <ArrowRight size={18} />
                </button>
              </div>
            </article>
          );
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
