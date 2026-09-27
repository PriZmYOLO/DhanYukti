"use client";
import { useId, useState } from "react";
import { motion } from "motion/react";
import { useApp } from "@/lib/store";
import { inr } from "@/lib/format";

type Month = { m: string; income: number; spend: number };

// HARDCODED demo data (not from the engine) — clearly labelled "Demo data" in the UI.
const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const mk = (inc: number[], sp: number[]): Month[] => MONTHS.map((m, i) => ({ m, income: inc[i], spend: sp[i] }));
const FLOW: Record<string, Month[]> = {
  A: mk([30000, 30000, 30000, 30000, 30000, 30000], [28200, 29100, 28600, 29800, 29400, 31200]),
  B: mk([26000, 22000, 30000, 24500, 28000, 23000], [24800, 23600, 25200, 25900, 24100, 22400]),
  C: mk([38000, 38000, 38000, 38000, 38000, 38000], [29500, 30400, 31200, 29800, 30100, 30600]),
};
const PAYOFF = {
  smart: { months: 9, interest: 6200 },
  minimum: { months: 16, interest: 14800 },
};

const W = 320, H = 170, PAD_B = 22, PAD_T = 8, MAX = 40000;

function DemoTag() {
  return <span className="rounded-full bg-lav px-2 py-0.5 text-[11px] font-bold text-muted">Demo data</span>;
}

/** Pro-mode extras: income vs spend bars + debt payoff comparison. Demo data keyed by household. */
export default function ProCharts() {
  const { hid, t, lang } = useApp();
  const pid = useId().replace(/:/g, "");
  const rows = FLOW[hid] ?? FLOW.A;
  const [sel, setSel] = useState(rows.length - 1);
  const cur = rows[Math.min(sel, rows.length - 1)];
  const gw = W / rows.length, bw = gw * 0.3;
  const y = (v: number) => PAD_T + (H - PAD_B - PAD_T) * (1 - v / MAX);
  const over = cur.spend > cur.income;

  return (
    <div className="w-full space-y-3">
      <section className="w-full rounded-[28px] bg-white p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <h3 className="flex-1 text-[16px] font-extrabold">{t({ hi: "Aamdani vs kharcha", en: "Income vs spend" })}</h3>
          <DemoTag />
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] font-bold text-muted">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-leaf" />{lang === "hi" ? "Aamdani" : "Income"}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-ink" />{lang === "hi" ? "Kharcha" : "Spend"}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "repeating-linear-gradient(135deg,#e0473e 0 2px,#17153b 2px 5px)" }} />{lang === "hi" ? "Zyada kharcha" : "Overspent"}</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full h-auto" role="img" aria-label="Income vs spend chart">
          <defs>
            <pattern id={`h${pid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#17153b" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#e0473e" strokeWidth="3" />
            </pattern>
          </defs>
          {[10000, 20000, 30000, 40000].map((v) => (
            <g key={v}>
              <line x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="#17153b" strokeOpacity=".07" />
              <text x="2" y={y(v) + 10} fontSize="9" fill="#6b6887">{v / 1000}k</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const x0 = i * gw + gw / 2 - bw - 1, bad = r.spend > r.income, on = i === sel;
            return (
              <g key={r.m} onClick={() => setSel(i)} className="cursor-pointer">
                <rect x={i * gw} y={0} width={gw} height={H} fill={on ? "#ece7fb" : "transparent"} rx="10" />
                <motion.rect x={x0} width={bw} rx="3" fill="#1f8a5b" initial={{ y: y(0), height: 0 }} animate={{ y: y(r.income), height: y(0) - y(r.income) }} transition={{ duration: 0.6, delay: i * 0.05 }} />
                <motion.rect x={x0 + bw + 2} width={bw} rx="3" fill={bad ? `url(#h${pid})` : "#17153b"} initial={{ y: y(0), height: 0 }} animate={{ y: y(r.spend), height: y(0) - y(r.spend) }} transition={{ duration: 0.6, delay: i * 0.05 + 0.05 }} />
                <text x={i * gw + gw / 2} y={H - 6} textAnchor="middle" fontSize="11" fontWeight={on ? 800 : 600} fill={on ? "#17153b" : "#6b6887"}>{r.m}</text>
              </g>
            );
          })}
        </svg>
        <div className={`mt-2 flex items-center gap-2 rounded-[18px] px-3 py-2 text-[13px] font-bold num ${over ? "bg-danger-soft" : "bg-mint"}`}>
          <span className="w-9">{cur.m}</span>
          <span className="text-leaf">{inr(cur.income)}</span>
          <span className="text-muted">/</span>
          <span>{inr(cur.spend)}</span>
          <span className={`ml-auto ${over ? "text-danger" : "text-leaf"}`}>
            {over ? `−${inr(cur.spend - cur.income)}` : `+${inr(cur.income - cur.spend)}`}
          </span>
        </div>
      </section>

      <section className="w-full rounded-[28px] bg-white p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <h3 className="flex-1 text-[16px] font-extrabold">{t({ hi: "Karz kaise chukayein", en: "Debt payoff plan" })}</h3>
          <DemoTag />
        </div>
        {hid === "A" ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {([
                { k: "smart", l: { hi: "Pehle QuickRupee chukao", en: "Pay QuickRupee first" }, cls: "bg-mint", best: true },
                { k: "minimum", l: { hi: "Sirf minimum", en: "Minimum only" }, cls: "bg-lav", best: false },
              ] as const).map((c) => (
                <div key={c.k} className={`rounded-[22px] p-3 ${c.cls}`}>
                  <p className="text-[13px] font-extrabold leading-tight min-h-9">{t(c.l)}</p>
                  <p className="mt-2 text-[26px] font-extrabold num leading-none">{PAYOFF[c.k].months}<span className="text-[12px] font-bold text-muted ml-1">{lang === "hi" ? "mahine" : "months"}</span></p>
                  <p className="mt-2 text-[15px] font-extrabold num">{inr(PAYOFF[c.k].interest)}</p>
                  <p className="text-[11px] font-semibold text-muted">{lang === "hi" ? "kul byaaj" : "total interest"}</p>
                  {c.best && <p className="mt-1 text-[11px] font-bold text-leaf">✓ {lang === "hi" ? "Behtar" : "Better"}</p>}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[14px] font-extrabold text-leaf num">
              {t({
                hi: `${inr(PAYOFF.minimum.interest - PAYOFF.smart.interest)} byaaj bachega, ${PAYOFF.minimum.months - PAYOFF.smart.months} mahine pehle azaad`,
                en: `Save ${inr(PAYOFF.minimum.interest - PAYOFF.smart.interest)} interest, debt-free ${PAYOFF.minimum.months - PAYOFF.smart.months} months sooner`,
              })}
            </p>
          </>
        ) : (
          <p className="mt-4 mb-2 text-center text-[18px] font-extrabold">{t({ hi: "Koi mehenga karz nahi 🎉", en: "No costly debt 🎉" })}</p>
        )}
      </section>
    </div>
  );
}
