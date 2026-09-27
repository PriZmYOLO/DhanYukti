"use client";
import { AnimatePresence, motion } from "motion/react";
import { Volume2 } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { Btn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { voiceLanguage } from "@/lib/voice/languages";

/**
 * Voice consent prompt (first Hindi read-out) and a small label saying
 * where the audio came from while it plays: Bhashini, or the phone's own
 * voice and why.
 */
export default function VoiceLayer() {
  const { voice, answerVoicePrompt, speaking, t, lang } = useApp();
  const vl = voice.lang ? voiceLanguage(voice.lang) : undefined;
  return (
    <>
      <Sheet open={voice.prompt} onClose={() => answerVoicePrompt(false)} title={<p className="text-xl font-extrabold">{t({ hi: "Hindi mein sunein?", en: "Listen in Hindi?" })}</p>}>
        <div className="space-y-3 text-[15px]">
          <p>{t({ hi: "Anuvaad aur awaaz Bhashini se banegi — Bharat Sarkar ki bhasha seva (DPI), 22 bhashaon mein.", en: "Translation and voice come from Bhashini — the Government of India's language service (DPI), in 22 languages." })}</p>
          <ul className="rounded-[20px] bg-white p-4 space-y-1.5 text-[14px]">
            <li>✓ {t({ hi: "Sirf us card ka text jaata hai, parivaar ke naam hata kar", en: "Only the card's text is sent, with family names removed" })}</li>
            <li>✓ {t({ hi: "Kuch save nahi hota — na text, na awaaz", en: "Nothing is stored — not the text, not the audio" })}</li>
            <li>✓ {t({ hi: "Anuvaad koi ank badle to nahi bajaya jaata", en: "If the translation changes a number, it isn't played" })}</li>
            <li>✓ {t({ hi: "Consent Passport mein kabhi bhi band karein", en: "Stop anytime in the Consent Passport" })}</li>
          </ul>
          <Btn variant="ink" className="w-full" onClick={() => answerVoicePrompt(true)}>{lang === "hi" ? "Haan, Bhashini se sunaao" : "Yes, use Bhashini"}</Btn>
          <Btn variant="white" className="w-full" onClick={() => answerVoicePrompt(false)}>{lang === "hi" ? "Nahi, phone ki awaaz" : "No, use the phone voice"}</Btn>
        </div>
      </Sheet>
      <AnimatePresence>
        {speaking && voice.source && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-32 z-[60] max-w-[90vw] rounded-full bg-ink text-white px-4 py-2 text-[12px] font-bold shadow-lift flex items-center gap-2 pointer-events-none">
            <Volume2 size={14} className="text-haldi shrink-0" />
            <span className="truncate">{voice.source === "bhashini" ? `Bhashini · ${t({ hi: "Bharat Sarkar", en: "Government of India" })} · ${vl ? (lang === "hi" ? vl.hi : vl.en) : ""}` : t(voice.note ?? { hi: "Phone ki awaaz", en: "Phone voice" })}</span>
          </motion.div>
        )}
        {speaking && voice.source === "bhashini" && voice.caption && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-44 z-[60] w-[min(92vw,420px)] rounded-[20px] bg-white text-ink px-4 py-3 text-[15px] leading-snug shadow-lift pointer-events-none"
            dir={voice.lang && ["ur", "sd", "ks"].includes(voice.lang) ? "rtl" : "ltr"}>
            {voice.caption}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
