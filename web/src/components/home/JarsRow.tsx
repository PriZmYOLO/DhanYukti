"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import Gullak from "@/components/art/Gullak";
import ActionSheet from "./ActionSheet";
import { useApp } from "@/lib/store";
import { inr } from "@/lib/format";
import type { Jar } from "@/lib/types";

const monthYear = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
};

const TONE: Record<Jar["kind"], "clay" | "haldi" | "rose"> = { emergency: "clay", school: "haldi", festival: "rose", education: "haldi" };

export default function JarsRow({ big }: { big?: boolean }) {
  const { data, t, speak, lang } = useApp();
  const [jar, setJar] = useState<Jar | null>(null);
  if (!data) return null;
  return (
    <>
      <div className={big ? "grid grid-cols-2 lg:grid-cols-3 gap-3 px-5 lg:px-0" : "flex gap-3 overflow-x-auto no-scrollbar px-5 lg:px-0 pb-1"}>
        {data.jars.map((j) => {
          const pct = Math.round((j.saved / j.goal) * 100);
          return (
            <div key={j.id} className={`${big ? "" : "shrink-0 w-[150px]"} rounded-[28px] bg-clay-soft p-4 relative`}>
              <button onClick={() => speak({ hi: `${j.name.hi} mein ${inr(j.saved)} hain, lakshya ${inr(j.goal)}`, en: `${j.name.en} has ${inr(j.saved)} of ${inr(j.goal)}` })} className="mx-auto block">
                <Gullak fill={j.saved / j.goal} size={big ? 100 : 84} tone={TONE[j.kind]} />
              </button>
              <p className="font-extrabold text-[15px] mt-1 leading-tight">{t(j.name)}</p>
              <p className="text-xs text-muted num">{inr(j.saved)} / {inr(j.goal)}</p>
              {big && j.remaining != null && j.target_date && (
                <p className="text-[11px] font-bold mt-0.5 leading-snug num">
                  {j.remaining > 0
                    ? lang === "hi" ? `${inr(j.remaining)} aur, ${monthYear(j.target_date)} tak · ${inr(j.daily_suggest)}/din` : `${inr(j.remaining)} to go by ${monthYear(j.target_date)} · ${inr(j.daily_suggest)}/day`
                    : lang === "hi" ? "Lakshya poora" : "Goal reached"}
                </p>
              )}
              <div className="mt-2 h-2 rounded-full bg-white overflow-hidden"><div className="h-full rounded-full bg-clay" style={{ width: `${pct}%` }} /></div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-extrabold num">{pct}%</span>
                <button onClick={() => setJar(j)} aria-label={lang === "hi" ? "Paisa daalo" : "Add money"} className="grid place-items-center h-10 w-10 rounded-full bg-ink text-white"><Plus size={18} /></button>
              </div>
            </div>
          );
        })}
      </div>
      <ActionSheet open={!!jar} onClose={() => setJar(null)}
        action={jar ? { type: "gullak", label: { hi: "Gullak mein daalo", en: "Put in Gullak" }, payload: { jar_id: jar.id, amount: jar.daily_suggest } } : null} />
    </>
  );
}
