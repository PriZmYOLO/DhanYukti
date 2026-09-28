"use client";
import { BellRing, Mic, ShieldCheck } from "lucide-react";
import DemoHouseholds from "./DemoHouseholds";
import { useApp } from "@/lib/store";

const FEATURES = [
  { Icon: BellRing, t: { hi: "Pehle se warning", en: "Early warning" }, d: { hi: "Mahine ke aakhir ki kami 5 din pehle", en: "Month-end shortfall, 5 days ahead" } },
  { Icon: Mic, t: { hi: "Roz ek kaam, bolkar", en: "One task a day, by voice" }, d: { hi: "Hindi aur English mein, bina padhe", en: "In Hindi or English, no reading needed" } },
  { Icon: ShieldCheck, t: { hi: "Consent aapke haath", en: "You control consent" }, d: { hi: "Anumati AA se — DhanYukti mein kabhi bhi rokein, Anumati app mein band karein", en: "Via Anumati AA — stop DhanYukti anytime, end it in the Anumati app" } },
];
// Source: Department of Financial Services, AA progress as of 31 Mar 2026.
const ENABLED = 2880; // million accounts that can share data on AA
const LINKED = 284.6; // million actually linked

/** Left side of the landing page (laptop only). */
export function LandingPanel() {
  const { t } = useApp();
  return (
    <div className="hidden lg:block max-w-[520px] py-6">
      <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow-soft">
        <span className="h-2 w-2 rounded-full bg-leaf" />{t({ hi: "Parivaar ka paisa saathi", en: "Your family's money companion" })}
      </p>
      <h1 className="mt-4 text-6xl font-extrabold leading-[1.02] tracking-tight">Dhan<span className="text-clay">Yukti</span></h1>
      <p className="font-deva text-2xl text-ink-2 mt-1">धनयुक्ति</p>
      <p className="mt-4 text-[17px] text-muted leading-relaxed">
        {t({ hi: "Tier 2/3 parivaaron ke liye phone-first, voice-first paisa saathi.", en: "A phone-first, voice-first money companion for Tier 2/3 families." })}
      </p>

      <div className="mt-7 space-y-3">
        {FEATURES.map(({ Icon, t: title, d }) => (
          <div key={title.en} className="flex items-center gap-4">
            <span className="grid place-items-center h-12 w-12 rounded-2xl bg-white shadow-soft shrink-0"><Icon size={20} /></span>
            <div><p className="font-extrabold">{t(title)}</p><p className="text-sm text-muted">{t(d)}</p></div>
          </div>
        ))}
      </div>

      <div className="mt-7 rounded-[24px] bg-ink text-white p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-haldi">{t({ hi: "Mauka", en: "The opportunity" })}</p>
        <p className="mt-2 text-[22px] font-extrabold leading-snug">
          {t({ hi: "10 mein se 9 khaate open finance ke liye taiyaar — par kabhi jude hi nahi.", en: "9 in 10 accounts are ready for open finance — but never linked." })}
        </p>
        <div className="mt-4 h-3 rounded-full bg-white/15 overflow-hidden">
          <div className="h-full rounded-full bg-haldi" style={{ width: `${(LINKED / ENABLED) * 100}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span><b className="text-haldi num">284.6 mn</b> <span className="text-white/60">{t({ hi: "jude", en: "linked" })}</span></span>
          <span><b className="num">2.88 bn</b> <span className="text-white/60">{t({ hi: "AA par taiyaar", en: "AA-enabled" })}</span></span>
        </div>
        <p className="mt-4 text-sm text-white/80">{t({ hi: "DhanYukti inhe jodta hai — parivaar ki apni suraksha ke liye.", en: "DhanYukti brings them in — for the family's own protection." })}</p>
        <p className="mt-2 text-[11px] text-white/40">{t({ hi: "Srot", en: "Source" })}: Dept. of Financial Services, 31 Mar 2026</p>
      </div>

      <p className="mt-8 mb-3 text-xs font-bold uppercase tracking-widest text-muted">{t({ hi: "Demo parivaar", en: "Demo households" })}</p>
      <DemoHouseholds cards />

      <p className="mt-7 text-xs text-muted">
        {t({ hi: "Consent", en: "Consent via" })} <b className="text-ink">Anumati AA</b> · {t({ hi: "Insight", en: "Insight via" })} <b className="text-ink">Perfios</b>
      </p>
    </div>
  );
}
