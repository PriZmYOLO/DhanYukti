"use client";
import { useState } from "react";
import { Check, X, Hourglass, LifeBuoy } from "lucide-react";
import HelpSheet from "@/components/extras/HelpSheet";
import { useApp } from "@/lib/store";
import { inr } from "@/lib/format";
import type { SimResult } from "@/lib/types";

const month = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Which permitted responses close the shortfall (from the engine), the "nothing works" state,
 * and what breaking the Emergency jar does to its goal. Never suggests new credit.
 */
export default function Responses({ res, dark }: { res: SimResult; dark?: boolean }) {
  const { t, lang } = useApp();
  const [help, setHelp] = useState(false);
  const hi = lang === "hi";
  if (!res.responses?.length) return null;
  const panel = dark ? "bg-white/10" : "bg-lav";
  const sub = dark ? "text-white/70" : "text-muted";
  const gi = res.goal_impact;

  return (
    <div className="mt-4">
      {res.feasible === false ? (
        <div role="status" className={`rounded-[22px] p-3 ${dark ? "bg-[#ff8a80]/15 border border-[#ff8a80]/40" : "bg-danger-soft"}`}>
          <p className="font-extrabold">{hi ? "Aapke plan mein koi rasta yeh kami poori nahi karta" : "Nothing in your plan covers this"}</p>
          <p className={`text-[13px] mt-1 leading-snug ${dark ? "text-white/85" : ""}`}>
            {t({
              hi: "Fee khiskana, kharch kam karna, Gullak — sab milakar bhi salary se pehle paisa kam padega. Kisi app se loan lene se pehle bank mitra se baat karein.",
              en: "Moving a bill, spending less and the Gullak together still leave you short before income. Talk to a bank mitra before taking any app loan.",
            })}
          </p>
          <button onClick={() => setHelp(true)} className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 min-h-10 text-xs font-bold ${dark ? "bg-white text-ink" : "bg-ink text-white"}`}>
            <LifeBuoy size={15} />{hi ? "Bank mitra se baat" : "Talk to a bank mitra"}
          </button>
        </div>
      ) : (
        <p className={`text-[12px] font-bold uppercase tracking-wide ${sub}`}>{hi ? "Kya karne se kami poori hogi" : "What closes the gap"}</p>
      )}

      <ul className="mt-2 space-y-2">
        {res.responses.map((r) => (
          <li key={r.id} className={`rounded-[18px] ${panel} px-3 py-2`}>
            <div className="flex items-center gap-2">
              <span className={`grid place-items-center h-6 w-6 rounded-full shrink-0 ${r.fixes ? "bg-leaf text-white" : dark ? "bg-white/20 text-white" : "bg-white text-muted"}`} aria-hidden>
                {r.fixes ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
              </span>
              <span className="flex-1 text-[13px] font-semibold leading-snug">{t(r.label)}</span>
              <span className={`text-[11px] font-extrabold shrink-0 ${r.fixes ? (dark ? "text-mint" : "text-leaf") : sub}`}>
                {r.fixes ? (hi ? "Kaam karega" : "Works") : hi ? "Kaafi nahi" : "Not enough"}
              </span>
            </div>
            {r.conditional && (
              <p className="mt-1 ml-8 inline-flex items-center gap-1 rounded-full bg-haldi text-ink px-2 py-0.5 text-[11px] font-extrabold">
                <Hourglass size={11} />{hi ? "Shart par, abhi maana nahi" : "Conditional, not accepted"}{r.needs ? ` · ${t(r.needs)}` : ""}
              </p>
            )}
          </li>
        ))}
      </ul>

      {gi && (
        <div className={`mt-3 rounded-[18px] ${dark ? "bg-cream text-ink" : "bg-clay-soft"} p-3`}>
          <p className="text-[12px] font-extrabold">{hi ? `Agar ${t(gi.name)} ke ${inr(gi.used)} use kiye` : `If you use ${inr(gi.used)} from the ${t(gi.name)}`}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <p className="text-muted">{hi ? "Lakshya tak baaki" : "Still needed for goal"}</p>
              <p className="font-extrabold num">{inr(gi.gap_before)} → <span className="text-danger">{inr(gi.gap_after)}</span></p>
            </div>
            <div>
              <p className="text-muted">{hi ? `${month(gi.target_date)} tak roz` : `Per day to reach by ${month(gi.target_date)}`}</p>
              <p className="font-extrabold num">{gi.daily_after === gi.daily_before ? inr(gi.daily_after) : <>{inr(gi.daily_before)} → <span className="text-danger">{inr(gi.daily_after)}</span></>}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted mt-1">{hi ? `Lakshya ${inr(gi.goal)}` : `Goal ${inr(gi.goal)}`}</p>
        </div>
      )}
      <HelpSheet open={help} onClose={() => setHelp(false)} />
    </div>
  );
}
