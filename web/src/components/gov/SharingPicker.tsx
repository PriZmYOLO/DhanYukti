"use client";
import { EyeOff, Eye, Sigma } from "lucide-react";
import { useApp } from "@/lib/store";
import { SHARING_TEXT } from "@/lib/aa-live";
import { SHARING_ORDER, type Sharing } from "@/lib/provisional/h03/types";

const ICON = { poora: Eye, sirf_total: Sigma, private: EyeOff } as const;

/**
 * Poora / Sirf total / Private for one member's account. `value` null = not chosen yet
 * (no default: the account's owner decides). `stricterOnly` (an existing link) disables
 * the levels that would show MORE than now — those need the owner to link again.
 */
export default function SharingPicker({ value, onChange, stricterOnly = false, compact = false }: {
  value: Sharing | null;
  onChange: (s: Sharing) => void;
  stricterOnly?: boolean;
  compact?: boolean;
}) {
  const { t } = useApp();
  const now = value ? SHARING_ORDER.indexOf(value) : -1;
  return (
    <div role="radiogroup" className={compact ? "grid grid-cols-3 gap-1 rounded-full bg-lav p-1" : "space-y-2"}>
      {SHARING_ORDER.map((k, i) => {
        const Icon = ICON[k];
        const on = value === k;
        const locked = stricterOnly && i < now;
        if (compact) {
          return (
            <button key={k} role="radio" aria-checked={on} disabled={locked} onClick={() => onChange(k)}
              title={t(SHARING_TEXT[k].what)}
              className={`min-h-11 rounded-full text-[12px] font-bold ${on ? "bg-ink text-white" : locked ? "text-muted/40" : "text-muted"}`}>
              {t(SHARING_TEXT[k].name)}
            </button>
          );
        }
        return (
          <button key={k} role="radio" aria-checked={on} disabled={locked} onClick={() => onChange(k)}
            className={`w-full flex items-start gap-3 rounded-[20px] p-3 text-left min-h-14 ${on ? "bg-ink text-white" : "bg-lav/60"} ${locked ? "opacity-40" : ""}`}>
            <Icon size={20} className="shrink-0 mt-0.5" />
            <span><span className="block font-extrabold text-[15px]">{t(SHARING_TEXT[k].name)}</span>
              <span className={`block text-[12px] ${on ? "text-white/80" : "text-muted"}`}>{t(SHARING_TEXT[k].what)}</span></span>
          </button>
        );
      })}
    </div>
  );
}
