"use client";
import { useEffect, useState } from "react";
import { UserPlus, Copy, MessageCircle, X } from "lucide-react";
import { Btn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { gov } from "@/lib/gov";
import type { Invite, InviteRole } from "@/lib/onboarding/answers";

/** Create a household invite (needs DPDP "member_profile"). */
export default function InviteBox({ enabled, onEnable }: { enabled: boolean; onEnable: () => void }) {
  const { t, lang } = useApp();
  const [role, setRole] = useState<InviteRole>("earning_adult");
  const [label, setLabel] = useState("");
  const [list, setList] = useState<Invite[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { if (enabled) gov.onboarding().then((r) => setList(r.invites)).catch(() => {}); }, [enabled]);
  const make = async () => {
    setErr(null);
    try { const inv = await gov.invite(role, label); setList((l) => [...l, inv]); setLabel(""); }
    catch (e) { setErr(e instanceof Error ? e.message : "error"); }
  };
  const url = (code: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/join/${code}`;
  const msg = (code: string) => lang === "hi"
    ? `DhanYukti par hamare parivaar mein judiye: ${url(code)} (code ${code}). Aapka data aapka rahega — jab tak aap khud consent na dein, kuch share nahi hota.`
    : `Join our family on DhanYukti: ${url(code)} (code ${code}). Your data stays yours — nothing is shared until you give your own consent.`;
  if (!enabled) return (
    <div className="mt-5 rounded-[24px] bg-white p-4 shadow-soft">
      <p className="text-sm">{t({ hi: "Invite banane ke liye 'Parivaar mein aapki profile' consent chahiye.", en: "Invites need the “Your profile in the household” consent." })}</p>
      <Btn variant="ink" className="w-full mt-3" onClick={onEnable}>{lang === "hi" ? "Consent dein" : "Give consent"}</Btn>
    </div>
  );
  return (
    <div className="mt-5 space-y-3">
      <div className="rounded-[24px] bg-white p-4 shadow-soft">
        <div className="grid grid-cols-2 gap-2">
          {([["earning_adult", "💼", "Kamaane wale", "Earning adult"], ["non_earning_adult", "🏠", "Ghar sambhaalne wale", "Non-earning adult"]] as const).map(([k, e, hi, en]) => (
            <button key={k} onClick={() => setRole(k)} className={`rounded-[18px] p-3 text-left ${role === k ? "bg-haldi" : "bg-lav"}`}><p className="text-xl">{e}</p><p className="text-[12px] font-bold leading-tight">{lang === "hi" ? hi : en}</p></button>
          ))}
        </div>
        <input value={label} maxLength={24} onChange={(e) => setLabel(e.target.value)} placeholder={lang === "hi" ? "Aap unhe kya kehte hain? (jaise Pati) — optional" : "What do you call them? (e.g. Husband) — optional"} className="mt-3 w-full rounded-[16px] bg-lav/60 px-3 min-h-12 text-[14px] outline-none" />
        <Btn variant="ink" className="w-full mt-3" onClick={make}><span className="inline-flex items-center gap-2"><UserPlus size={18} />{lang === "hi" ? "Invite banayein" : "Create invite"}</span></Btn>
        {err && <p className="mt-2 text-sm text-danger font-semibold">{err}</p>}
      </div>
      {list.filter((i) => i.status === "open").map((i) => (
        <div key={i.code} className="rounded-[24px] bg-ink text-white p-4">
          <div className="flex items-center gap-2"><p className="font-mono text-xl font-extrabold tracking-widest flex-1">{i.code}</p>
            <button aria-label="Cancel" onClick={() => gov.cancelInvite(i.code).then(() => setList((l) => l.map((x) => (x.code === i.code ? { ...x, status: "cancelled" } : x)))).catch(() => {})} className="grid place-items-center h-9 w-9 rounded-full bg-white/10"><X size={16} /></button></div>
          <p className="text-[12px] text-white/70">{i.label ? `${i.label} · ` : ""}{i.role === "earning_adult" ? (lang === "hi" ? "kamaane wale" : "earning adult") : (lang === "hi" ? "ghar sambhaalne wale" : "non-earning adult")} · {lang === "hi" ? "7 din tak" : "valid 7 days"}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(msg(i.code))}`} target="_blank" rel="noreferrer" className="min-h-11 rounded-[14px] bg-[#0E7A42] font-bold text-sm flex items-center justify-center gap-1.5"><MessageCircle size={16} />WhatsApp</a>
            <button onClick={() => { navigator.clipboard?.writeText(msg(i.code)).catch(() => {}); setCopied(i.code); }} className="min-h-11 rounded-[14px] bg-white/15 font-bold text-sm flex items-center justify-center gap-1.5"><Copy size={16} />{copied === i.code ? (lang === "hi" ? "Copy hua" : "Copied") : "Copy"}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
