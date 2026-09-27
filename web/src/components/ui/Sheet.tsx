"use client";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useInFrame } from "@/lib/frame";

/** Bottom sheet — stays inside the phone frame (frame is the containing block). */
export default function Sheet({ open, onClose, children, tone = "white", title }: {
  open: boolean; onClose: () => void; children: React.ReactNode; tone?: "white" | "ink"; title?: React.ReactNode;
}) {
  const inFrame = useInFrame();
  const wide = !inFrame;
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-ink/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <div className={`fixed inset-0 z-50 flex items-end justify-center pointer-events-none ${wide ? "lg:items-center lg:p-6" : ""}`}>
          <motion.div
            className={`pointer-events-auto w-full max-h-[88%] overflow-y-auto no-scrollbar rounded-t-[32px] px-5 pt-3 pb-8 ${wide ? "sm:max-w-lg lg:rounded-[32px] lg:max-h-[85vh]" : ""} ${tone === "ink" ? "bg-ink text-white" : "bg-cream"}`}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 280 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (i.offset.y > 120) onClose(); }}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-current opacity-20" />
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">{title}</div>
              <button onClick={onClose} aria-label="Band karein / Close" className="grid place-items-center h-11 w-11 rounded-full bg-current/10 shrink-0"><X size={20} /></button>
            </div>
            {children}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
