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
 * Where an invite link lands. Shows only the role and label the inviter
 * chose; joining shares nothing until this person gives their own consents.
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
        <p className="flex gap-2"><ShieldCheck size={18} className="text-leaf shrink-0" />{t({ hi: "Judne se kuch share nahi hota. Aapka bank data, bachat aur jawaab aapke hain.", en: "Joining shares nothing. Your bank data, savings and answers stay yours." })}</p>
        <p className="flex gap-2"><ShieldCheck size={18} className="text-leaf shrink-0" />{t({ hi: "Har permission aap khud dete hain — aur kabhi bhi band kar sakte hain.", en: "You give every permission yourself — and can stop any of them anytime." })}</p>
      </div>
      <div className="flex-1" />
      <Btn variant="ink" className="w-full mt-6" disabled={!inv} onClick={() => router.push("/")}>{lang === "hi" ? "Shuru karein →" : "Get started →"}</Btn>
    </div>
  );
}
