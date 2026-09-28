"use client";
import { BellRing, Moon, Lock, MessageCircle } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Scene from "@/components/art/Scene";
import { useApp } from "@/lib/store";
import type { L } from "@/lib/types";

type Nudge = { id: string; when: L; text: L; icon: Parameters<typeof Scene>[0]["kind"]; channel: "whatsapp" | "push" };

/** In-app view of the nudge library. Copy comes from engine output; no money is computed here. */
export default function NudgeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, t, lang } = useApp();
  if (!data) return null;
  const top = data.nba[0];
  const jar = data.jars[0];
  const nudges: Nudge[] = [
    ...(top ? [{ id: "today", when: { hi: "Aaj, 9:00 subah", en: "Today, 9:00 am" }, text: top.title, icon: top.icon, channel: "whatsapp" as const }] : []),
    ...data.nba.slice(1, 3).map((n, i) => ({ id: n.id, when: { hi: i === 0 ? "Kal" : "Parson", en: i === 0 ? "Tomorrow" : "Day after" }, text: n.title, icon: n.icon, channel: "push" as const })),
    ...(jar ? [{ id: "salary", when: { hi: "Salary ke din", en: "On salary day" }, text: { hi: `Salary aa gayi! ${jar.name.hi} mein thoda daalein?`, en: `Salary arrived! Add a little to ${jar.name.en}?` }, icon: "jar" as const, channel: "whatsapp" as const }] : []),
    { id: "streak", when: { hi: "Shaam 7:00, agar check-in chhoota", en: "7:00 pm, if check-in missed" }, text: { hi: `Aapka ${data.game.streak} din ka streak bachayein`, en: `Save your ${data.game.streak}-day streak` }, icon: "bolt", channel: "push" },
  ];
  return (
    <Sheet open={open} onClose={onClose} title={<p className="text-xl font-extrabold flex items-center gap-2"><BellRing size={22} />{lang === "hi" ? "Yaad-dihaani" : "Nudges"}</p>}>
      <div className="rounded-[24px] bg-ink text-white p-4">
        <p className="mb-2 inline-block rounded-full bg-haldi text-ink px-2.5 py-0.5 text-[11px] font-extrabold">{lang === "hi" ? "NAMOONA — abhi koi notification nahi bheja jaata" : "PREVIEW — no notifications are sent yet"}</p>
        <p className="text-[11px] font-bold text-white/60 flex items-center gap-1.5"><Lock size={12} />{lang === "hi" ? "Push notification lock screen par aisa dikhega" : "What a push notification will show on the lock screen"}</p>
        <div className="mt-2 rounded-2xl bg-white/10 p-3 flex items-center gap-3">
          <span className="grid place-items-center h-10 w-10 rounded-xl bg-haldi text-ink font-extrabold">₹</span>
          <div><p className="text-sm font-bold">DhanYukti</p><p className="text-sm text-white/80">{t({ hi: "Aaj ka kaam taiyaar hai", en: "Today's task is ready" })}</p></div>
        </div>
        <p className="text-[11px] text-white/60 mt-2">{t({ hi: "Push notification mein koi rakam nahi hogi. WhatsApp sandesh mein rakam ho sakti hai aur WhatsApp ki settings ke hisaab se lock screen par dikh sakti hai — chaahein to WhatsApp mein message preview band karein.", en: "Push notifications carry no amounts. WhatsApp messages can include amounts and may show on your lock screen, depending on WhatsApp's settings — turn off message previews there if you prefer." })}</p>
      </div>
      <p className="mt-4 px-1 text-[12px] font-bold text-muted">{t({ hi: "App kholne ke baad (phone unlock hone par) aap yeh dekhenge:", en: "What you see after you unlock and open the app:" })}</p>
      <div className="mt-2 space-y-2">
        {nudges.map((n) => (
          <div key={n.id} className="flex items-center gap-3 rounded-[22px] bg-white p-3">
            <Scene kind={n.icon} size={48} />
            <div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-muted">{t(n.when)}</p><p className="text-sm font-semibold leading-snug">{t(n.text)}</p></div>
            {n.channel === "whatsapp" ? <MessageCircle size={18} className="text-[#0E7A42] shrink-0" /> : <BellRing size={18} className="text-muted shrink-0" />}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-lav p-3 text-[13px]">
        <Moon size={18} className="shrink-0" />{t({ hi: "Raat 9 se subah 8 tak koi message nahi. Din mein sirf ek.", en: "No messages 9 pm – 8 am. At most one a day." })}
      </div>
    </Sheet>
  );
}
