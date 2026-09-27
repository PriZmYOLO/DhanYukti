"use client";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { useApp } from "@/lib/store";
import { gov } from "@/lib/gov";
import { EMPTY_ANSWERS, type Answer, type GoalIntent, type OnboardingAnswers, type WorkKind } from "@/lib/onboarding/answers";
import type { L } from "@/lib/types";

const WORK: Record<WorkKind, L> = { naukri: { hi: "Naukri", en: "Job" }, dukaan: { hi: "Dukaan", en: "Shop" }, gig: { hi: "Gig", en: "Gig" }, mazdoori: { hi: "Mazdoori", en: "Daily wage" }, other: { hi: "Aur", en: "Other" } };
const GOAL: Record<GoalIntent, L> = {
  education: { hi: "Bachchon ki padhai", en: "Children's education" }, emergency_cushion: { hi: "Mushkil waqt ki bachat", en: "Emergency cushion" },
  repay_debt: { hi: "Karz utaarna", en: "Pay off loans" }, big_purchase: { hi: "Badi kharidari", en: "Big purchase" },
  festival_wedding: { hi: "Tyohaar / shaadi", en: "Festival / wedding" }, other: { hi: "Kuch aur", en: "Something else" },
};

/** The onboarding answers as saved, with skipped ones shown as skipped. */
export default function MyAnswers({ onEdit }: { onEdit: () => void }) {
  const { t, lang } = useApp();
  const [a, setA] = useState<OnboardingAnswers | null>(null);
  const [where, setWhere] = useState<"server" | "device">("device");
  useEffect(() => {
    gov.onboarding().then((r) => {
      if (r.consent && r.answers) { setA(r.answers); setWhere("server"); return; }
      try { const raw = localStorage.getItem("dy.onboarding"); setA(raw ? { ...EMPTY_ANSWERS, ...JSON.parse(raw) } : null); } catch { setA(null); }
    }).catch(() => {});
  }, []);
  const show = <T,>(x: Answer<T>, fmt: (v: T) => string) =>
    x.state === "answered" ? <span className="font-bold">{fmt(x.value)}</span>
      : x.state === "dont_know" ? <span className="text-amber font-bold">{lang === "hi" ? "Pata nahi" : "Not sure"}</span>
      : x.state === "none" ? <span className="font-bold">{lang === "hi" ? "Koi nahi" : "None"}</span>
      : <span className="text-muted italic">{lang === "hi" ? "Jawaab nahi diya" : "Not answered"}</span>;
  if (!a) return <p className="text-sm text-muted">{t({ hi: "Abhi koi jawaab nahi.", en: "No answers yet." })}</p>;
  const rows: [L, React.ReactNode][] = [
    [{ hi: "Ghar mein log", en: "People at home" }, show(a.members, String)],
    [{ hi: "Kamaane wale", en: "Earners" }, show(a.earners, String)],
    [{ hi: "Bachche", en: "Children" }, show(a.dependents.children, String)],
    [{ hi: "School mein", en: "In school" }, show(a.dependents.children_in_school, String)],
    [{ hi: "Buzurg (60+)", en: "Elders (60+)" }, show(a.dependents.elders, String)],
    [{ hi: "Aur nirbhar", en: "Other dependents" }, show(a.dependents.other, String)],
    [{ hi: "Kaam", en: "Work" }, show(a.work, (v) => t(WORK[v]))],
    [{ hi: "Loan", en: "Loans" }, show(a.loans, (v) => (v ? (lang === "hi" ? "Haan" : "Yes") : (lang === "hi" ? "Nahi" : "No")))],
    [{ hi: "Lakshya", en: "Goal" }, show(a.goal, (v) => t(GOAL[v]))],
  ];
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-soft">
      <div className="divide-y divide-lav">
        {rows.map(([l, v], i) => <div key={i} className="flex items-center justify-between py-2 text-sm"><span className="text-muted">{t(l)}</span>{v}</div>)}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <p className="flex-1 text-[11px] text-muted">{where === "server" ? t({ hi: "DPDP consent ke saath save · band karte hi mitega", en: "Saved under DPDP consent · deleted when you withdraw" }) : t({ hi: "Sirf is phone par (profile consent band)", en: "Only on this phone (profile consent off)" })}</p>
        <button onClick={onEdit} className="inline-flex items-center gap-1 rounded-full bg-lav px-3 min-h-9 text-xs font-bold"><Pencil size={12} />{lang === "hi" ? "Badlein" : "Edit"}</button>
      </div>
    </div>
  );
}
