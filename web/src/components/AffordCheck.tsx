"use client";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import CashRiver from "@/components/ui/CashRiver";
import { Btn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";
import type { SimResult } from "@/lib/types";

const PRESETS = [{ e: "📱", hi: "Phone", en: "Phone", v: 8000 }, { e: "🛵", hi: "Scooty", en: "Scooter", v: 30000 }, { e: "🧊", hi: "Fridge", en: "Fridge", v: 18000 }, { e: "🪔", hi: "Tyohaar", en: "Festival", v: 5000 }];

/** "Kya hum yeh khareed sakte hain?" — a scenario branch of E03 with the purchase as a one-off debit. */
export default function AffordCheck() {
  const { hid, t, lang, data } = useApp();
  const [amt, setAmt] = useState("");
  const [res, setRes] = useState<SimResult | null>(null);
  const [busy, setBusy] = useState(false);
  const check = async (v: number) => {
    setBusy(true);
    try { setRes(await api.simulate(hid, { shock_amount: v })); } finally { setBusy(false); }
  };
  const floor = data?.river.floor ?? 0;
  const verdict = res ? (res.river.gap > 0 ? "red" : res.river.min_balance < floor ? "amber" : "green") : null;
  const V = {
    red: { bg: "bg-danger-soft", l: { hi: "Abhi nahi — paise kam pad jayenge", en: "Not now — you'd run short" } },
    amber: { bg: "bg-amber-soft", l: { hi: "Ho sakta hai, par safety floor toot jayega", en: "Possible, but it breaks your safety floor" } },
    green: { bg: "bg-mint", l: { hi: "Haan, aaram se ho jayega", en: "Yes, comfortably" } },
  };
  return (
    <section className="mx-5 lg:mx-0 rounded-[32px] bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2"><ShoppingBag size={22} /><p className="text-[17px] font-extrabold">{t({ hi: "Kya hum yeh khareed sakte hain?", en: "Can we afford this?" })}</p></div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button key={p.en} onClick={() => { setAmt(String(p.v)); check(p.v); }} className="rounded-[18px] bg-lav py-2">
            <p className="text-2xl">{p.e}</p><p className="text-[11px] font-bold">{lang === "hi" ? p.hi : p.en}</p><p className="text-[11px] text-muted num">{inr(p.v)}</p>
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (amt) check(Number(amt)); }} className="mt-3 flex gap-2">
        <span className="grid place-items-center px-3 rounded-2xl bg-lav font-bold">₹</span>
        <input inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))} placeholder={lang === "hi" ? "Kitne ka?" : "How much?"} className="flex-1 min-w-0 rounded-2xl bg-lav px-3 text-lg font-bold num outline-none min-h-12" />
        <Btn type="submit" variant="ink" disabled={!amt || busy}>{lang === "hi" ? "Dekho" : "Check"}</Btn>
      </form>
      {res && verdict && (
        <div className={`mt-3 rounded-[22px] p-3 ${V[verdict].bg}`}>
          <p className="font-extrabold">{t(V[verdict].l)}</p>
          <p className="text-[13px] mt-1">{t(res.message)}</p>
          <div className="mt-2 rounded-2xl bg-white/70 p-2"><CashRiver river={res.river} compact /></div>
          <p className="text-[11px] font-bold text-muted mt-1">🔮 {lang === "hi" ? "Sirf andaaza — asli plan nahi badla" : "Scenario only — real plan unchanged"}</p>
        </div>
      )}
    </section>
  );
}
