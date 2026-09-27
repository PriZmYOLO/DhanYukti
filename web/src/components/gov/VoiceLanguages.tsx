"use client";
import { useEffect, useState } from "react";
import { Volume2, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { gov } from "@/lib/gov";
import { VOICE_LANGUAGES } from "@/lib/voice/languages";
import type { L } from "@/lib/types";

const SAMPLE: L = {
  hi: "Namaste! Main DhanYukti hoon. 28 September ko aapke paas 3,000 rupaye kam pad sakte hain.",
  en: "Hello! I am DhanYukti, your family's money companion. On 28 September, your cash may fall short by 3,000 rupees.",
};

/**
 * Pick the read-out language from every language Bhashini offers. Screen
 * text stays Hindi or English; each card is translated and spoken in the
 * chosen language when 🔊 is tapped.
 */
export default function VoiceLanguages({ compact }: { compact?: boolean }) {
  const { t, lang, voiceLang, setVoiceLang, speakIn } = useApp();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [all, setAll] = useState(!compact);
  useEffect(() => { gov.voiceLanguages().then((r) => setConfigured(r.configured)).catch(() => setConfigured(null)); }, []);
  const list = all ? VOICE_LANGUAGES : VOICE_LANGUAGES.slice(0, 8);
  return (
    <div className="rounded-[24px] bg-white p-3 shadow-soft">
      <div className="flex items-center gap-2 px-1">
        <p className="flex-1 font-extrabold text-[14px]">{t({ hi: "Sunne ki bhasha", en: "Read-out language" })}</p>
        <span className="rounded-full bg-lav px-2 py-0.5 text-[10px] font-extrabold">BHASHINI · {VOICE_LANGUAGES.length - 1}+1</span>
      </div>
      <p className="px-1 text-[11px] text-muted leading-snug">{t({ hi: "Screen Hindi/English mein rahegi; 🔊 dabane par card aapki bhasha mein anuvaad hokar bolega — Bharat Sarkar ki Bhashini se.", en: "Screens stay in Hindi/English; tap 🔊 and the card is translated and spoken in your language — by the Government of India's Bhashini." })}</p>
      {configured === false && <p className="mt-1 px-1 text-[11px] font-bold text-[#9a5f00]">{t({ hi: "Is deployment par Bhashini abhi juda nahi — phone ki awaaz chalegi.", en: "Bhashini isn't connected on this deployment yet — the phone voice will be used." })}</p>}
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {list.map((l) => {
          const on = voiceLang === l.code;
          return (
            <div key={l.code} className={`flex items-center gap-1 rounded-[16px] pl-3 pr-1 min-h-12 ${on ? "bg-ink text-white" : "bg-lav/60"}`}>
              <button onClick={() => setVoiceLang(l.code)} className="flex-1 text-left min-w-0">
                <span className="block text-[14px] font-extrabold truncate">{on && <Check size={12} className="inline mr-1" />}{l.name}</span>
                <span className="block text-[10px] opacity-60">{lang === "hi" ? l.hi : l.en}</span>
              </button>
              <button aria-label={`Try ${l.en}`} onClick={() => speakIn(SAMPLE, l.code)} className={`grid place-items-center h-10 w-10 rounded-full shrink-0 ${on ? "bg-haldi text-ink" : "bg-white"}`}><Volume2 size={16} /></button>
            </div>
          );
        })}
      </div>
      {!all && <button onClick={() => setAll(true)} className="mt-2 w-full min-h-10 text-xs font-bold text-muted">{t({ hi: `Sab ${VOICE_LANGUAGES.length} bhashayein dikhao`, en: `Show all ${VOICE_LANGUAGES.length} languages` })}</button>}
    </div>
  );
}
