"use client";
import { motion } from "motion/react";
import type { Status } from "@/lib/types";

/** Speedometer dial. `ratio` 0..1 is visual only — the rupee value comes from the API. */
export default function SafeDial({ status, size = 150 }: { status: Status; size?: number }) {
  const ratio = { red: 0.1, amber: 0.5, green: 0.86 }[status];
  const r = 60, cx = 75, cy = 72, len = Math.PI * r;
  const ang = Math.PI * (1 - ratio);
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 150 90" aria-hidden>
      <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`} stroke="#EFEAF7" strokeWidth="14" fill="none" strokeLinecap="round" />
      {[["#E0473E", 0, 0.33], ["#E89B1C", 0.33, 0.66], ["#1F8A5B", 0.66, 1]].map(([c, a, b]) => (
        <path key={c as string} d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`} stroke={c as string} strokeWidth="14" fill="none"
          strokeDasharray={`${len * ((b as number) - (a as number)) - 3} ${len}`} strokeDashoffset={-len * (a as number)} opacity=".9" />
      ))}
      <motion.g initial={{ rotate: -90 }} animate={{ rotate: 90 - (ang * 180) / Math.PI }} transition={{ type: "spring", stiffness: 60, damping: 10 }} style={{ originX: `${cx}px`, originY: `${cy}px` }}>
        <path d={`M${cx - 3},${cy} L${cx},${cy - r + 14} L${cx + 3},${cy} Z`} fill="#17153b" />
      </motion.g>
      <circle cx={cx} cy={cy} r="7" fill="#17153b" /><circle cx={cx} cy={cy} r="3" fill="#F7C548" />
    </svg>
  );
}
