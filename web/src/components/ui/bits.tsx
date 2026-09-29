"use client";
import { useState } from "react";
import HelpSheet from "@/components/extras/HelpSheet";
import { Volume2, VolumeX, CircleCheck, CircleAlert, OctagonAlert, LifeBuoy } from "lucide-react";
import { useApp } from "@/lib/store";
import type { Confidence, L, Status } from "@/lib/types";

/** Primary text in the chosen language, the other language small underneath. */
/** Secondary-language subtitle only when explicitly asked for (keeps screens uncluttered). */
export function Bi({ v, className = "", subClass = "", showSub }: { v: L | undefined; className?: string; subClass?: string; showSub?: boolean }) {
  const { t, sub } = useApp();
  return (
    <span className="block">
      <span className={`block ${className}`}>{t(v)}</span>
      {showSub && sub(v) && <span className={`block text-[12px] opacity-60 mt-0.5 leading-snug ${subClass}`}>{sub(v)}</span>}
    </span>
  );
}

export function SpeakBtn({ v, dark, size = 44 }: { v: L | string; dark?: boolean; size?: number }) {
  const { speak, speaking } = useApp();
  return (
    <button onClick={(e) => { e.stopPropagation(); speak(v); }} aria-label="Sunein / Listen"
      className={`grid place-items-center rounded-full shrink-0 ${dark ? "bg-white/15 text-white" : "bg-white text-ink shadow-soft"}`} style={{ height: Math.max(44, size), width: Math.max(44, size) }}>
      {speaking ? <VolumeX size={size * 0.45} /> : <Volume2 size={size * 0.45} />}
    </button>
  );
}

const STATUS: Record<Status, { hi: string; en: string; cls: string; Icon: typeof CircleCheck }> = {
  green: { hi: "Surakshit", en: "Safe", cls: "bg-mint text-[#135E3D]", Icon: CircleCheck },
  amber: { hi: "Dhyaan dein", en: "Watch", cls: "bg-amber-soft text-[#9a5f00]", Icon: CircleAlert },
  red: { hi: "Abhi karein", en: "Act now", cls: "bg-danger-soft text-[#A8251C]", Icon: OctagonAlert },
};
export function StatusPill({ s, small }: { s: Status; small?: boolean }) {
  const { lang } = useApp();
  const { cls, Icon } = STATUS[s];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold ${cls} ${small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"}`}>
      <Icon size={small ? 12 : 14} strokeWidth={2.6} />{STATUS[s][lang]}
    </span>
  );
}

const CONF: Record<Confidence, L & { dot: string }> = {
  pakka: { hi: "Pakka", en: "Confirmed", dot: "bg-leaf" },
  andaaza: { hi: "Andaaza", en: "Estimate", dot: "bg-amber" },
  pata_nahi: { hi: "Pata nahi", en: "Unknown", dot: "bg-muted" },
};
export function ConfTag({ c, dark }: { c: Confidence; dark?: boolean }) {
  const { lang } = useApp();
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${dark ? "text-white/70" : "text-muted"}`}>
      <span className={`h-2 w-2 rounded-full ${CONF[c].dot}`} />{CONF[c][lang]}
    </span>
  );
}

export function SectionTitle({ v, right }: { v: L; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between px-5 lg:px-0 mt-7 mb-3">
      <Bi v={v} className="text-[19px] font-extrabold tracking-tight" />
      {right}
    </div>
  );
}

export function HelpLink({ compact }: { compact?: boolean }) {
  const { t, lang } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      {compact ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 min-h-11 text-xs font-bold shadow-soft">
          <LifeBuoy size={16} />{lang === "hi" ? "Madad chahiye?" : "Need help?"}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="mx-5 lg:mx-0 mt-8 w-[calc(100%-2.5rem)] lg:w-full flex items-center gap-3 rounded-[24px] bg-white/70 border border-white px-4 py-3 min-h-14 text-left">
          <span className="grid place-items-center h-10 w-10 rounded-full bg-lav"><LifeBuoy size={20} /></span>
          <span className="flex-1 text-sm font-semibold">{t({ hi: "Madad chahiye? Madad aur shikayat ke raaste", en: "Need help? Help and complaint routes" })}</span>
        </button>
      )}
      <HelpSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function Skeleton({ h = 120, className = "" }: { h?: number; className?: string }) {
  return <div className={`skeleton rounded-[28px] ${className}`} style={{ height: h }} />;
}

export function Btn({ children, onClick, variant = "haldi", className = "", disabled, type = "button" }: {
  children: React.ReactNode; onClick?: () => void; variant?: "haldi" | "ink" | "ghost" | "white" | "clay" | "danger"; className?: string; disabled?: boolean; type?: "button" | "submit";
}) {
  const v = {
    haldi: "bg-haldi text-ink", ink: "bg-ink text-white", ghost: "bg-current/10", white: "bg-white text-ink shadow-soft",
    clay: "bg-[#B4502A] text-white", danger: "bg-danger text-white",
  }[variant];
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`min-h-13 rounded-[20px] px-5 py-3.5 font-bold text-[15px] active:scale-[.97] transition disabled:opacity-40 ${v} ${className}`}>
      {children}
    </button>
  );
}
