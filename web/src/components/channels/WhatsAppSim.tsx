"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCheck, Play, Square, Volume2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { inr } from "@/lib/format";
import type { Dashboard, L } from "@/lib/types";
import { sayText, useRunner, wait } from "./VoiceScript";

type Reply = { label: L; to: string };
type Node = { bot: L[]; replies: Reply[] };
type Msg = { from: "bot" | "me"; text: L; time: string };

function buildScript(d: Dashboard): Record<string, Node> {
  const n = d.nba[0];
  const jar = d.jars[0];
  const lender = d.lender_shield.find((l) => !l.on_rbi_list);
  const aa = { hi: "Anumati", en: "Anumati" };
  const karo: L = n.action.type === "message" && n.action.payload.text && typeof n.action.payload.text === "object"
    ? { hi: `Yeh message school ko bhej dijiye:\n\n${(n.action.payload.text as L).hi}`, en: `Forward this to the school:\n\n${(n.action.payload.text as L).en}` }
    : { hi: `Aaj ka kaam: ${n.task.hi}`, en: `Today's task: ${n.task.en}` };
  return {
    start: { bot: [{ hi: "Aaj ka kaam taiyaar hai 🔔", en: "Today's task is ready 🔔" }, { hi: `${n.title.hi}\n${n.task.hi}`, en: `${n.title.en}\n${n.task.en}` }],
      replies: [{ label: { hi: "Kyon?", en: "Why?" }, to: "kyon" }, { label: { hi: "Karo", en: "Do it" }, to: "karo" }, { label: { hi: "Baad mein", en: "Later" }, to: "later" }] },
    kyon: { bot: [n.why.rule, { hi: n.why.saw.slice(0, 3).map((x) => `• ${x.date.slice(8)}/${x.date.slice(5, 7)}  ${inr(x.amount)}`).join("\n"), en: n.why.saw.slice(0, 3).map((x) => `• ${x.date.slice(8)}/${x.date.slice(5, 7)}  ${inr(x.amount)}`).join("\n") }],
      replies: [{ label: { hi: "Karo", en: "Do it" }, to: "karo" }] },
    karo: { bot: [karo], replies: [{ label: { hi: "Aage", en: "Next" }, to: "salary" }] },
    later: { bot: [{ hi: "Theek hai. Kal subah 9 baje yaad dilayenge.", en: "Okay. We'll remind you tomorrow at 9 am." }], replies: [{ label: { hi: "Aage", en: "Next" }, to: "salary" }] },
    salary: { bot: [{ hi: `Salary aa gayi! ₹800 ${jar?.name.hi ?? "Gullak"} mein daalein?`, en: `Salary arrived! Put ₹800 in ${jar?.name.en ?? "Gullak"}?` }],
      replies: [{ label: { hi: "Haan, AutoPay", en: "Yes, AutoPay" }, to: "confirm" }, { label: { hi: "Abhi nahi", en: "Not now" }, to: lender ? "lender" : "receipt" }] },
    confirm: { bot: [{ hi: `₹800, 30 Sep, ${jar?.name.hi ?? "Gullak"} — sahi hai?`, en: `₹800, 30 Sep, ${jar?.name.en ?? "Gullak"} — correct?` }],
      replies: [{ label: { hi: "Haan, sahi hai", en: "Yes, correct" }, to: "done" }] },
    done: { bot: [{ hi: "✅ UPI AutoPay set. +50 Paisa Points 🎉", en: "✅ UPI AutoPay set. +50 Paisa Points 🎉" }], replies: [{ label: { hi: "Aage", en: "Next" }, to: lender ? "lender" : "receipt" }] },
    lender: { bot: lender ? [{ hi: `⚠️ ${lender.app} RBI ki list mein nahi hai. ${lender.days} din mein ${inr(lender.charges)} byaaj laga.`, en: `⚠️ ${lender.app} is not on RBI's list. ${inr(lender.charges)} interest in ${lender.days} days.` }] : [],
      replies: [{ label: { hi: "Aage", en: "Next" }, to: "receipt" }] },
    receipt: { bot: [{ hi: `🧾 Consent raseed\nKya: bank ka 6 mahine ka len-den\nKyon: mahine ke aakhir ki warning\nKab tak: 90 din\nKaun: ${aa.hi} (Account Aggregator)\nBand karne ke liye STOP likhein`, en: `🧾 Consent receipt\nWhat: 6 months of bank transactions\nWhy: month-end warnings\nUntil: 90 days\nHandled by: ${aa.en} (Account Aggregator)\nReply STOP to revoke` }], replies: [] },
  };
}
const DEMO_PATH = ["kyon", "karo", "salary", "confirm", "done", "lender", "receipt"];

export default function WhatsAppSim() {
  const { data, t, lang, speak, award } = useApp();
  const { running, start, stop } = useRunner();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [node, setNode] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const clock = useRef(9 * 60);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs, typing]);
  if (!data) return null;
  const script = buildScript(data);

  const time = () => { clock.current += 1; const h = Math.floor(clock.current / 60), m = clock.current % 60; return `${h}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
  const playNode = async (id: string, voice: boolean, alive: () => boolean) => {
    const nd = script[id];
    for (const line of nd.bot) {
      if (!alive()) return;
      setTyping(true); await wait(600); setTyping(false);
      setMsgs((m) => [...m, { from: "bot", text: line, time: time() }]);
      if (voice) await sayText(t(line), lang); else await wait(300);
    }
    if (alive()) setNode(id);
  };
  const choose = async (r: Reply, voice = false, alive = () => true) => {
    setNode(null);
    setMsgs((m) => [...m, { from: "me", text: r.label, time: time() }]);
    if (r.to === "done" && !voice) award("gullak_deposit", { hi: "Gullak mein ₹800!", en: "₹800 in the Gullak!" }, { ref: data.jars[0]?.id, amount: 800 });
    await playNode(r.to, voice, alive);
  };
  const reset = () => { stop(); setMsgs([]); setNode(null); clock.current = 9 * 60; };
  const manualStart = () => { reset(); void playNode("start", false, () => true); };
  const demo = async () => {
    reset();
    const r = start(true);
    await playNode("start", true, r.alive);
    for (const to of DEMO_PATH) {
      if (!r.alive()) return;
      await wait(700);
      const cur = Object.entries(script).find(([, nd]) => nd.replies.some((x) => x.to === to));
      const reply = cur?.[1].replies.find((x) => x.to === to) ?? { label: { hi: "Aage", en: "Next" }, to };
      await choose(reply, true, r.alive);
    }
    r.done();
  };

  const current = node ? script[node] : null;
  return (
    <div className="rounded-[28px] overflow-hidden shadow-soft bg-white">
      <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
        <span className="grid place-items-center h-10 w-10 rounded-full bg-haldi text-ink font-extrabold">₹</span>
        <div className="flex-1"><p className="font-bold leading-tight">DhanYukti ✓</p><p className="text-[11px] text-white/70">{running ? (lang === "hi" ? "bol raha hai…" : "speaking…") : "online"}</p></div>
        {running
          ? <button onClick={stop} className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 min-h-10 text-xs font-bold"><Square size={14} />{lang === "hi" ? "Roko" : "Stop"}</button>
          : <button onClick={demo} className="flex items-center gap-1.5 rounded-full bg-white text-[#075E54] px-3 min-h-10 text-xs font-bold"><Play size={14} />{lang === "hi" ? "Demo chalao" : "Play demo"}</button>}
      </div>
      <div className="h-[460px] overflow-y-auto no-scrollbar bg-[#ECE5DD] p-3 space-y-2">
        {msgs.length === 0 && (
          <div className="h-full grid place-items-center text-center">
            <div><p className="text-sm text-ink/60">{lang === "hi" ? "Subah 9 baje ka WhatsApp" : "The 9 am WhatsApp"}</p>
              <button onClick={manualStart} className="mt-3 rounded-full bg-[#075E54] text-white px-5 min-h-11 text-sm font-bold">{lang === "hi" ? "Shuru karein" : "Start"}</button></div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${m.from === "me" ? "bg-[#DCF8C6] rounded-tr-sm" : "bg-white rounded-tl-sm"}`}>
                <p className="text-[14px] leading-snug whitespace-pre-line">{t(m.text)}</p>
                <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-ink/45">
                  {m.from === "bot" && <button onClick={() => speak(m.text)} aria-label="Listen" className="mr-auto"><Volume2 size={13} /></button>}
                  {m.time}{m.from === "me" && <CheckCheck size={14} className="text-[#34B7F1]" />}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {typing && <div className="w-14 rounded-2xl bg-white px-3 py-2.5 flex gap-1">{[0, 1, 2].map((i) => <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-ink/40" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.12 }} />)}</div>}
        <div ref={end} />
      </div>
      <div className="min-h-[64px] bg-[#F0F0F0] p-2.5 flex flex-wrap gap-2">
        {current && !running && current.replies.map((r) => (
          <button key={r.to + r.label.en} onClick={() => void choose(r)} className="flex-1 min-w-[30%] min-h-11 rounded-full bg-white text-[#075E54] text-sm font-bold shadow-sm">{t(r.label)}</button>
        ))}
        {!current && !running && msgs.length > 0 && <button onClick={manualStart} className="flex-1 min-h-11 rounded-full bg-white text-sm font-bold">{lang === "hi" ? "Dobara" : "Restart"}</button>}
      </div>
    </div>
  );
}
