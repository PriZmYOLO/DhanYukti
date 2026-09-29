"use client";
import { Info, Lock, Minus, Plus, ShieldCheck } from "lucide-react";
import { Btn, SpeakBtn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import {
  FREQUENCIES, GOALS, OWN_INCOME, answered,
  type Answer, type GoalIntent, type IncomeFrequency, type MoneyAnswers, type OnboardingAnswers, type OwnIncome,
} from "@/lib/onboarding/answers";
import { FREQUENCY_LABEL, GOAL_LABEL, OWN_INCOME_LABEL, WHY } from "@/lib/onboarding/labels";
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

/** A count that can be skipped or "don't know" — never silently zero. */
export function CountRow({ e, l, a, set }: { e: string; l: L; a: Answer<number>; set: (v: Answer<number>) => void }) {
  const { t, lang } = useApp();
  const n = a.state === "answered" ? a.value : null;
  const dk = a.state === "dont_know";
  return (
    <div className="flex items-center gap-2 rounded-[22px] bg-white p-2.5 pl-3 shadow-soft">
      <span className="text-2xl" aria-hidden>{e}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-[14px] leading-tight">{t(l)}</span>
        <button onClick={() => set(dk ? { state: "unanswered" } : { state: "dont_know" })} className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${dk ? "bg-ink text-white" : "bg-lav text-muted"}`}>{dk ? "✓ " : ""}{lang === "hi" ? "Pata nahi" : "Not sure"}</button>
      </span>
      <button aria-label={`${t(l)} −`} onClick={() => set(n === null ? answered(0) : n === 0 ? { state: "unanswered" } : answered(n - 1))} className="grid place-items-center h-10 w-10 rounded-full bg-lav shrink-0"><Minus size={16} /></button>
      <span className={`w-6 text-center font-extrabold num ${n === null ? "text-muted text-lg" : "text-2xl"}`}>{n ?? (dk ? "?" : "–")}</span>
      <button aria-label={`${t(l)} +`} onClick={() => set(answered((n ?? 0) + 1))} className="grid place-items-center h-10 w-10 rounded-full bg-ink text-white shrink-0"><Plus size={16} /></button>
    </div>
  );
}

const GOAL_EMOJI: Record<GoalIntent, string> = { education: "🎓", emergency_cushion: "🛟", repay_debt: "🧾", big_purchase: "🏍️", festival_wedding: "🪔", other: "✨" };

const isOpen = (a: Answer<unknown>) => a.state === "unanswered";

/**
 * After the reveal: only what the member's bank data can't tell us. The
 * bank already gave income, bills, EMIs and balance, so those aren't asked
 * again. Family, cash at home, a bill paid outside this account and the
 * member's goal are; income only when the bank shows none. Every answer is
 * optional and "skipped" is never zero. They shape the member's picture only
 * with DPDP consent "Your profile in the household"; otherwise they stay on
 * this phone.
 */
export function AboutStep({ ans, setAns, bankIncome, profileOn, onAllowProfile, saved, onNext }: {
  ans: OnboardingAnswers; setAns: (a: OnboardingAnswers) => void;
  /** The bank data shows the member's income: don't ask for it. */
  bankIncome: boolean;
  profileOn: boolean; onAllowProfile: () => void; saved: "device" | "server" | "error";
  onNext: () => void;
}) {
  const { t, lang } = useApp();
  const m = ans.money;
  const setM = (patch: Partial<MoneyAnswers>) => setAns({ ...ans, money: { ...m, ...patch } });
  const noIncome = m.income_amount.state === "none";
  const noBill = m.bill_name.state === "none";
  const asked: Answer<unknown>[] = [
    ans.members, ans.earners, ans.dependents.children, ans.dependents.children_in_school, ans.dependents.elders, ans.dependents.other,
    m.cash, ans.goal, ...(noBill ? [] : [m.bill_amount]),
    ...(bankIncome ? [] : [ans.own_income, ...(noIncome ? [] : [m.income_amount, m.next_pay])]),
  ];
  const left = asked.filter(isOpen).length;
  let n = 0;
  const num = () => ++n;

  return (<>
    <Heading v={{ hi: "Jo bank nahi bata sakta", en: "What your bank can't tell us" }}
      sub={bankIncome
        ? { hi: "Aamdani, bill aur EMI aapke bank data se aa gaye. Bas yeh kuch baatein — koi bhi chhod sakte hain.", en: "Income, bills and EMIs came from your bank data. Just these few things — skip any." }
        : { hi: "Bill aur balance aapke bank data se aa gaye. Bas yeh kuch baatein — koi bhi chhod sakte hain.", en: "Bills and balance came from your bank data. Just these few things — skip any." }} />

    <div className={`mt-4 rounded-[20px] p-3 text-[13px] flex items-start gap-2 ${profileOn ? "bg-mint/70" : "bg-white shadow-soft"}`}>
      {profileOn ? <ShieldCheck size={18} className="text-leaf shrink-0 mt-0.5" aria-hidden /> : <Lock size={18} className="shrink-0 mt-0.5" aria-hidden />}
      <div className="flex-1">
        {profileOn ? (
          <p className="font-semibold">{saved === "error"
            ? t({ hi: "Jawaab save nahi hue — dobara koshish karein", en: "Couldn't save your answers — try again" })
            : t({ hi: "Aapke jawaab aapke hisaab mein jud rahe hain, \"aapne bataya\" likh kar. Family → Consent mein kabhi bhi band karein.", en: "Your answers go into your picture, marked \"you told us\". Stop anytime in Family → Consent." })}</p>
        ) : (<>
          <p className="font-semibold">{t({ hi: "Inhe aapke hisaab mein jodein?", en: "Use these in your picture?" })}</p>
          <p className="text-muted text-[12px] mt-0.5">{t({ hi: "Consent ke bina jawaab sirf is phone par rahenge aur hisaab nahi badlega.", en: "Without consent, answers stay only on this phone and your picture won't change." })}</p>
          <button type="button" onClick={onAllowProfile} className="mt-2 rounded-full bg-ink text-white px-4 min-h-10 text-xs font-bold">{t({ hi: "Haan, jodein (DPDP consent)", en: "Yes, use them (DPDP consent)" })}</button>
        </>)}
      </div>
    </div>

    <section className="mt-4 rounded-[24px] bg-white/70 p-4">
      <p className="font-extrabold">{num()}. {t({ hi: "Parivaar", en: "Your family" })}</p>
      <div className="mt-2 space-y-2">
        <CountRow e="👨‍👩‍👧‍👦" l={{ hi: "Ghar mein kitne log?", en: "People at home" }} a={ans.members} set={(v) => setAns({ ...ans, members: v })} />
        <CountRow e="💼" l={{ hi: "Kitne kamaate hain?", en: "How many earn?" }} a={ans.earners} set={(v) => setAns({ ...ans, earners: v })} />
        <CountRow e="🧒" l={{ hi: "Bachche", en: "Children" }} a={ans.dependents.children} set={(v) => setAns({ ...ans, dependents: { ...ans.dependents, children: v } })} />
        <CountRow e="🎒" l={{ hi: "Unmein school jaane wale", en: "Of them, in school" }} a={ans.dependents.children_in_school} set={(v) => setAns({ ...ans, dependents: { ...ans.dependents, children_in_school: v } })} />
        <CountRow e="👵" l={{ hi: "Buzurg (60+)", en: "Elders (60+)" }} a={ans.dependents.elders} set={(v) => setAns({ ...ans, dependents: { ...ans.dependents, elders: v } })} />
        <CountRow e="🧑‍🦽" l={{ hi: "Aur koi nirbhar", en: "Other dependents" }} a={ans.dependents.other} set={(v) => setAns({ ...ans, dependents: { ...ans.dependents, other: v } })} />
      </div>
      <Why v={WHY.dependents} />
    </section>

    <section className="mt-3 rounded-[24px] bg-white/70 p-4 space-y-2">
      <p className="font-extrabold">{num()}. {t({ hi: "Ghar mein cash", en: "Cash at home" })}</p>
      <RupeeField label={{ hi: "Aaj ghar mein kitna cash hai? (bank ke bahar)", en: "Cash at home today (outside the bank)" }} a={m.cash} set={(v) => setM({ cash: v })} />
      <Why v={WHY.cash} />
    </section>

    {!bankIncome && (
      <section className="mt-3 rounded-[24px] bg-white/70 p-4 space-y-3">
        <p className="font-extrabold">{num()}. {t({ hi: "Aamdani — bank data mein nahi dikhi", en: "Income — not seen in your bank data" })}</p>
        <div className="space-y-2">
          {OWN_INCOME.map((k) => {
            const on = ans.own_income.state === "answered" && ans.own_income.value === k;
            return <button key={k} aria-pressed={on} onClick={() => setAns({ ...ans, own_income: on ? { state: "unanswered" } : answered<OwnIncome>(k) })} className={`w-full min-h-12 rounded-[18px] px-4 text-left text-[14px] font-bold ${on ? "bg-ink text-white" : "bg-white"}`}>{t(OWN_INCOME_LABEL[k])}</button>;
          })}
        </div>
        <div className="flex justify-end">
          <button aria-pressed={noIncome} onClick={() => setM(noIncome
            ? { income_amount: { state: "unanswered" }, income_frequency: { state: "unanswered" }, next_pay: { state: "unanswered" } }
            : { income_amount: { state: "none" }, income_frequency: { state: "none" }, next_pay: { state: "none" } })}
            className={`rounded-full px-3 min-h-9 text-[12px] font-bold ${noIncome ? "bg-ink text-white" : "bg-lav"}`}>
            {noIncome ? "✓ " : ""}{lang === "hi" ? "Koi tay aamdani nahi" : "No regular income"}
          </button>
        </div>
        <RupeeField none={noIncome} label={{ hi: "Har baar kitna milta hai?", en: "How much each time?" }} a={m.income_amount} set={(v) => setM({ income_amount: v })} />
        <fieldset disabled={noIncome} className={noIncome ? "opacity-40" : ""}>
          <legend className="text-[13px] font-bold mb-1">{t({ hi: "Kitni baar?", en: "How often?" })}</legend>
          <div className="grid grid-cols-4 gap-1.5">
            {FREQUENCIES.map((f) => {
              const on = m.income_frequency.state === "answered" && m.income_frequency.value === f;
              return <button key={f} aria-pressed={on} onClick={() => setM({ income_frequency: on ? { state: "unanswered" } : answered<IncomeFrequency>(f) })} className={`min-h-11 rounded-[14px] text-[12px] font-bold ${on ? "bg-ink text-white" : "bg-white"}`}>{t(FREQUENCY_LABEL[f])}</button>;
            })}
          </div>
        </fieldset>
        <DateField disabled={noIncome} label={{ hi: "Agli baar kab milega?", en: "When do you get it next?" }} a={m.next_pay} set={(v) => setM({ next_pay: v })} />
        <Why v={WHY.income} />
      </section>
    )}

    <section className="mt-3 rounded-[24px] bg-white/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-extrabold">{num()}. {t({ hi: "Cash mein diya jaane wala bill", en: "A bill you pay in cash" })}</p>
        <button aria-pressed={noBill} onClick={() => setM(noBill
          ? { bill_name: { state: "unanswered" }, bill_amount: { state: "unanswered" }, bill_due: { state: "unanswered" } }
          : { bill_name: { state: "none" }, bill_amount: { state: "none" }, bill_due: { state: "none" } })}
          className={`rounded-full px-3 min-h-9 text-[12px] font-bold ${noBill ? "bg-ink text-white" : "bg-lav"}`}>
          {noBill ? "✓ " : ""}{lang === "hi" ? "Koi nahi" : "None"}
        </button>
      </div>
      <p className="text-[12px] text-muted -mt-1">{t({ hi: "Jo is bank khaate se nahi kat-ta (jaise school fee cash mein, doodh, kiraya haath mein)", en: "One that doesn't leave this bank account (e.g. school fee in cash, milk, rent by hand)" })}</p>
      <label className={`block ${noBill ? "opacity-40" : ""}`}>
        <span className="block text-[13px] font-bold mb-1">{t({ hi: "Kis cheez ka?", en: "What is it for?" })}</span>
        <input disabled={noBill} maxLength={40} value={m.bill_name.state === "answered" ? m.bill_name.value : ""}
          onChange={(e) => setM({ bill_name: e.target.value.trim() ? answered(e.target.value) : { state: "unanswered" } })}
          className="w-full min-h-12 rounded-[18px] bg-white px-3 shadow-soft font-bold outline-none" />
      </label>
      <RupeeField none={noBill} label={{ hi: "Kitna dena hai?", en: "How much?" }} a={m.bill_amount} set={(v) => setM({ bill_amount: v })} />
      <DateField disabled={noBill} label={{ hi: "Aakhri tareekh", en: "Due date" }} a={m.bill_due} set={(v) => setM({ bill_due: v })} />
      <Why v={WHY.bill} />
    </section>

    <section className="mt-3 rounded-[24px] bg-white/70 p-4">
      <p className="font-extrabold">{num()}. {t({ hi: "Sabse bada lakshya?", en: "Your biggest goal?" })}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {GOALS.map((g) => {
          const on = ans.goal.state === "answered" && ans.goal.value === g;
          return <button key={g} aria-pressed={on} onClick={() => setAns({ ...ans, goal: on ? { state: "unanswered" } : answered<GoalIntent>(g) })} className={`min-h-12 rounded-[18px] px-3 text-left text-[13px] font-bold ${on ? "bg-clay text-white" : "bg-white"}`}>{GOAL_EMOJI[g]} {t(GOAL_LABEL[g])}</button>;
        })}
      </div>
      <Why v={WHY.goal} />
    </section>

    <p className="mt-4 rounded-[18px] bg-lav/70 p-3 text-[12px] leading-snug">
      {left > 0
        ? t({ hi: `${left} chhode — koi baat nahi, "jawaab nahi diya" maana jaayega, zero nahi.`, en: `${left} left blank — fine, saved as "not answered", never as zero.` })
        : t({ hi: "Shukriya! Yeh sab \"aapne bataya\" ke roop mein dikhega.", en: "Thank you! These show as “you told us”." })}
    </p>
    <div className="flex-1" />
    <Btn variant="ink" className="w-full mt-5" onClick={onNext}>{lang === "hi" ? "Aage" : "Next"}</Btn>
    <button onClick={onNext} className="mt-2 w-full min-h-11 text-sm font-bold text-muted">{lang === "hi" ? "Abhi chhodein" : "Skip for now"}</button>
  </>);
}

