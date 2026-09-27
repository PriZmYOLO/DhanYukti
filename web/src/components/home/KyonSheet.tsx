"use client";
import { Eye, Brain, Gauge, BookOpen } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { Bi, ConfTag, SpeakBtn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { day, inrSigned } from "@/lib/format";
import type { NBA } from "@/lib/types";

export default function KyonSheet({ nba, open, onClose }: { nba: NBA | null; open: boolean; onClose: () => void }) {
  const { t, lang } = useApp();
  if (!nba) return null;
  const w = nba.why;
  const speech = { hi: `${nba.title.hi}. ${w.rule.hi}`, en: `${nba.title.en}. ${w.rule.en}` };
  return (
    <Sheet open={open} onClose={onClose} title={<div className="flex items-center gap-3"><span className="text-2xl font-extrabold">Kyon?</span><span className="text-muted text-sm">{lang === "hi" ? "Humne yeh kyon kaha" : "Why we said this"}</span></div>}>
      <div className="space-y-3">
        <div className="rounded-[24px] bg-white p-4">
          <div className="flex items-center gap-2 mb-2"><span className="grid place-items-center h-8 w-8 rounded-full bg-lav"><Eye size={16} /></span>
            <Bi v={{ hi: "Kya dekha", en: "What we saw" }} className="font-bold" /></div>
          <div className="divide-y divide-lav">
            {w.saw.map((x, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <span className="text-xs text-muted w-12 shrink-0">{day(x.date)}</span>
                <span className="flex-1 text-sm truncate">{x.narration}</span>
                <span className={`text-sm font-bold num ${x.amount > 0 ? "text-leaf" : ""}`}>{inrSigned(x.amount)}</span>
                <span className="text-[11px] font-bold uppercase rounded bg-lav px-1.5 py-0.5">{x.source === "aa" ? "AA" : x.source}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] bg-haldi-soft p-4">
          <div className="flex items-center gap-2 mb-1"><span className="grid place-items-center h-8 w-8 rounded-full bg-haldi"><Brain size={16} /></span>
            <Bi v={{ hi: "Kya socha", en: "The rule" }} className="font-bold" /></div>
          <div className="flex items-start gap-3">
            <p className="flex-1 text-[17px] font-semibold leading-snug">{t(w.rule)}</p>
            <SpeakBtn v={speech} size={40} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[24px] bg-white p-4">
            <div className="flex items-center gap-2 mb-2"><Gauge size={16} /><span className="font-bold text-sm">{lang === "hi" ? "Kitna pakka" : "How sure"}</span></div>
            <ConfTag c={w.confidence} />
          </div>
          <div className="rounded-[24px] bg-mint/60 p-4">
            <div className="flex items-center gap-2 mb-2"><BookOpen size={16} /><span className="font-bold text-sm">{w.tag === "referral" ? "Referral" : "Jaankari"}</span></div>
            <p className="text-xs leading-snug">{w.tag === "referral"
              ? t({ hi: "Registered salahkaar ke paas bhejenge", en: "We route you to a registered adviser" })
              : t({ hi: "Yeh salah nahi, jaankari hai", en: "This is guidance, not advice" })}</p>
          </div>
        </div>
        <p className="text-[11px] text-muted text-center">{nba.engine} · {lang === "hi" ? "Niyam ginte hain, AI sirf samjhata hai" : "Rules calculate, AI only explains"}</p>
      </div>
    </Sheet>
  );
}
