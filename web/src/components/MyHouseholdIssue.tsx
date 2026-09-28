"use client";
import { useRouter } from "next/navigation";
import { Landmark, RefreshCcw, Hourglass, CircleAlert } from "lucide-react";
import { Btn, HelpLink } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import type { L } from "@/lib/types";

const COPY: Record<string, { icon: typeof Landmark; title: L; body: L; relink?: boolean; retry?: boolean }> = {
  not_linked: {
    icon: Landmark, relink: true,
    title: { hi: "Aapka bank khaata abhi juda nahi", en: "Your bank account isn't linked" },
    body: { hi: "Aapka hisaab sirf aapke apne bank data se banta hai. Anumati se khaata jodiye.", en: "Your picture is built only from your own bank data. Link your account through Anumati." },
  },
  data_pending: {
    icon: Hourglass, retry: true,
    title: { hi: "Bank se data aa raha hai", en: "Your bank data is on its way" },
    body: { hi: "Anumati par manzoori ho gayi. Data aate hi aapka hisaab ban jayega.", en: "You approved at Anumati. Your picture is built as soon as the data arrives." },
  },
  data_expired: {
    icon: RefreshCcw, relink: true,
    title: { hi: "Hisaab dobara banana hoga", en: "Your picture needs a fresh link" },
    body: { hi: "Bank data aane ke 24 ghante baad delete ho jaata hai. Dobara jodne par naya hisaab banega.", en: "Bank data is deleted 24 hours after it arrives. Link again to rebuild your picture." },
  },
  twin_insufficient: {
    icon: CircleAlert, relink: true,
    title: { hi: "Bank data mein poori jaankari nahi aayi", en: "Your bank data wasn't enough" },
    body: { hi: "Jo nahi aaya:", en: "What was missing:" },
  },
};
const ENGINE: { title: L; body: L } = {
  title: { hi: "Hisaab ka engine abhi jaag raha hai", en: "The money engines are waking up" },
  body: { hi: "Ek minute mein dobara koshish karein. Hum kisi aur parivaar ka data nahi dikhayenge.", en: "Try again in a minute. We won't show another family's numbers instead." },
};

/** Shown instead of the member's household when it can't be built. Never a demo in its place. */
export default function MyHouseholdIssue() {
  const { meIssue, t, lang, refresh, setHid } = useApp();
  const router = useRouter();
  if (!meIssue) return null;
  const c = COPY[meIssue.code];
  const Icon = c?.icon ?? CircleAlert;
  return (
    <div className="mx-5 lg:mx-0 mt-10 rounded-[32px] bg-white p-6 shadow-soft text-center">
      <span className="mx-auto grid place-items-center h-14 w-14 rounded-full bg-lav"><Icon size={26} /></span>
      <p className="mt-4 text-xl font-extrabold">{t(c?.title ?? ENGINE.title)}</p>
      <p className="mt-2 text-[14px] text-muted leading-snug">{t(c?.body ?? ENGINE.body)}</p>
      {meIssue.missing.length > 0 && (
        <ul className="mt-2 text-[14px] font-semibold">{meIssue.missing.map((m) => <li key={m.en}>• {t(m)}</li>)}</ul>
      )}
      <div className="mt-5 space-y-2">
        {c?.relink && <Btn variant="ink" className="w-full" onClick={() => router.push("/?step=consent")}>{lang === "hi" ? "Bank khaata jodein" : "Link my bank account"}</Btn>}
        {(c?.retry || !c) && <Btn variant="ink" className="w-full" onClick={() => void refresh()}>{lang === "hi" ? "Dobara koshish" : "Try again"}</Btn>}
        <button onClick={() => { setHid("A"); router.push("/app"); }} className="w-full min-h-11 text-sm font-bold text-muted">
          {lang === "hi" ? "Tab tak ek demo parivaar dekhein (demo data)" : "Meanwhile, look at a demo family (demo data)"}
        </button>
      </div>
      <HelpLink />
    </div>
  );
}
