"use client";
import { useRouter } from "next/navigation";
import Avatar from "@/components/art/Avatar";
import { useApp } from "@/lib/store";
import { usePreview } from "@/lib/frame";
import type { AvatarKind } from "@/lib/types";

const HOMES: { id: string; name: string; city: string; avatar: AvatarKind; hi: string; en: string }[] = [
  { id: "A", name: "Sunita", city: "Panipat", avatar: "woman", hi: "₹3,000 kam, 28 ko", en: "₹3,000 short on 28th" },
  { id: "B", name: "Farida", city: "Indore", avatar: "woman", hi: "Bima nahi", en: "No insurance" },
  { id: "C", name: "Meena", city: "Coimbatore", avatar: "woman", hi: "₹52,000 bekaar", en: "₹52,000 idle" },
];

/** Jump straight into one of the three demo households. */
export default function DemoHouseholds({ compact, cards }: { compact?: boolean; cards?: boolean }) {
  const router = useRouter();
  const { setHid, setOnboarded, lang } = useApp();
  const pv = usePreview();
  // On the landing page (tablet/laptop) the household opens inside the phone; on a real phone, full screen.
  const open = (id: string) => {
    if (pv && window.matchMedia("(min-width: 640px)").matches) { pv.setPreview(id); return; }
    setHid(id); setOnboarded(true); router.push("/app");
  };
  const active = pv?.preview;
  if (cards) return (
    <div className="grid grid-cols-3 gap-3">
      {HOMES.map((h) => (
        <button key={h.id} onClick={() => open(h.id)}
          className={`group rounded-[24px] bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift active:scale-[.98] ${active === h.id ? "ring-2 ring-ink" : ""}`}>
          <Avatar kind={h.avatar} size={40} />
          <p className="mt-3 font-extrabold">{h.name}</p>
          <p className="text-xs text-muted">{h.city}</p>
          <p className="mt-2 text-[12px] font-semibold text-clay leading-snug">{lang === "hi" ? h.hi : h.en}</p>
          <p className="mt-3 text-xs font-bold text-ink/60 group-hover:text-ink">{active === h.id ? (lang === "hi" ? "Phone mein khula ✓" : "Open in phone ✓") : (lang === "hi" ? "Phone mein dekhein →" : "View in phone →")}</p>
        </button>
      ))}
    </div>
  );
  return (
    <div>
      <p className="text-xs font-bold text-muted mb-2">{lang === "hi" ? "Demo parivaar dekhein" : "Try a demo household"}</p>
      <div className={compact ? "grid grid-cols-3 gap-2" : "space-y-2"}>
        {HOMES.map((h) => (
          <button key={h.id} onClick={() => open(h.id)}
            className={`rounded-[20px] bg-white shadow-soft text-left active:scale-[.97] transition hover:ring-2 hover:ring-ink ${compact ? "p-2.5" : "flex items-center gap-3 p-3 w-full"}`}>
            <Avatar kind={h.avatar} size={compact ? 32 : 40} />
            <span className={compact ? "block mt-1" : "flex-1"}>
              <span className="block text-sm font-extrabold">{h.name}</span>
              <span className="block text-[11px] text-muted">{h.city}</span>
              {!compact && <span className="block text-[12px] font-semibold text-clay">{lang === "hi" ? h.hi : h.en}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
