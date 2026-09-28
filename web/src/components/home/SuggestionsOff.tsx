"use client";
import { useRouter } from "next/navigation";
import { BellOff } from "lucide-react";
import { useApp } from "@/lib/store";

/** The member said no to "Alerts & suggestions" on their bank link, so no tasks are suggested. */
export default function SuggestionsOff() {
  const { t, lang } = useApp();
  const router = useRouter();
  return (
    <div className="mx-5 lg:mx-0 rounded-[28px] bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2"><BellOff size={20} /><p className="text-[17px] font-extrabold">{t({ hi: "Salah band hai", en: "Suggestions are off" })}</p></div>
      <p className="mt-2 text-[14px] text-ink/80 leading-snug">{t({ hi: "Aapne bank khaate ke consent mein 'Alert aur salah' band rakha hai, isliye hum aaj ka kaam nahi sujhate. Aapke aankde neeche hain.", en: "You kept “Alerts & suggestions” off for your bank link, so we don't suggest tasks. Your numbers are below." })}</p>
      <button onClick={() => router.push("/app/family")} className="mt-3 rounded-full bg-ink text-white px-4 min-h-11 text-sm font-bold">{lang === "hi" ? "Consent dekhein" : "Review consent"}</button>
    </div>
  );
}
