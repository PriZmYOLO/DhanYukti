"use client";
import { motion } from "motion/react";
import { useId } from "react";

/** Clay piggy-bank jar that fills with coins. fill: 0..1 */
export default function Gullak({ fill = 0.4, size = 96, tone = "clay" }: { fill?: number; size?: number; tone?: "clay" | "haldi" | "rose" }) {
  const id = useId().replace(/:/g, "");
  const f = Math.max(0, Math.min(1, fill));
  const body = { clay: ["#E58457", "#C4572B"], haldi: ["#F9CF5F", "#D9A21F"], rose: ["#F08DAE", "#C9467A"] }[tone];
  const top = 34, bottom = 112, level = bottom - (bottom - top) * f;
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 120 132" aria-hidden>
      <defs>
        <linearGradient id={`b${id}`} x1="0" x2="1"><stop offset="0" stopColor={body[0]} /><stop offset="1" stopColor={body[1]} /></linearGradient>
        <clipPath id={`c${id}`}><path d="M60 30c-30 0-48 20-48 46 0 30 20 46 48 46s48-16 48-46c0-26-18-46-48-46z" /></clipPath>
      </defs>
      <ellipse cx="60" cy="126" rx="38" ry="5" fill="#17153b" opacity=".12" />
      <path d="M60 30c-30 0-48 20-48 46 0 30 20 46 48 46s48-16 48-46c0-26-18-46-48-46z" fill={`url(#b${id})`} />
      <g clipPath={`url(#c${id})`}>
        <motion.g initial={{ y: 90 }} animate={{ y: level - 34 }} transition={{ type: "spring", stiffness: 60, damping: 14 }}>
          <rect x="0" y="34" width="120" height="100" fill="#F7C548" opacity=".95" />
          {[14, 30, 46, 62, 78, 94].map((x, i) => (
            <ellipse key={x} cx={x + (i % 2) * 4} cy={36 + (i % 3) * 2} rx="9" ry="4" fill="#E9AE1E" stroke="#C98F10" strokeWidth="1" />
          ))}
          <rect x="0" y="34" width="120" height="100" fill="url(#none)" />
        </motion.g>
        <rect x="0" y="0" width="120" height="132" fill={body[1]} opacity=".18" />
      </g>
      {/* glaze stripes */}
      <path d="M20 70q40 12 80 0" stroke="#fff" strokeOpacity=".35" strokeWidth="3" fill="none" />
      <path d="M22 88q38 12 76 0" stroke="#17153b" strokeOpacity=".18" strokeWidth="2" fill="none" strokeDasharray="2 5" />
      {/* neck + rim */}
      <path d="M40 34c4-8 36-8 40 0" fill={body[1]} />
      <rect x="38" y="18" width="44" height="16" rx="7" fill={body[1]} />
      <rect x="42" y="16" width="36" height="6" rx="3" fill={body[0]} />
      <rect x="50" y="24" width="20" height="4" rx="2" fill="#17153b" opacity=".7" />
      {/* shine */}
      <path d="M30 56c4-10 12-15 20-17" stroke="#fff" strokeOpacity=".7" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
