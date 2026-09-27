"use client";
import { MessageCircle } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { useApp } from "@/lib/store";
import { day } from "@/lib/format";
import type { ConsentArtefact } from "@/lib/types";

export default function ConsentReceipt({ c, onClose }: { c: ConsentArtefact | null; onClose: () => void }) {
  const { t, lang } = useApp();
  if (!c) return null;
  const text = lang === "hi"
    ? `DhanYukti consent receipt\nKiska: ${c.member_name}\nKya: ${c.fi_types.join(", ")} (${c.range_months} mahine)\nKyon: ${c.purpose.hi}\nKab tak: ${day(c.expiry)}\nKaun sambhaalta hai: ${c.aa} (Account Aggregator)\nBand karne ke liye: DhanYukti > Parivaar > Consent Passport\nID: ${c.handle}`
    : `DhanYukti consent receipt\nWhose: ${c.member_name}\nWhat: ${c.fi_types.join(", ")} (${c.range_months} months)\nWhy: ${c.purpose.en}\nUntil: ${day(c.expiry)}\nHandled by: ${c.aa} (Account Aggregator)\nTo revoke: DhanYukti > Family > Consent Passport\nID: ${c.handle}`;
  return (
    <Sheet open={!!c} onClose={onClose} title={<p className="text-xl font-extrabold">{lang === "hi" ? "Consent ki raseed" : "Consent receipt"}</p>}>
      <div className="rounded-[24px] bg-white p-5 border-2 border-dashed border-ink/15">
        <div className="flex items-center justify-between"><p className="font-extrabold">DhanYukti</p><span className="text-[11px] font-bold rounded-full bg-mint px-2 py-0.5">{c.status}</span></div>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-[13px] leading-relaxed">{text}</pre>
      </div>
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 min-h-14 rounded-[20px] bg-[#0E7A42] text-white font-bold">
        <MessageCircle size={20} />{t({ hi: "WhatsApp par bhejo", en: "Send on WhatsApp" })}
      </a>
    </Sheet>
  );
}
