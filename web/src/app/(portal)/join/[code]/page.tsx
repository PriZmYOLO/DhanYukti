"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Users } from "lucide-react";
import HomeScene from "@/components/art/HomeScene";
import { LangToggle } from "@/components/TopBar";
import { Btn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { gov } from "@/lib/gov";

/**
 * Where an invite link lands, on the invited person's own phone. It shows
 * only the role and label the inviter chose. Joining = linking their OWN bank
 * (their own Anumati OTP) into that family's picture, at the level THEY choose.
 */
export default function Join({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { t, lang } = useApp();
  const [inv, setInv] = useState<{ role: string; label: string | null; expires_at: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { gov.lookupInvite(code).then(setInv).catch((e) => setErr(e instanceof Error ? e.message : "error")); }, [code]);
  return (
    <div className="min-h-full flex flex-col px-5 pb-8">
      <div className="flex justify-between items-center pt-5"><p className="text-sm font-bold text-muted">{"// DhanYukti"}</p><LangToggle /></div>
      <div className="grid place-items-center mt-6"><HomeScene size={180} /></div>
      <h1 className="mt-4 text-[30px] font-extrabold leading-tight">{t({ hi: "Aapko parivaar mein bulaaya gaya hai", en: "You're invited to a family" })}</h1>
      {inv && (
        <div className="mt-4 rounded-[24px] bg-white p-4 shadow-soft flex items-center gap-3">
          <Users />
          <p className="text-sm">{inv.label ? `“${inv.label}” · ` : ""}{inv.role === "earning_adult" ? t({ hi: "kamaane wale sadasya", en: "earning member" }) : t({ hi: "ghar sambhaalne wale sadasya", en: "non-earning member" })} · <span className="font-mono">{code}</span></p>
        </div>
      )}
      {err && <p className="mt-4 rounded-[20px] bg-danger-soft p-3 text-sm font-semibold text-danger">{err}</p>}
      <div className="mt-4 rounded-[24px] bg-mint/70 p-4 text-[14px] space-y-2">
        <p className="flex gap-2"><ShieldCheck size={18} className="text-leaf shrink-0" />{t({ hi: "Judne ka matlab: aap apna bank khaata is parivaar ke hisaab mein jodte hain — Anumati par apne OTP se, apni manzoori se.", en: "Joining means linking your own bank account into this family's picture — approved by you at Anumati, with your own OTP." })}</p>
        <p className="flex gap-2"><ShieldCheck size={18} className="text-leaf shrink-0" />{t({ hi: "Parivaar ko utna hi dikhega jitna aap chunein: Poora, Sirf total (kise diya nahi dikhta) ya Private.", en: "The family sees only what you choose: Full, Totals only (who was paid stays hidden) or Private." })}</p>
        <p className="flex gap-2"><ShieldCheck size={18} className="text-leaf shrink-0" />{t({ hi: "Aapke jawaab aur bachat aapke hi rehte hain. Kabhi bhi kam dikhayein ya band karein.", en: "Your answers and savings stay yours. Show less, or stop, anytime." })}</p>
      </div>
      <div className="flex-1" />
      <Btn variant="ink" className="w-full mt-6" disabled={!inv} onClick={() => router.push(`/?step=consent&invite=${encodeURIComponent(code.toUpperCase())}`)}>{lang === "hi" ? "Apna bank jodein →" : "Link my bank →"}</Btn>
      <button onClick={() => router.push("/")} className="mt-2 w-full min-h-11 text-sm font-bold text-muted">{lang === "hi" ? "Abhi nahi — pehle app dekhein" : "Not now — look around first"}</button>
    </div>
  );
}
