"use client";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import CashRiver from "@/components/ui/CashRiver";
import BeforeAfter from "@/components/whatif/BeforeAfter";
import Responses from "@/components/whatif/Responses";
import { Btn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { api, type SimInput } from "@/lib/api";
import { figure, inr } from "@/lib/format";
import type { SimResult } from "@/lib/types";

const PRESETS = [{ e: "📱", hi: "Phone", en: "Phone", v: 8000 }, { e: "🛵", hi: "Scooty", en: "Scooter", v: 30000 }, { e: "🧊", hi: "Fridge", en: "Fridge", v: 18000 }, { e: "🪔", hi: "Tyohaar", en: "Festival", v: 5000 }];
type Pay = "cash" | "loan";
const num = (s: string) => (s.trim() === "" ? undefined : Number(s));

/** "Kya hum yeh khareed sakte hain?" — a scenario branch of E03: from cash, or on a loan (total cost only with full terms). */
export default function AffordCheck() {
  const { hid, t, lang, data } = useApp();
  const [amt, setAmt] = useState("");
  const [pay, setPay] = useState<Pay>("cash");
  const [terms, setTerms] = useState({ rate: "", months: "", fee: "" });
  const [res, setRes] = useState<SimResult | null>(null);
  const [state, setState] = useState<"idle" | "pending" | "ready" | "error">("idle");
  const hi = lang === "hi";

  const check = async (v: number, how: Pay = pay) => {
    setState("pending");
    const purchase: NonNullable<SimInput["purchase"]> = { amount: v, pay: how };
    if (how === "loan") purchase.loan = { annual_rate_pct: num(terms.rate), months: num(terms.months), processing_fee: num(terms.fee) };
    try { setRes(await api.simulate(hid, { purchase })); setState("ready"); } catch { setState("error"); }
  };
  const choose = (how: Pay) => { setPay(how); setRes(null); setState("idle"); };

  const floor = data?.river.floor ?? 0;
  const loan = res?.loan;
  const loanIncomplete = loan && !loan.complete;
  const verdict = !res || loanIncomplete ? null : res.feasible === false || (res.river.gap > 0 && res.feasible === undefined) ? "red"
    : res.river.gap > 0 || res.river.min_balance < floor || loan?.debt_status_after === "amber" || loan?.debt_status_after === "red" ? "amber" : "green";
  const V = {
    red: { bg: "bg-danger-soft", l: { hi: "Abhi nahi — paise kam pad jayenge", en: "Not now — you'd run short" } },
    amber: { bg: "bg-amber-soft", l: res?.river.gap ? { hi: "Tabhi, jab kami poori karne ka rasta ho", en: "Only with a way to cover the shortfall" } : { hi: "Ho sakta hai, par dhyaan dein", en: "Possible, but watch out" } },
    green: { bg: "bg-mint", l: { hi: "Haan, aaram se ho jayega", en: "Yes, comfortably" } },
  };
  const field = "rounded-2xl bg-lav px-3 min-h-12 w-full text-base font-bold num outline-none";

  return (
    <section className="mx-5 lg:mx-0 rounded-[32px] bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2"><ShoppingBag size={22} /><p className="text-[17px] font-extrabold">{t({ hi: "Kya hum yeh khareed sakte hain?", en: "Can we afford this?" })}</p></div>

      <div role="radiogroup" aria-label={hi ? "Kaise denge" : "How you'll pay"} className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-lav p-1">
        {(["cash", "loan"] as const).map((p) => (
          <button key={p} role="radio" aria-checked={pay === p} onClick={() => choose(p)}
            className={`rounded-full min-h-10 text-sm font-bold ${pay === p ? "bg-ink text-white" : ""}`}>
            {p === "cash" ? (hi ? "Cash / bachat se" : "From cash") : hi ? "Loan par" : "On a loan"}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button key={p.en} onClick={() => { setAmt(String(p.v)); check(p.v); }} className="rounded-[18px] bg-lav py-2">
            <p className="text-2xl">{p.e}</p><p className="text-[11px] font-bold">{hi ? p.hi : p.en}</p><p className="text-[11px] text-muted num">{inr(p.v)}</p>
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (amt) check(Number(amt)); }} className="mt-3 space-y-2">
        <div className="flex gap-2">
          <span className="grid place-items-center px-3 rounded-2xl bg-lav font-bold">₹</span>
          <input inputMode="numeric" aria-label={hi ? "Kitne ka?" : "How much?"} value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))} placeholder={hi ? "Kitne ka?" : "How much?"} className="flex-1 min-w-0 rounded-2xl bg-lav px-3 text-lg font-bold num outline-none min-h-12" />
          <Btn type="submit" variant="ink" disabled={!amt || state === "pending"}>{hi ? "Dekho" : "Check"}</Btn>
        </div>
        {pay === "loan" && (
          <div className="grid grid-cols-3 gap-2">
            <label className="text-[11px] font-bold text-muted">{hi ? "Byaaj % saal" : "Interest % / yr"}
              <input inputMode="decimal" value={terms.rate} onChange={(e) => setTerms({ ...terms, rate: e.target.value.replace(/[^\d.]/g, "") })} className={field} />
            </label>
            <label className="text-[11px] font-bold text-muted">{hi ? "Mahine" : "Months"}
              <input inputMode="numeric" value={terms.months} onChange={(e) => setTerms({ ...terms, months: e.target.value.replace(/\D/g, "") })} className={field} />
            </label>
            <label className="text-[11px] font-bold text-muted">{hi ? "Fee ₹" : "Fee ₹"}
              <input inputMode="numeric" value={terms.fee} onChange={(e) => setTerms({ ...terms, fee: e.target.value.replace(/\D/g, "") })} className={field} />
            </label>
          </div>
        )}
      </form>

      <div aria-live="polite">
        {state === "pending" && <p role="status" className="mt-3 rounded-[22px] bg-lav p-3 text-sm font-bold">{hi ? "Hisaab ho raha hai…" : "Checking…"}</p>}
        {state === "error" && <p role="alert" className="mt-3 rounded-[22px] bg-danger-soft p-3 text-sm font-bold">{hi ? "Abhi hisaab nahi ho paaya. Phir koshish karein." : "Couldn't check right now. Try again."}</p>}

        {state === "ready" && res && loanIncomplete && (
          <div className="mt-3 rounded-[22px] bg-amber-soft p-3">
            <p className="font-extrabold">{hi ? "Kul kharcha batane ke liye loan ki poori sharten chahiye" : "Total cost needs full loan terms"}</p>
            <p className="text-[13px] mt-1">{hi ? "Yeh abhi nahi pata:" : "Still missing:"}</p>
            <ul className="mt-1 list-disc pl-5 text-[13px]">{loan.missing_labels.map((m) => <li key={m.en}>{t(m)}</li>)}</ul>
            <p className="text-[11px] text-muted mt-2">{hi ? "Hum andaaze se kul rakam kabhi nahi batate." : "We never guess a total."}</p>
          </div>
        )}

        {state === "ready" && res && verdict && (
          <div className={`mt-3 rounded-[22px] p-3 ${V[verdict].bg}`}>
            <p className="font-extrabold">{t(V[verdict].l)}</p>
            <p className="text-[13px] mt-1">{t(res.message)}</p>
            {loan?.complete && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-2xl bg-white/70 p-2"><p className="text-muted">{hi ? "EMI har mahine" : "EMI a month"}</p><p className="font-extrabold num">{inr(loan.emi)} × {loan.months}</p></div>
                <div className="rounded-2xl bg-white/70 p-2"><p className="text-muted">{hi ? "Kul denge" : "You pay in all"}</p><p className="font-extrabold num">{inr(loan.total_cost)}</p></div>
                <div className="rounded-2xl bg-white/70 p-2"><p className="text-muted">{hi ? "Daam se zyada" : "More than the price"}</p><p className="font-extrabold num">{inr(loan.extra_over_price)} <span className="text-muted font-semibold">(₹{loan.extra_per_100}/₹100)</span></p></div>
                <div className="rounded-2xl bg-white/70 p-2"><p className="text-muted">{hi ? "Har ₹100 kamai mein EMI" : "EMIs per ₹100 earned"}</p><p className="font-extrabold num">₹{figure(loan.debt_per100_before)} → ₹{figure(loan.debt_per100_after)}</p></div>
                <p className="col-span-2 text-[11px] text-muted">{hi ? `Pehli EMI ${loan.first_emi} — neeche ka chart sirf agle 30 din dikhata hai.` : `First EMI on ${loan.first_emi} — the chart below covers the next 30 days only.`}</p>
              </div>
            )}
            <BeforeAfter res={res} />
            <Responses res={res} />
            <div className="mt-2 rounded-2xl bg-white/70 p-2"><CashRiver river={res.river} compact /></div>
            <p className="text-[11px] font-bold text-muted mt-1">🔮 {hi ? "Sirf andaaza — asli plan nahi badla" : "Scenario only — real plan unchanged"}</p>
          </div>
        )}
      </div>
    </section>
  );
}
