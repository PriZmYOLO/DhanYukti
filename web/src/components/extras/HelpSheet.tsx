"use client";
import { useState } from "react";
import { PhoneCall, ExternalLink, Check } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { Btn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { primaryMember } from "@/lib/format";

/** Madad: callback request + grievance route. */
export default function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, t, lang } = useApp();
  const [slot, setSlot] = useState("subah");
  const [sent, setSent] = useState(false);
  const name = primaryMember(data)?.name ?? "";
  const slots = [["subah", "Subah", "Morning"], ["dopahar", "Dopahar", "Afternoon"], ["shaam", "Shaam", "Evening"]];
  return (
    <Sheet open={open} onClose={() => { setSent(false); onClose(); }} title={<p className="text-xl font-extrabold">{lang === "hi" ? "Madad" : "Help"}</p>}>
      {sent ? (
        <div className="rounded-[24px] bg-mint p-5 text-center">
          <span className="mx-auto grid place-items-center h-12 w-12 rounded-full bg-leaf text-white"><Check /></span>
          <p className="mt-3 font-extrabold">{t({ hi: "Bank mitra 10 minute mein call karenge", en: "A bank mitra will call within 10 minutes" })}</p>
        </div>
      ) : (
        <div className="rounded-[24px] bg-white p-4">
          <p className="font-bold flex items-center gap-2"><PhoneCall size={18} />{t({ hi: `${name} ji, callback kab chahiye?`, en: `${name}, when should we call?` })}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {slots.map(([k, hi, en]) => <button key={k} onClick={() => setSlot(k)} className={`min-h-11 rounded-full text-sm font-bold ${slot === k ? "bg-ink text-white" : "bg-lav"}`}>{lang === "hi" ? hi : en}</button>)}
          </div>
          <Btn variant="ink" className="w-full mt-3" onClick={() => setSent(true)}>{lang === "hi" ? "Call karwao" : "Request callback"}</Btn>
        </div>
      )}
      <p className="mt-5 mb-2 text-xs font-bold uppercase tracking-widest text-muted">{lang === "hi" ? "Shikayat" : "Grievance"}</p>
      <div className="space-y-2">
        <div className="rounded-[20px] bg-white p-3 text-sm"><b>{lang === "hi" ? "Grievance officer" : "Grievance officer"}</b><p className="text-muted">grievance@dhanyukti.example</p></div>
        {[["RBI Sachet", "https://sachet.rbi.org.in"], ["RBI Ombudsman (CMS)", "https://cms.rbi.org.in"]].map(([l, u]) => (
          <a key={u} href={u} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-[20px] bg-white p-3 min-h-12 text-sm font-bold"><ExternalLink size={16} />{l}</a>
        ))}
        <p className="text-center text-sm text-muted pt-1">1800-000-000 (demo)</p>
      </div>
    </Sheet>
  );
}
