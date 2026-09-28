"use client";
import { Ban, Fingerprint, Landmark, ShieldCheck } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import CoverCheck from "@/components/gov/CoverCheck";
import SurakshaCheck from "@/components/gov/SurakshaCheck";
import { useApp } from "@/lib/store";
import type { L } from "@/lib/types";

/**
 * "Suraksha plan": the firewall made visible. Public schemes first (Jan
 * Suraksha, from the member's own live bank link), then the family cover
 * engine: the gap, the cover specification to take to Bima Sugam, the
 * rules behind every number ("Why this?"), and the ruleset version and
 * input hash that let anyone reproduce the result. The engine never sees
 * an insurer, a product, a price or a commission.
 */
const FIREWALL: { Icon: typeof Ban; l: L }[] = [
  { Icon: Ban, l: { hi: "Engine ko kisi bima company, product, daam ya commission ka pata nahi", en: "The engine never sees an insurer, product, price or commission" } },
  { Icon: Fingerprint, l: { hi: "Har nateeje par niyam ka version aur input ka hash — wahi input, wahi jawaab", en: "Every result carries its rules version and an input hash — same inputs, same answer" } },
  { Icon: Landmark, l: { hi: "Pehle sarkari yojana; specification Bima Sugam (IRDAI) ya kisi bhi insurer ke paas le jaayein", en: "Government schemes first; take the specification to Bima Sugam (IRDAI) or any insurer" } },
  { Icon: ShieldCheck, l: { hi: "DhanYukti koi policy nahi bechta, aapke chunav se kuch nahi kamaata", en: "DhanYukti sells no policy and earns nothing from your choice" } },
];

export default function SurakshaPlanSheet({ open, onClose, onTileDetails }: { open: boolean; onClose: () => void; onTileDetails: () => void }) {
  const { t, lang } = useApp();
  return (
    <Sheet open={open} onClose={onClose} title={
      <div>
        <p className="text-[12px] font-extrabold uppercase tracking-widest text-leaf">{lang === "hi" ? "Suraksha plan" : "Suraksha plan · family cover"}</p>
        <p className="text-xl font-extrabold leading-tight">{t({ hi: "Parivaar ko kitna bima chahiye — bina bechne ke", en: "How much cover your family needs — with nothing to sell" })}</p>
      </div>
    }>
      {open && (
        <div className="space-y-4">
          <section aria-label={t({ hi: "Firewall", en: "Firewall" })} className="rounded-[24px] bg-ink text-white p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-haldi">{t({ hi: "Firewall", en: "Firewall" })}</p>
            <ul className="mt-2 space-y-2 text-[13px] leading-snug">
              {FIREWALL.map(({ Icon, l }, i) => (
                <li key={i} className="flex gap-2"><Icon size={16} className="text-haldi shrink-0 mt-0.5" aria-hidden /><span>{t(l)}</span></li>
              ))}
            </ul>
          </section>

          <div>
            <p className="px-1 mb-2 text-[13px] font-extrabold">{t({ hi: "1 · Sarkari bima — aapke bank data se", en: "1 · Government schemes — from your bank data" })}</p>
            <div className="-mx-5"><SurakshaCheck /></div>
          </div>

          <div>
            <p className="px-1 mb-2 text-[13px] font-extrabold">{t({ hi: "2 · Kami aur bima specification", en: "2 · Your gap and cover specification" })}</p>
            <div className="-mx-5"><CoverCheck /></div>
          </div>

          <button type="button" onClick={onTileDetails} className="w-full min-h-11 text-[13px] font-bold text-muted underline">
            {t({ hi: "\"Bima\" tile kaise bana, aur use theek karein", en: "How the Cover tile is worked out, and correct it" })}
          </button>
        </div>
      )}
    </Sheet>
  );
}
