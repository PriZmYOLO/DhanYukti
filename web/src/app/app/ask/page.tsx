"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Send, Sparkles } from "lucide-react";
import { LangToggle } from "@/components/TopBar";
import { HelpLink, SpeakBtn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { primaryMember } from "@/lib/format";
import { api } from "@/lib/api";
import type { L } from "@/lib/types";

type Msg = { who: "me" | "dy"; text: string; answer?: L; tools?: string[] };

const BASE_CHIPS: L[] = [
  { hi: "Aaj kitna kharch kar sakte hain?", en: "How much can I spend today?" },
  { hi: "Agar salary 10 din late ho?", en: "What if salary is 10 days late?" },
  { hi: "Gullak mein kitna daalun?", en: "How much should I put in Gullak?" },
  { hi: "Bima ke baare mein batao", en: "Tell me about insurance" },
];

type SR = { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; onerror: () => void; start: () => void; stop: () => void };

export default function Ask() {
  const { hid, lang, t, speak, data } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const rec = useRef<SR | null>(null);
  const top = data?.nba[0];
  const lender = data?.lender_shield.find((l) => !l.on_rbi_list);
  const CHIPS: L[] = [
    ...(top ? [{ hi: `Kyon? — ${top.title.hi}`, en: `Why? — ${top.title.en}` }] : []),
    ...(lender ? [{ hi: `Kya ${lender.app} app safe hai?`, en: `Is the ${lender.app} app safe?` }] : []),
    ...BASE_CHIPS,
  ];
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const ask = async (question: string) => {
    if (!question.trim()) return;
    setMsgs((m) => [...m, { who: "me", text: question }]); setQ(""); setBusy(true);
    try {
      const r = await api.ask(hid, question, lang);
      setMsgs((m) => [...m, { who: "dy", text: r.answer[lang], answer: r.answer, tools: r.tools_used }]);
      speak(r.answer);
    } catch {
      setMsgs((m) => [...m, { who: "dy", text: t({ hi: "Maaf kijiye, abhi jawab nahi mil paaya.", en: "Sorry, couldn't get an answer right now." }) }]);
    } finally { setBusy(false); }
  };

  const listen = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) { setMsgs((m) => [...m, { who: "dy", text: t({ hi: "Is phone par awaaz nahi chalti — neeche likh kar poochhein.", en: "Voice isn't supported here — please type below." }) }]); return; }
    if (listening) { rec.current?.stop(); return; }
    const r = new Ctor(); r.lang = lang === "hi" ? "hi-IN" : "en-IN"; r.interimResults = false;
    r.onresult = (e) => ask(e.results[0][0].transcript);
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    rec.current = r; setListening(true); r.start();
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="flex items-center gap-3 px-5 pt-4">
        <div className="flex-1"><h1 className="text-2xl font-extrabold">Poocho</h1><p className="text-xs text-muted">{t({ hi: "Apni bhasha mein kuch bhi poochhein", en: "Ask anything in your language" })}</p></div>
        <HelpLink compact />
        <LangToggle />
      </header>

      {msgs.length === 0 && (
        <div className="px-5 mt-6 text-center">
          <motion.button onClick={listen} whileTap={{ scale: 0.92 }} className="relative mx-auto grid place-items-center h-40 w-40 rounded-full bg-ink shadow-lift">
            {listening && [0, 1].map((i) => <motion.span key={i} className="absolute inset-0 rounded-full border-4 border-haldi" animate={{ scale: [1, 1.5], opacity: [0.7, 0] }} transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.7 }} />)}
            <span className="grid place-items-center h-28 w-28 rounded-full bg-haldi"><Mic size={52} className="text-ink" strokeWidth={2.2} /></span>
          </motion.button>
          <p className="mt-5 text-xl font-extrabold">{listening ? t({ hi: "Sun rahe hain…", en: "Listening…" }) : t({ hi: `Namaste ${primaryMember(data)?.name ?? ""}! Bolkar poochhiye`, en: `Hi ${primaryMember(data)?.name ?? ""}! Tap and speak` })}</p>
          <p className="text-sm text-muted mt-1">{t({ hi: "Mic dabaiye aur Hindi mein bolein", en: "Tap the mic and speak" })}</p>
        </div>
      )}

      <div className="flex-1 px-5 mt-4 space-y-3">
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.who === "me" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-[24px] px-4 py-3 ${m.who === "me" ? "bg-ink text-white rounded-br-md" : "bg-white shadow-soft rounded-bl-md"}`}>
                {m.who === "dy" && <p className="flex items-center gap-1 text-[11px] font-bold text-clay mb-1"><Sparkles size={12} />DhanYukti</p>}
                <p className="text-[15px] leading-relaxed">{m.answer ? t(m.answer) : m.text}</p>
                {m.who === "dy" && m.answer && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] font-bold rounded-full bg-mint text-leaf px-2 py-0.5">Jaankari · {lang === "hi" ? "salah nahi" : "not advice"}</span>
                    {m.tools?.length ? <span className="text-[11px] text-muted truncate">{m.tools.join(", ")}</span> : null}
                    <span className="ml-auto"><SpeakBtn v={m.answer} size={32} /></span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {busy && <div className="flex gap-1.5 px-4 py-3 bg-white rounded-[24px] w-fit">{[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-muted" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}</div>}
        <div ref={end} />
      </div>

      <div className="px-5 mt-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
          {CHIPS.map((c) => <button key={c.en} onClick={() => ask(t(c))} className="shrink-0 rounded-full bg-white px-4 min-h-11 text-sm font-semibold shadow-soft">{t(c)}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="mt-2 flex items-center gap-2 rounded-full bg-white p-1.5 shadow-soft">
          <button type="button" onClick={listen} className={`grid place-items-center h-12 w-12 rounded-full ${listening ? "bg-clay text-white" : "bg-haldi"}`}><Mic size={22} /></button>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t({ hi: "Yahan likhein…", en: "Type here…" })} className="flex-1 bg-transparent outline-none text-[15px] min-w-0" />
          <button type="submit" className="grid place-items-center h-12 w-12 rounded-full bg-ink text-white"><Send size={20} /></button>
        </form>
        <p className="text-center text-[11px] text-muted mt-2">{t({ hi: "Niyam ginte hain, AI sirf samjhata hai", en: "Rules calculate, AI only explains" })}</p>
      </div>
    </div>
  );
}
