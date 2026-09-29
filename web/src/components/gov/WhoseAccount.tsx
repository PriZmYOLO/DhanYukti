"use client";
import { Users, User } from "lucide-react";
import { useApp } from "@/lib/store";
import SharingPicker from "@/components/gov/SharingPicker";
import type { Sharing } from "@/lib/provisional/h03/types";

export type Whose = {
  who: "self" | "family";
  relation: string;
  role: "earning_adult" | "non_earning_adult";
  sharing: Sharing | null;
  /** The family member's bank-registered mobile: Anumati sends THEM the OTP. */
  mobile: string;
};
export const SELF_WHOSE: Whose = { who: "self", relation: "", role: "earning_adult", sharing: null, mobile: "" };

/** "Whose account is this?" — asked at every bank link, so one phone can hold a whole household. */
export default function WhoseAccount({ v, set, invite }: {
  v: Whose;
  set: (w: Whose) => void;
  /** Linking from an invite: it's the person's own account, joining that family's picture. */
  invite: { label: string | null; role: string } | null;
}) {
  const { t, lang } = useApp();
  if (invite) {
    return (
      <div className="mt-4 rounded-[28px] bg-white p-4 shadow-soft">
        <p className="flex items-center gap-2 font-extrabold text-[16px]"><Users size={20} />{t({ hi: "Aap ek parivaar se jud rahe hain", en: "You're joining a family" })}</p>
        <p className="mt-1 text-[13px] text-muted">{invite.label ? `“${invite.label}” · ` : ""}{t({ hi: "Aapka apna khaata, aapka apna OTP. Parivaar ko utna hi dikhega jitna aap chunein:", en: "Your own account, your own OTP. The family sees only as much as you choose:" })}</p>
        <div className="mt-3"><SharingPicker value={v.sharing} onChange={(s) => set({ ...v, sharing: s })} /></div>
        <p className="mt-2 text-[12px] text-muted">{t({ hi: "Aap khud apna poora hisaab dekhenge. Baad mein kabhi bhi kam kar sakte hain ya band kar sakte hain.", en: "You'll see your own full picture. You can show less, or stop, anytime." })}</p>
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-[28px] bg-white p-4 shadow-soft">
      <p className="font-extrabold text-[16px]">{t({ hi: "Yeh khaata kiska hai?", en: "Whose account is this?" })}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {([["self", User, "Mera", "Mine"], ["family", Users, "Parivaar mein kisi aur ka", "Someone else in my family"]] as const).map(([k, Icon, hi, en]) => (
          <button key={k} onClick={() => set({ ...v, who: k })} aria-pressed={v.who === k}
            className={`rounded-[18px] p-3 text-left min-h-14 ${v.who === k ? "bg-haldi" : "bg-lav"}`}>
            <Icon size={18} /><span className="block text-[13px] font-bold leading-tight mt-1">{lang === "hi" ? hi : en}</span>
          </button>
        ))}
      </div>
      {v.who === "family" && (
        <div className="mt-3 space-y-3">
          <input value={v.relation} maxLength={24} onChange={(e) => set({ ...v, relation: e.target.value })}
            placeholder={lang === "hi" ? "Aap unhe kya kehte hain? (jaise Pati, Maa)" : "What do you call them? (e.g. Husband, Mother)"}
            className="w-full rounded-[16px] bg-lav/60 px-3 min-h-12 text-[14px] outline-none" />
          <div className="grid grid-cols-2 gap-2">
            {([["earning_adult", "Kamaate hain", "Earns"], ["non_earning_adult", "Nahi kamaate", "Doesn't earn"]] as const).map(([k, hi, en]) => (
              <button key={k} onClick={() => set({ ...v, role: k })} aria-pressed={v.role === k}
                className={`rounded-full min-h-11 text-[13px] font-bold ${v.role === k ? "bg-ink text-white" : "bg-lav"}`}>{lang === "hi" ? hi : en}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-[16px] bg-lav/60 px-3">
            <span className="font-bold">+91</span>
            <input inputMode="numeric" maxLength={10} value={v.mobile} onChange={(e) => set({ ...v, mobile: e.target.value.replace(/\D/g, "") })}
              placeholder={lang === "hi" ? "Unka bank wala mobile" : "Their bank-registered mobile"} className="flex-1 min-h-12 text-[15px] font-bold num outline-none bg-transparent min-w-0" />
          </div>
          <p className="text-[12px] font-bold">{t({ hi: "Ghar ke hisaab mein unka khaata kaise dikhe? (unse poochh kar chunein)", en: "How should their account show in the household picture? (choose with them)" })}</p>
          <SharingPicker value={v.sharing} onChange={(s) => set({ ...v, sharing: s })} />
          <p className="rounded-[16px] bg-ink text-white p-3 text-[12px] font-semibold">✋ {t({ hi: "Anumati ka OTP unke phone par aayega — manzoori woh khud dete hain. Unke bina yeh khaata nahi judta.", en: "Anumati sends the OTP to their phone — they approve it themselves. Without them, this account can't be linked." })}</p>
        </div>
      )}
    </div>
  );
}
