"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useApp } from "@/lib/store";

const COLORS = ["#F7C548", "#D96C3F", "#F7C6D6", "#1F8A5B", "#2E2A6B", "#BFE8D2"];

export default function Celebration() {
  const { celebration, celebrate, t, lang } = useApp();
  useEffect(() => {
    if (!celebration) return;
    const id = setTimeout(() => celebrate(null), celebration.badge ? 4200 : 2400);
    return () => clearTimeout(id);
  }, [celebration, celebrate]);
  return (
    <AnimatePresence>
      {celebration && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => celebrate(null)}>
          {Array.from({ length: 36 }).map((_, i) => (
            <motion.span key={i} className="absolute top-1/2 left-1/2 h-2.5 w-1.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: Math.cos(i * 0.52) * (120 + (i % 5) * 30), y: Math.sin(i * 0.52) * (160 + (i % 4) * 30) + 80, rotate: i * 40, opacity: 0 }}
              transition={{ duration: 1.4, ease: "easeOut" }} />
          ))}
          <motion.div className="relative mx-8 rounded-[32px] bg-cream p-6 text-center shadow-lift" initial={{ scale: 0.6, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
            {celebration.badge ? (
              <>
                <div className="mx-auto grid place-items-center h-24 w-24 rounded-full bg-haldi text-5xl shadow-soft">{celebration.badge.icon}</div>
                <p className="mt-3 text-xs font-bold uppercase tracking-widest text-clay">{lang === "hi" ? "Naya badge!" : "New badge!"}</p>
                <p className="text-2xl font-extrabold">{t(celebration.badge.name)}</p>
                <p className="text-sm text-muted mt-1">{t(celebration.badge.desc)}</p>
              </>
            ) : (
              <p className="text-lg font-bold">{t(celebration.title)}</p>
            )}
            {celebration.points > 0 && (
              <motion.p className="mt-3 text-4xl font-extrabold text-leaf num" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 0.2 }}>
                +{celebration.points} <span className="text-base font-bold text-muted">Paisa Points</span>
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
