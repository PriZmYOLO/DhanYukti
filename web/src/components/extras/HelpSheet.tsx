"use client";
import { PhoneCall, ExternalLink } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { useApp } from "@/lib/store";
import { primaryMember } from "@/lib/format";
import { GRIEVANCE_EMAIL, OFFICIAL_ROUTES, SUPPORT_PHONE, supportTel } from "@/lib/support";

/**
 * Madad. Only real routes: a call to the configured support number (a tel: link — nothing is
 * "requested" that no one will act on), the configured grievance contact, and RBI's own portals.
 */
export default function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, t, lang } = useApp();
  const name = primaryMember(data)?.name ?? "";
  return (
    <Sheet open={open} onClose={onClose} title={<p className="text-xl font-extrabold">{lang === "hi" ? "Madad" : "Help"}</p>}>
      {supportTel ? (
        <div className="rounded-[24px] bg-white p-4">
          <p className="font-bold flex items-center gap-2"><PhoneCall size={18} />{t({ hi: name ? `${name} ji, hamein call karein` : "Hamein call karein", en: name ? `${name}, call us` : "Call us" })}</p>
          <a href={supportTel} className="mt-3 flex items-center justify-center gap-2 min-h-12 rounded-[18px] bg-ink text-white font-bold num">{SUPPORT_PHONE}</a>
        </div>
      ) : (
        <div className="rounded-[24px] bg-white p-4 text-[14px]">
          <p className="font-bold flex items-center gap-2"><PhoneCall size={18} />{t({ hi: "Phone line abhi nahi hai", en: "No phone line yet" })}</p>
          <p className="mt-1 text-muted">{t({ hi: "Is pilot mein DhanYukti ki phone ya callback seva abhi shuru nahi hui. App mein 'Poochho' se sawaal poochh sakte hain.", en: "In this pilot, DhanYukti doesn't have a phone or callback service yet. You can ask questions in the app's 'Ask' tab." })}</p>
        </div>
      )}
      <p className="mt-5 mb-2 text-xs font-bold uppercase tracking-widest text-muted">{lang === "hi" ? "Shikayat" : "Grievance"}</p>
      <div className="space-y-2">
        <div className="rounded-[20px] bg-white p-3 text-sm"><b>{lang === "hi" ? "Grievance officer" : "Grievance officer"}</b>
          <p className="text-muted">{GRIEVANCE_EMAIL
            ? <a href={`mailto:${GRIEVANCE_EMAIL}`} className="underline">{GRIEVANCE_EMAIL}</a>
            : t({ hi: "Is pilot mein abhi niyukt nahi. Apna data kabhi bhi Settings → Mera data se mita sakte hain.", en: "Not yet appointed in this pilot. You can delete your data anytime in Settings → My data." })}</p>
        </div>
        <p className="px-1 pt-1 text-[12px] text-muted">{t({ hi: "Bank, lender ya NBFC ki shikayat:", en: "A complaint about a bank, lender or NBFC:" })}</p>
        {OFFICIAL_ROUTES.map(({ label: l, url: u }) => (
          <a key={u} href={u} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-[20px] bg-white p-3 min-h-12 text-sm font-bold"><ExternalLink size={16} />{l}</a>
        ))}
      </div>
    </Sheet>
  );
}
