"use client";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { useApp } from "@/lib/store";
import { gov } from "@/lib/gov";
import { withDefaults, type Answer, type OnboardingAnswers } from "@/lib/onboarding/answers";
import { FREQUENCY_LABEL, GOAL_LABEL as GOAL, OWN_INCOME_LABEL, WORK_LABEL as WORK } from "@/lib/onboarding/labels";
import { day, inr } from "@/lib/format";
import type { L } from "@/lib/types";

/** The onboarding answers as saved, with skipped ones shown as skipped. */
export default function MyAnswers({ onEdit }: { onEdit: () => void }) {
  const { t, lang } = useApp();
  const [a, setA] = useState<OnboardingAnswers | null>(null);
  const [where, setWhere] = useState<"server" | "device">("device");
  useEffect(() => {
    gov.onboarding().then((r) => {
      if (r.consent && r.answers) { setA(withDefaults(r.answers)); setWhere("server"); return; }
      try { const raw = localStorage.getItem("dy.onboarding"); setA(raw ? withDefaults(JSON.parse(raw)) : null); } catch { setA(null); }
    }).catch(() => {});
  }, []);
  const show = <T,>(x: Answer<T>, fmt: (v: T) => string) =>
    x.state === "answered" ? <span className="font-bold">{fmt(x.value)}</span>
      : x.state === "dont_know" ? <span className="text-amber font-bold">{lang === "hi" ? "Pata nahi" : "Not sure"}</span>
      : x.state === "none" ? <span className="font-bold">{lang === "hi" ? "Koi nahi" : "None"}</span>
      : <span className="text-muted italic">{lang === "hi" ? "Jawaab nahi diya" : "Not answered"}</span>;
  if (!a) return <p className="text-sm text-muted">{t({ hi: "Abhi koi jawaab nahi.", en: "No answers yet." })}</p>;
  // Work and loans are no longer asked (the bank data shows income and EMIs); shown only if answered earlier.
  const asked = (x: Answer<unknown>) => x.state !== "unanswered";
  const rows: [L, React.ReactNode][] = [
    [{ hi: "Ghar mein log", en: "People at home" }, show(a.members, String)],
    [{ hi: "Kamaane wale", en: "Earners" }, show(a.earners, String)],
    [{ hi: "Bachche", en: "Children" }, show(a.dependents.children, String)],
    [{ hi: "School mein", en: "In school" }, show(a.dependents.children_in_school, String)],
    [{ hi: "Buzurg (60+)", en: "Elders (60+)" }, show(a.dependents.elders, String)],
    [{ hi: "Aur nirbhar", en: "Other dependents" }, show(a.dependents.other, String)],
    ...(asked(a.work) ? [[{ hi: "Kaam", en: "Work" }, show(a.work, (v) => t(WORK[v]))] as [L, React.ReactNode]] : []),
    [{ hi: "Apni aamdani", en: "Own income" }, show(a.own_income, (v) => t(OWN_INCOME_LABEL[v]))],
    ...(asked(a.loans) ? [[{ hi: "Loan", en: "Loans" }, show(a.loans, (v) => (v ? (lang === "hi" ? "Haan" : "Yes") : (lang === "hi" ? "Nahi" : "No")))] as [L, React.ReactNode]] : []),
    [{ hi: "Lakshya", en: "Goal" }, show(a.goal, (v) => t(GOAL[v]))],
    [{ hi: "Ghar ka cash", en: "Cash in hand" }, show(a.money.cash, inr)],
    [{ hi: "Aamdani", en: "Income" }, show(a.money.income_amount, (v) => `${inr(v)}${a.money.income_frequency.state === "answered" ? ` · ${t(FREQUENCY_LABEL[a.money.income_frequency.value])}` : ""}`)],
    [{ hi: "Agli aamdani", en: "Next income" }, show(a.money.next_pay, day)],
    [{ hi: "Cash wala bill", en: "Bill paid in cash" }, a.money.bill_name.state === "none" ? show(a.money.bill_name, String) : show(a.money.bill_amount, (v) => `${a.money.bill_name.state === "answered" ? a.money.bill_name.value + " · " : ""}${inr(v)}${a.money.bill_due.state === "answered" ? ` · ${day(a.money.bill_due.value)}` : ""}`)],
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
