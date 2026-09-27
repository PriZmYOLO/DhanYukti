"use client";
import { motion } from "motion/react";

/** Onboarding hero: a home with diya, gullak and falling coins. */
export default function HomeScene({ size = 280 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 300 270" aria-hidden>
      <circle cx="150" cy="140" r="118" fill="#fff" opacity=".6" />
      <circle cx="232" cy="58" r="22" fill="#F7C548" />
      <path d="M40 222h220" stroke="#17153b" strokeOpacity=".15" strokeWidth="6" strokeLinecap="round" />
      {/* house */}
      <path d="M70 120 150 62l80 58z" fill="#D96C3F" />
      <path d="M70 120 150 62l80 58" stroke="#B9552C" strokeWidth="6" strokeLinejoin="round" fill="none" />
      <rect x="84" y="118" width="132" height="104" rx="4" fill="#FFF7EA" />
      <rect x="132" y="160" width="36" height="62" rx="18" fill="#2E2A6B" />
      <rect x="98" y="138" width="24" height="24" rx="3" fill="#7FB4F0" /><rect x="178" y="138" width="24" height="24" rx="3" fill="#7FB4F0" />
      {/* toran */}
      <path d="M92 124q58 22 116 0" stroke="#1F8A5B" strokeWidth="3" fill="none" />
      {[104, 122, 140, 160, 178, 196].map((x, i) => <path key={x} d={`M${x} ${128 + (i === 0 || i === 5 ? 0 : 4)}l-5 9h10z`} fill={i % 2 ? "#F7C548" : "#E58457"} />)}
      {/* diya */}
      <path d="M108 222q12 12 24 0z" fill="#D96C3F" />
      <motion.path d="M120 206q-6 8 0 14 6-6 0-14z" fill="#F7C548" animate={{ scaleY: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ originX: "120px", originY: "220px" }} />
      {/* gullak */}
      <ellipse cx="206" cy="206" rx="22" ry="18" fill="#D96C3F" /><rect x="196" y="184" width="20" height="7" rx="3" fill="#B9552C" />
      {[0, 1, 2].map((i) => (
        <motion.g key={i} initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: [0, 1, 1, 0] }} transition={{ delay: i * 0.7, repeat: Infinity, repeatDelay: 1.4, duration: 1.4 }}>
          <circle cx="206" cy="176" r="8" fill="#F7C548" stroke="#C98F10" strokeWidth="1.5" />
          <text x="206" y="179.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#7a5500">₹</text>
        </motion.g>
      ))}
    </svg>
  );
}
