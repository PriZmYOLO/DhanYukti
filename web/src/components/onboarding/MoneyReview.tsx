"use client";
import { Info, Pencil, ShieldCheck } from "lucide-react";
import { Btn, SpeakBtn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { day, inr } from "@/lib/format";
import {
  FREQUENCIES, answered, moneyUnanswered, unansweredCount,
  type Answer, type IncomeFrequency, type MoneyAnswers, type OnboardingAnswers,
} from "@/lib/onboarding/answers";
import { FREQUENCY_LABEL, GOAL_LABEL, OWN_INCOME_LABEL, WHY, WORK_LABEL } from "@/lib/onboarding/labels";
import type { L } from "@/lib/types";

/** One "Why we ask" line under a question. */
export function Why({ v }: { v: L }) {
  const { t, lang } = useApp();
  return (
    <p className="mt-1.5 flex items-start gap-1.5 px-1 text-[12px] text-muted leading-snug">
      <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
      <span><b>{lang === "hi" ? "Kyon poochhte hain:" : "Why we ask:"}</b> {t(v)}</span>
    </p>
  );
}

function Heading({ v, sub }: { v: L; sub: L }) {
  const { t } = useApp();
  return (
    <div className="mt-6 flex items-start gap-3">
      <div className="flex-1"><h1 className="text-[30px] font-extrabold leading-tight tracking-tight">{t(v)}</h1><p className="text-muted mt-1">{t(sub)}</p></div>
      <SpeakBtn v={{ hi: `${v.hi}. ${sub.hi}`, en: `${v.en}. ${sub.en}` }} />
    </div>
  );
}

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

/** Whole rupees typed as text: empty = not answered. */
function RupeeField({ label, a, set, none }: { label: L; a: Answer<number>; set: (v: Answer<number>) => void; none?: boolean }) {
  const { t, lang } = useApp();
  const dk = a.state === "dont_know";
  return (
    <div>
      <label className="block">
        <span className="block text-[13px] font-bold mb-1">{t(label)}</span>
        <span className={`flex items-center gap-2 rounded-[18px] bg-white px-3 shadow-soft ${none ? "opacity-40" : ""}`}>
          <span className="font-bold">₹</span>
          <input inputMode="numeric" disabled={none} value={a.state === "answered" ? String(a.value) : ""}
            onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 9); set(d ? answered(Number(d)) : { state: "unanswered" }); }}
            placeholder={dk ? (lang === "hi" ? "Pata nahi" : "Not sure") : "0"} className="flex-1 min-w-0 min-h-12 bg-transparent text-lg font-bold num outline-none" />
        </span>
      </label>
      {!none && (
        <button onClick={() => set(dk ? { state: "unanswered" } : { state: "dont_know" })} className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${dk ? "bg-ink text-white" : "bg-lav text-muted"}`}>
          {dk ? "✓ " : ""}{lang === "hi" ? "Pata nahi" : "Not sure"}
        </button>
      )}
    </div>
  );
}

function DateField({ label, a, set, disabled }: { label: L; a: Answer<string>; set: (v: Answer<string>) => void; disabled?: boolean }) {
  const { t } = useApp();
  return (
    <label className={`block ${disabled ? "opacity-40" : ""}`}>
      <span className="block text-[13px] font-bold mb-1">{t(label)}</span>
      <input type="date" min={today()} disabled={disabled} value={a.state === "answered" ? a.value : ""}
        onChange={(e) => set(e.target.value ? answered(e.target.value) : { state: "unanswered" })}
        className="w-full min-h-12 rounded-[18px] bg-white px-3 shadow-soft font-bold num outline-none" />
    </label>
  );
}

/** Money you tell us: cash at home, your usual income, one important bill. Declared, never bank data. */
export function MoneyStep({ ans, setAns, onNext }: { ans: OnboardingAnswers; setAns: (a: OnboardingAnswers) => void; onNext: () => void }) {
  const { t, lang } = useApp();
  const m = ans.money;
  const set = (patch: Partial<MoneyAnswers>) => setAns({ ...ans, money: { ...m, ...patch } });
  const noIncome = m.income_amount.state === "none";
  const noBill = m.bill_name.state === "none";
  const left = moneyUnanswered(m);
  return (<>
    <Heading v={{ hi: "Paise ki kuch baatein", en: "A few money details" }} sub={{ hi: "Aap jo batayein — bank data ki jagah nahi, sirf kami bharne ke liye", en: "What you tell us — never instead of bank data, only to fill gaps" }} />

    <section className="mt-5 rounded-[24px] bg-white/70 p-4 space-y-2">
      <p className="font-extrabold">{t({ hi: "1. Ghar mein cash", en: "1. Cash at home" })}</p>
      <RupeeField label={{ hi: "Aaj ghar mein kitna cash hai? (bank ke bahar)", en: "Cash at home today (outside the bank)" }} a={m.cash} set={(v) => set({ cash: v })} />
      <Why v={WHY.cash} />
    </section>

    <section className="mt-3 rounded-[24px] bg-white/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-extrabold">{t({ hi: "2. Aamdani", en: "2. Money coming in" })}</p>
        <button aria-pressed={noIncome} onClick={() => set(noIncome
          ? { income_amount: { state: "unanswered" }, income_frequency: { state: "unanswered" }, next_pay: { state: "unanswered" } }
          : { income_amount: { state: "none" }, income_frequency: { state: "none" }, next_pay: { state: "none" } })}
          className={`rounded-full px-3 min-h-9 text-[12px] font-bold ${noIncome ? "bg-ink text-white" : "bg-lav"}`}>
          {noIncome ? "✓ " : ""}{lang === "hi" ? "Koi tay aamdani nahi" : "No regular income"}
        </button>
      </div>
      <RupeeField none={noIncome} label={{ hi: "Har baar kitna milta hai?", en: "How much each time?" }} a={m.income_amount} set={(v) => set({ income_amount: v })} />
      <fieldset disabled={noIncome} className={noIncome ? "opacity-40" : ""}>
        <legend className="text-[13px] font-bold mb-1">{t({ hi: "Kitni baar?", en: "How often?" })}</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {FREQUENCIES.map((f) => {
            const on = m.income_frequency.state === "answered" && m.income_frequency.value === f;
            return <button key={f} aria-pressed={on} onClick={() => set({ income_frequency: on ? { state: "unanswered" } : answered<IncomeFrequency>(f) })} className={`min-h-11 rounded-[14px] text-[12px] font-bold ${on ? "bg-ink text-white" : "bg-white"}`}>{t(FREQUENCY_LABEL[f])}</button>;
          })}
        </div>
      </fieldset>
      <DateField disabled={noIncome} label={{ hi: "Agli baar kab milega?", en: "When do you get it next?" }} a={m.next_pay} set={(v) => set({ next_pay: v })} />
      <Why v={WHY.income} />
    </section>

    <section className="mt-3 rounded-[24px] bg-white/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-extrabold">{t({ hi: "3. Ek zaroori bill", en: "3. One important bill" })}</p>
        <button aria-pressed={noBill} onClick={() => set(noBill
          ? { bill_name: { state: "unanswered" }, bill_amount: { state: "unanswered" }, bill_due: { state: "unanswered" } }
          : { bill_name: { state: "none" }, bill_amount: { state: "none" }, bill_due: { state: "none" } })}
          className={`rounded-full px-3 min-h-9 text-[12px] font-bold ${noBill ? "bg-ink text-white" : "bg-lav"}`}>
          {noBill ? "✓ " : ""}{lang === "hi" ? "Koi bill nahi" : "No bill to add"}
        </button>
      </div>
      <label className={`block ${noBill ? "opacity-40" : ""}`}>
        <span className="block text-[13px] font-bold mb-1">{t({ hi: "Kis cheez ka bill? (jaise school fee, bijli, kiraya)", en: "What is it for? (e.g. school fee, electricity, rent)" })}</span>
        <input disabled={noBill} maxLength={40} value={m.bill_name.state === "answered" ? m.bill_name.value : ""}
          onChange={(e) => set({ bill_name: e.target.value.trim() ? answered(e.target.value) : { state: "unanswered" } })}
          className="w-full min-h-12 rounded-[18px] bg-white px-3 shadow-soft font-bold outline-none" />
      </label>
      <RupeeField none={noBill} label={{ hi: "Kitna dena hai?", en: "How much?" }} a={m.bill_amount} set={(v) => set({ bill_amount: v })} />
      <DateField disabled={noBill} label={{ hi: "Aakhri tareekh", en: "Due date" }} a={m.bill_due} set={(v) => set({ bill_due: v })} />
      <Why v={WHY.bill} />
    </section>

    <p className="mt-4 rounded-[18px] bg-lav/70 p-3 text-[12px] leading-snug">
      {left > 0
        ? t({ hi: `${left} chhode — koi baat nahi, "jawaab nahi diya" maana jaayega, zero nahi.`, en: `${left} left blank — fine, saved as "not answered", never as zero.` })
        : t({ hi: "Shukriya! Yeh sab 'aapne bataya' ke roop mein dikhega.", en: "Thank you! These show as “you told us”." })}
    </p>
    <div className="flex-1" />
    <Btn variant="ink" className="w-full mt-5" onClick={onNext}>{lang === "hi" ? "Aage" : "Next"}</Btn>
    <button onClick={onNext} className="mt-2 w-full min-h-11 text-sm font-bold text-muted">{lang === "hi" ? "Abhi chhodein" : "Skip for now"}</button>
  </>);
}

/** Everything the member told us, before they connect the bank. */
export function ReviewStep({ ans, saved, profileOn, onChange, onNext }: {
  ans: OnboardingAnswers; saved: "device" | "server" | "error"; profileOn: boolean;
  onChange: (to: "family" | "money") => void; onNext: () => void;
}) {
  const { t, lang } = useApp();
  const m = ans.money;
  const show = <T,>(x: Answer<T>, fmt: (v: T) => string) =>
    x.state === "answered" ? <span className="font-bold text-right">{fmt(x.value)}</span>
      : x.state === "dont_know" ? <span className="font-bold text-amber">{lang === "hi" ? "Pata nahi" : "Not sure"}</span>
      : x.state === "none" ? <span className="font-bold">{lang === "hi" ? "Koi nahi" : "None"}</span>
      : <span className="italic text-muted">{lang === "hi" ? "Jawaab nahi diya" : "Not answered"}</span>;
  const count = (x: Answer<number>) => show(x, String);
  const family: [L, React.ReactNode][] = [
    [{ hi: "Ghar mein log", en: "People at home" }, count(ans.members)],
    [{ hi: "Kamaane wale", en: "Earners" }, count(ans.earners)],
    [{ hi: "Bachche (school mein)", en: "Children (in school)" }, <span key="c" className="flex gap-1">{count(ans.dependents.children)}<span className="text-muted">(</span>{count(ans.dependents.children_in_school)}<span className="text-muted">)</span></span>],
    [{ hi: "Buzurg / aur nirbhar", en: "Elders / other dependents" }, <span key="e" className="flex gap-1">{count(ans.dependents.elders)}<span className="text-muted">/</span>{count(ans.dependents.other)}</span>],
    [{ hi: "Kaam", en: "Work" }, show(ans.work, (v) => t(WORK_LABEL[v]))],
    [{ hi: "Apni aamdani", en: "Own income" }, show(ans.own_income, (v) => t(OWN_INCOME_LABEL[v]))],
    [{ hi: "Loan", en: "Loans" }, show(ans.loans, (v) => (v ? (lang === "hi" ? "Haan" : "Yes") : (lang === "hi" ? "Nahi" : "No")))],
    [{ hi: "Lakshya", en: "Goal" }, show(ans.goal, (v) => t(GOAL_LABEL[v]))],
  ];
  const money: [L, React.ReactNode][] = [
    [{ hi: "Ghar ka cash", en: "Cash at home" }, show(m.cash, inr)],
    [{ hi: "Aamdani", en: "Income" }, m.income_amount.state === "none" ? show(m.income_amount, String) : show(m.income_amount, (v) => `${inr(v)}${m.income_frequency.state === "answered" ? ` · ${t(FREQUENCY_LABEL[m.income_frequency.value])}` : ""}`)],
    [{ hi: "Agli aamdani", en: "Next income" }, show(m.next_pay, day)],
    [{ hi: "Zaroori bill", en: "Important bill" }, m.bill_name.state === "none" ? show(m.bill_name, String) : show(m.bill_amount, (v) => `${m.bill_name.state === "answered" ? `${m.bill_name.value} · ` : ""}${inr(v)}${m.bill_due.state === "answered" ? ` · ${day(m.bill_due.value)}` : ""}`)],
  ];
  const block = (title: L, rows: [L, React.ReactNode][], to: "family" | "money") => (
    <section className="mt-4 rounded-[24px] bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="font-extrabold">{t(title)}</p>
        <button onClick={() => onChange(to)} className="inline-flex items-center gap-1 rounded-full bg-lav px-3 min-h-9 text-xs font-bold"><Pencil size={12} />{lang === "hi" ? "Badlein" : "Change"}</button>
      </div>
      <div className="mt-2 divide-y divide-lav">
        {rows.map(([l, v], i) => <div key={i} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="text-muted">{t(l)}</span>{v}</div>)}
      </div>
    </section>
  );
  const blanks = unansweredCount(ans) + moneyUnanswered(m);
  return (<>
    <Heading v={{ hi: "Ek baar dekh lijiye", en: "Check your answers" }} sub={{ hi: "Bank jodne se pehle — kuch bhi badal sakte hain", en: "Before you connect your bank — change anything you like" }} />
    {block({ hi: "Parivaar aur kaam", en: "Family and work" }, family, "family")}
    {block({ hi: "Paise ki baatein (aapne bataya)", en: "Money details (you told us)" }, money, "money")}
    <div className="mt-4 rounded-[20px] bg-mint/70 p-3 flex items-start gap-2 text-[13px] leading-snug">
      <ShieldCheck size={18} className="text-leaf shrink-0 mt-0.5" />
      <span>{t({
        hi: "Aapke bank data ke saath yeh sirf kami bharte hain — hamesha 'aapne bataya (andaaza)' likha hota hai, bank data ko kabhi nahi badalte.",
        en: "Alongside your bank data these only fill gaps — always marked “you told us (estimate)”, never replacing what your bank shows.",
      })}{" "}{profileOn || saved === "server"
        ? t({ hi: "Profile consent ke saath save.", en: "Saved under your profile consent." })
        : t({ hi: "Hisaab mein lagane ke liye agle page par 'Parivaar mein aapka profile' chalu karein; tab tak sirf is phone par.", en: "To use them in your picture, turn on “Your profile in the household” on the next page; until then they stay on this phone." })}</span>
    </div>
    {blanks > 0 && <p className="mt-2 px-1 text-[12px] text-muted">{t({ hi: `${blanks} jawaab nahi diye — "jawaab nahi diya" maane jaayenge, zero nahi.`, en: `${blanks} not answered — kept as "not answered", never zero.` })}</p>}
    <div className="flex-1" />
    <Btn variant="ink" className="w-full mt-5" onClick={onNext}>{lang === "hi" ? "Sahi hai — aage" : "Looks right — next"}</Btn>
  </>);
}
