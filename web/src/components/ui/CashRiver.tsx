"use client";
import { motion } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { day, inrSigned } from "@/lib/format";
import type { River, RiverEvent } from "@/lib/types";

const W = 340, H = 200, TOP = 44, BOT = 176;

/**
 * 30-day projected balance. Green above the safety floor, amber between floor and zero, red below zero.
 * Scrub with a finger; drag a movable bill (e.g. school fee) to another day to ask E03 "what if".
 */
export default function CashRiver({ river, onMove, compact }: {
  river: River; onMove?: (ev: RiverEvent, newDate: string) => void; compact?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const { t, lang } = useApp();
  const svg = useRef<SVGSVGElement>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ ev: RiverEvent; from: number; x: number } | null>(null);
  const days = river.days;
  const n = days.length;

  const scale = useMemo(() => {
    const bals = days.map((d) => d.balance);
    const lo = Math.min(0, ...bals, river.floor) - 800;
    const rawHi = Math.max(...bals, river.floor);
    const cap = Math.max(river.floor * 2.5, Math.abs(Math.min(0, ...bals)) * 4, 10000);
    const hi = Math.min(rawHi, cap) + 600;
    const y = (v: number) => TOP + (BOT - TOP) * (1 - (Math.min(v, hi) - lo) / (hi - lo));
    return { lo, hi, y, clipped: rawHi > hi };
  }, [days, river.floor]);

  const x = (i: number) => 12 + (i / (n - 1)) * (W - 24);
  const pts = days.map((d, i) => [x(i), scale.y(d.balance)] as const);
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const zeroY = scale.y(0), floorY = scale.y(river.floor);
  const area = `${line} L${x(n - 1)},${zeroY} L${x(0)},${zeroY} Z`;
  const pct = (yv: number) => `${(((yv - TOP) / (BOT - TOP)) * 100).toFixed(2)}%`;

  const idxFromClient = (clientX: number) => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W;
    return Math.max(0, Math.min(n - 1, Math.round(((px - 12) / (W - 24)) * (n - 1))));
  };

  const markers = days.flatMap((d, i) => d.events.map((ev, k) => ({ ev, i, k })));
  const sel = scrub != null ? days[scrub] : null;

  return (
    <div className="relative select-none touch-none">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible"
        onPointerDown={(e) => { if (!drag) setScrub(idxFromClient(e.clientX)); }}
        onPointerMove={(e) => {
          if (drag) setDrag({ ...drag, x: idxFromClient(e.clientX) });
          else if (e.buttons || e.pointerType === "mouse") setScrub(idxFromClient(e.clientX));
        }}
        onPointerUp={() => {
          if (drag && onMove && drag.x !== drag.from) onMove(drag.ev, days[drag.x].date);
          setDrag(null);
        }}
        onPointerLeave={() => { setScrub(null); setDrag(null); }}>
        <defs>
          <linearGradient id={`ln${uid}`} x1="0" y1={TOP} x2="0" y2={BOT} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1F8A5B" /><stop offset={pct(floorY)} stopColor="#1F8A5B" />
            <stop offset={pct(floorY)} stopColor="#E89B1C" /><stop offset={pct(zeroY)} stopColor="#E89B1C" />
            <stop offset={pct(zeroY)} stopColor="#E0473E" /><stop offset="1" stopColor="#E0473E" />
          </linearGradient>
          <linearGradient id={`ar${uid}`} x1="0" y1={TOP} x2="0" y2={BOT} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1F8A5B" stopOpacity=".28" /><stop offset={pct(zeroY)} stopColor="#1F8A5B" stopOpacity=".04" />
            <stop offset={pct(zeroY)} stopColor="#E0473E" stopOpacity=".08" /><stop offset="1" stopColor="#E0473E" stopOpacity=".35" />
          </linearGradient>
        </defs>

        {/* floor + zero */}
        <line x1="8" x2={W - 8} y1={floorY} y2={floorY} stroke="#1F8A5B" strokeDasharray="4 5" strokeOpacity=".6" />
        <text x={W - 8} y={floorY - 5} textAnchor="end" fontSize="10" fontWeight="700" fill="#1F8A5B">{lang === "hi" ? "Safety floor" : "Safety floor"} ₹{river.floor.toLocaleString("en-IN")}</text>
        <line x1="8" x2={W - 8} y1={zeroY} y2={zeroY} stroke="#17153b" strokeOpacity=".25" />
        <text x="10" y={zeroY + 12} fontSize="10" fill="#6B6887">₹0</text>

        <motion.path d={area} fill={`url(#ar${uid})`} animate={{ d: area }} transition={{ duration: 0.6 }} />
        <motion.path d={line} fill="none" stroke={`url(#ln${uid})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" animate={{ d: line }} transition={{ duration: 0.6 }} />

        {/* the dip */}
        {river.gap > 0 && (() => {
          const i = days.findIndex((d) => d.date === river.min_date);
          if (i < 0) return null;
          return (<g>
            <circle cx={x(i)} cy={scale.y(river.min_balance)} r="6" fill="#E0473E" stroke="#fff" strokeWidth="2.5" />
            <motion.circle cx={x(i)} cy={scale.y(river.min_balance)} r="6" fill="none" stroke="#E0473E" animate={{ r: [6, 16], opacity: [0.8, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} />
          </g>);
        })()}
        {scale.clipped && (() => {
          const i = days.reduce((m, d, k) => (d.balance > days[m].balance ? k : m), 0);
          return <text x={Math.min(x(i) + 4, W - 60)} y={TOP - 2} fontSize="10" fontWeight="700" fill="#1F8A5B">↑ {inrSigned(days[i].balance)}</text>;
        })()}

        {/* event markers row */}
        {markers.map(({ ev, i, k }) => {
          const credit = ev.amount > 0;
          const at = drag?.ev.id === ev.id ? drag.x : i;
          const cy = 14 + k * 0;
          const cx = x(at) + k * 10;
          return (
            <g key={ev.id} style={{ cursor: ev.movable && onMove ? "grab" : "default" }}
              onPointerDown={(e) => { if (ev.movable && onMove) { e.stopPropagation(); (e.target as Element).setPointerCapture?.(e.pointerId); setDrag({ ev, from: i, x: i }); setScrub(null); } }}>
              <line x1={cx} x2={cx} y1={cy + 10} y2={BOT} stroke={credit ? "#1F8A5B" : "#17153b"} strokeOpacity=".12" />
              {ev.movable && onMove && <motion.circle cx={cx} cy={cy} r="15" fill="#F7C548" opacity=".45" animate={{ r: [13, 17, 13] }} transition={{ repeat: Infinity, duration: 1.8 }} />}
              <circle cx={cx} cy={cy} r={ev.movable ? 12 : 9.5} fill={credit ? "#1F8A5B" : ev.type === "fee" ? "#D96C3F" : ev.type === "emi" ? "#2E2A6B" : "#E0473E"} stroke="#fff" strokeWidth="2" />
              <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={ev.movable ? 11 : 9} fontWeight="800" fill="#fff">
                {credit ? "₹" : ev.type === "fee" ? "✎" : ev.type === "emi" ? "E" : ev.type === "bill" ? "⚡" : "−"}
              </text>
            </g>
          );
        })}

        {/* x labels */}
        {days.map((d, i) => (i % 5 === 0 || i === n - 1) && (
          <text key={d.date} x={x(i)} y={H - 4} textAnchor="middle" fontSize="10" fill="#6B6887">{day(d.date)}</text>
        ))}

        {/* scrub */}
        {sel && scrub != null && (<g>
          <line x1={x(scrub)} x2={x(scrub)} y1={TOP - 8} y2={BOT} stroke="#17153b" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx={x(scrub)} cy={scale.y(sel.balance)} r="6" fill="#17153b" stroke="#fff" strokeWidth="2" />
        </g>)}
        {drag && (<text x={x(drag.x)} y={TOP + 2} textAnchor="middle" fontSize="11" fontWeight="800" fill="#17153b">{day(days[drag.x].date)}</text>)}
      </svg>

      {sel && (
        <div className="pointer-events-none absolute -top-2 rounded-2xl bg-ink text-white px-3 py-2 text-xs shadow-lift"
          style={{ left: `clamp(0px, calc(${(x(scrub!) / W) * 100}% - 70px), calc(100% - 150px))`, width: 150 }}>
          <p className="opacity-70">{day(sel.date)}</p>
          <p className={`text-lg font-extrabold num ${sel.balance < 0 ? "text-[#ff8a80]" : sel.balance < river.floor ? "text-haldi" : "text-mint"}`}>{inrSigned(sel.balance)}</p>
          {sel.events.map((e) => <p key={e.id} className="opacity-80 truncate">{t(e.label)} {inrSigned(e.amount)}</p>)}
        </div>
      )}
      {!compact && (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-muted">
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-leaf" />{lang === "hi" ? "Surakshit" : "Safe"}</span>
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-amber" />{lang === "hi" ? "Floor se neeche" : "Below floor"}</span>
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-danger" />{lang === "hi" ? "Kami" : "Short"}</span>
        </div>
      )}
    </div>
  );
}
