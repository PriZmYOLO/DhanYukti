"use client";
import { useState } from "react";
import { PencilLine, Info, Check } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { Btn, ConfTag, SpeakBtn, StatusPill } from "@/components/ui/bits";
import { metricValue } from "./HealthTiles";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import type { Dashboard, L } from "@/lib/types";

export type MetricKey = keyof Dashboard["metrics"];

const HOW: Record<MetricKey, L> = {
  safe_to_spend: { hi: "Agli aamdani se pehle sabse kam balance, minus aapka safety floor.", en: "Lowest projected balance before your next income, minus your safety floor." },
  resilience_days: { hi: "Bina aamdani ke, bachat se zaroori kharch kitne din chalega.", en: "How many days savings cover essentials with no income." },
  debt_load: { hi: "Har ₹100 kamai mein se kitne EMI aur loan mein jaate hain.", en: "How much of every ₹100 earned goes to EMIs and loans." },
  protection: { hi: "Har kamaane wale ke paas jeevan aur health bima hai ya nahi.", en: "Whether each earner has life and health cover." },
};

type Fix = { field: string; label: L; kind: "inr" | "bool"; memberId?: string };

function fixesFor(key: MetricKey, d: Dashboard): Fix[] {
  if (key === "safe_to_spend") return [
    { field: "closing_balance", label: { hi: "Aaj khaate mein kitne hain?", en: "Balance in your account today" }, kind: "inr" },
    { field: "safety_floor", label: { hi: "Kitna hamesha bacha ke rakhna hai?", en: "Safety floor to always keep" }, kind: "inr" },
  ];
  if (key === "resilience_days") return [{ field: "essentials_per_day", label: { hi: "Roz ka zaroori kharch", en: "Daily essential spending" }, kind: "inr" }];
  if (key === "debt_load") return [{ field: "monthly_income", label: { hi: "Mahine ki kamai", en: "Monthly income" }, kind: "inr" }];
  return d.household.members.filter((m) => m.earner).map((m) => ({ field: `member:${m.id}.life`, label: { hi: `${m.name} ka jeevan bima hai?`, en: `Does ${m.name} have life cover?` }, kind: "bool" as const, memberId: m.id }));
}

export default function MetricSheet({ k, onClose }: { k: MetricKey | null; onClose: () => void }) {
  const { data, t, lang, hid, setData, award } = useApp();
  const [editing, setEditing] = useState<Fix | null>(null);
  const [val, setVal] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!data || !k) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const m = data.metrics[k];

  const save = async (value: number | boolean) => {
    if (!editing) return;
    setErr(null);
    try {
      const r = await api.correct(hid, editing.field, value);
      setData(r.dashboard); setSaved(true); setEditing(null); setVal("");
      award("correction", { hi: "Sudhaar ke liye shukriya!", en: "Thanks for the correction!" });
    } catch { setErr(lang === "hi" ? "Yeh badlaav nahi ho paaya" : "Couldn't save that"); }
  };

  return (
    <Sheet open={!!k} onClose={() => { setEditing(null); setSaved(false); onClose(); }}
      title={<div><StatusPill s={m.status} /><p className="mt-2 text-xl font-extrabold">{t(m.label)}</p></div>}>
      <div className="flex items-end gap-3">
        <p className="text-[44px] font-extrabold num leading-none">{metricValue(m, lang)}</p>
        <span className="mb-2"><SpeakBtn v={{ hi: `${m.label.hi}: ${metricValue(m, "hi")}. ${m.sub.hi}`, en: `${m.label.en}: ${metricValue(m, "en")}. ${m.sub.en}` }} /></span>
      </div>
      <p className="mt-1 text-[15px]">{t(m.sub)}</p>
      <div className="mt-2 flex items-center gap-3"><ConfTag c={m.confidence} /><span className="text-[11px] text-muted">{m.engine}</span></div>

      {k === "protection" && (
        <div className="mt-4 space-y-2">
          {data.protection_detail.map((p) => (
            <div key={p.member_id} className="rounded-[20px] bg-white p-3">
              <div className="flex items-center gap-2"><b className="flex-1">{p.name}</b>
                <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${p.life ? "bg-mint text-[#135E3D]" : "bg-danger-soft text-[#A8251C]"}`}>{lang === "hi" ? "Jeevan" : "Life"} {p.life ? "✓" : "✗"}</span>
                <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${p.health ? "bg-mint text-[#135E3D]" : "bg-amber-soft text-[#8a5300]"}`}>{lang === "hi" ? "Health" : "Health"} {p.health ? "✓" : "?"}</span>
              </div>
              <p className="text-xs text-muted mt-1">{t(p.note)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-[20px] bg-haldi-soft p-3 flex gap-2">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div><p className="text-[11px] font-extrabold uppercase tracking-wider">Kyon? · {lang === "hi" ? "Kaise ginte hain" : "How we count"}</p><p className="text-sm mt-0.5">{t(HOW[k])}</p></div>
      </div>

      {saved && <p className="mt-3 flex items-center gap-2 rounded-2xl bg-mint p-3 text-sm font-semibold"><Check size={18} />{t({ hi: "Sudhaar lag gaya. Bank ka record nahi badla — sirf aapka overlay.", en: "Correction applied as an overlay. The bank record is unchanged." })}</p>}

      <p className="mt-5 flex items-center gap-2 font-extrabold"><PencilLine size={18} />{lang === "hi" ? "Yeh galat hai?" : "Is this wrong?"}</p>
      <div className="mt-2 space-y-2">
        {fixesFor(k, data).map((f) => (
          <div key={f.field} className="rounded-[20px] bg-white p-3">
            {editing?.field === f.field ? (
              f.kind === "bool" ? (
                <div><p className="text-sm font-semibold mb-2">{t(f.label)}</p>
                  <div className="grid grid-cols-2 gap-2"><Btn variant="ink" onClick={() => save(true)}>{lang === "hi" ? "Haan, hai" : "Yes"}</Btn><Btn variant="white" onClick={() => save(false)}>{lang === "hi" ? "Nahi" : "No"}</Btn></div></div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); if (val) save(Number(val)); }}>
                  <p className="text-sm font-semibold mb-2">{t(f.label)}</p>
                  <div className="flex gap-2">
                    <span className="grid place-items-center px-3 rounded-2xl bg-lav font-bold">₹</span>
                    <input autoFocus inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ""))} className="flex-1 min-w-0 rounded-2xl bg-lav px-3 text-xl font-bold num outline-none min-h-12" />
                    <Btn type="submit" variant="ink" disabled={!val}>{lang === "hi" ? "Sahi karo" : "Fix"}</Btn>
                  </div>
                </form>
              )
            ) : (
              <button onClick={() => { setEditing(f); setVal(""); setSaved(false); }} className="w-full flex items-center justify-between min-h-11 text-left">
                <span className="text-sm font-semibold">{t(f.label)}</span><span className="text-xs font-bold text-clay">{lang === "hi" ? "Badlo" : "Edit"} →</span>
              </button>
            )}
          </div>
        ))}
        {err && <p className="text-sm text-danger">{err}</p>}
      </div>
      <p className="mt-3 text-[11px] text-muted">+10 Paisa Points · {t({ hi: "Sahi data, behtar salah", en: "Better data, better guidance" })}</p>
    </Sheet>
  );
}
