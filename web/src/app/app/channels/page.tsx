"use client";
import { useState } from "react";
import TopBar from "@/components/TopBar";
import WhatsAppSim from "@/components/channels/WhatsAppSim";
import IvrSim from "@/components/channels/IvrSim";
import VoiceScript from "@/components/channels/VoiceScript";
import { HelpLink, SectionTitle, Skeleton } from "@/components/ui/bits";
import { useApp } from "@/lib/store";

const ONBOARDING = [
  { hi: "Namaste! Apni bhasha chuniye — Hindi ke liye yahan dabaiye.", en: "Hello! Choose your language — tap here for English." },
  { hi: "Sirf mobile number chahiye. Aadhaar ya PAN nahi.", en: "Only your mobile number. No Aadhaar or PAN." },
  { hi: "Ghar mein kitne log hain? Kitne kamaate hain? Bas tap kijiye.", en: "How many people at home? How many earn? Just tap." },
  { hi: "Hum dekhenge: bank ka 6 mahine ka len-den. Kyon: taaki mahine ke aakhir mein paise kam na padein. Kab tak: 3 mahine.", en: "We'll see 6 months of bank transactions, so you don't run short at month-end, for 3 months." },
  { hi: "Yeh consent Anumati sambhaalta hai. Kabhi bhi band kar sakte hain.", en: "Anumati handles this consent. You can stop it anytime." },
  { hi: "Aapka hisaab taiyaar hai. Bina aamdani ke aap 12 din chal sakte hain.", en: "Your picture is ready. Without income you'd last 12 days." },
];

export default function Channels() {
  const { data, lang } = useApp();
  const [tab, setTab] = useState<"wa" | "ivr">("wa");
  if (!data) return <div className="p-5 space-y-4"><Skeleton h={400} /></div>;
  return (
    <div>
      <TopBar title="WhatsApp / IVR" />
      <p className="px-5 lg:px-0 text-sm text-muted">{lang === "hi" ? "Bina app ke bhi — WhatsApp ya phone call se." : "Even without the app — by WhatsApp or a phone call."}</p>
      <div className="mx-5 lg:hidden mt-4 grid grid-cols-2 rounded-full bg-white p-1 shadow-soft">
        {([["wa", "WhatsApp"], ["ivr", lang === "hi" ? "Phone call" : "Phone call"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`min-h-11 rounded-full text-sm font-bold ${tab === k ? "bg-ink text-white" : "text-muted"}`}>{l}</button>
        ))}
      </div>
      <div className="mt-4 px-5 lg:px-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div className={tab === "wa" ? "" : "hidden lg:block"}><WhatsAppSim /></div>
        <div className={tab === "ivr" ? "" : "hidden lg:block"}><IvrSim /></div>
      </div>
      <SectionTitle v={{ hi: "Awaaz se onboarding", en: "Voice onboarding" }} />
      <div className="mx-5 lg:mx-0 rounded-[28px] bg-white p-5 shadow-soft lg:max-w-2xl"><VoiceScript lines={ONBOARDING} /></div>
      <HelpLink />
    </div>
  );
}
