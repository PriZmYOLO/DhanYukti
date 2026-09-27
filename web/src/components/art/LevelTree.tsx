"use client";
import { motion } from "motion/react";

/** Beej → Ankur → Paudha → Ped → Bargad */
export default function LevelTree({ level, size = 140 }: { level: number; size?: number }) {
  const grow = { initial: { scale: 0.6, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: "spring" as const, stiffness: 120, damping: 12 } };
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" aria-hidden>
      <ellipse cx="70" cy="124" rx="52" ry="10" fill="#8B5A3C" opacity=".25" />
      <path d="M22 124q48-14 96 0" fill="#8B5A3C" opacity=".55" />
      <motion.g style={{ originX: "70px", originY: "124px" }} {...grow} key={level}>
        {level === 1 && <ellipse cx="70" cy="116" rx="10" ry="7" fill="#8B5A3C" />}
        {level === 1 && <path d="M70 110c0-6 4-9 8-10" stroke="#2FA877" strokeWidth="3" fill="none" strokeLinecap="round" />}
        {level === 2 && <g><path d="M70 122V96" stroke="#1F8A5B" strokeWidth="4" strokeLinecap="round" /><path d="M70 104c-14 0-20-8-20-16 12 0 20 6 20 16z" fill="#2FA877" /><path d="M70 98c12 0 18-8 18-15-11 0-18 6-18 15z" fill="#4CC38A" /></g>}
        {level === 3 && <g><path d="M70 122V70" stroke="#6B4A2E" strokeWidth="6" strokeLinecap="round" /><circle cx="70" cy="66" r="22" fill="#2FA877" /><circle cx="54" cy="80" r="14" fill="#4CC38A" /><circle cx="86" cy="80" r="14" fill="#1F8A5B" /></g>}
        {level === 4 && <g><path d="M70 122V60" stroke="#6B4A2E" strokeWidth="9" strokeLinecap="round" /><path d="M70 86 52 72M70 80l18-14" stroke="#6B4A2E" strokeWidth="5" strokeLinecap="round" /><circle cx="70" cy="46" r="28" fill="#1F8A5B" /><circle cx="46" cy="62" r="20" fill="#2FA877" /><circle cx="94" cy="60" r="20" fill="#4CC38A" /><circle cx="60" cy="40" r="4" fill="#E0473E" /><circle cx="84" cy="50" r="4" fill="#E0473E" /></g>}
        {level >= 5 && <g><path d="M70 122V56" stroke="#6B4A2E" strokeWidth="12" strokeLinecap="round" />{[36, 50, 90, 104].map((x) => <path key={x} d={`M${x} 70v52`} stroke="#8B5A3C" strokeWidth="2.5" />)}<ellipse cx="70" cy="50" rx="58" ry="30" fill="#1F8A5B" /><ellipse cx="44" cy="44" rx="26" ry="20" fill="#2FA877" /><ellipse cx="96" cy="42" rx="26" ry="20" fill="#4CC38A" /><ellipse cx="70" cy="30" rx="26" ry="18" fill="#2FA877" /></g>}
      </motion.g>
    </svg>
  );
}
