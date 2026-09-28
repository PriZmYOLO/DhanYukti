"use client";
import { useRef, useState } from "react";
import { Phone, PhoneOff, Play } from "lucide-react";
import { useApp } from "@/lib/store";
import { topTask } from "./allGood";
import { inr } from "@/lib/format";
import type { Dashboard, L } from "@/lib/types";
import { sayText, useRunner, wait } from "./VoiceScript";

type State = "idle" | "lang" | "menu" | "task" | "sent" | "spend" | "amount" | "confirm" | "pin" | "paid" | "help";

function prompts(d: Dashboard, amt: number): Record<Exclude<State, "idle">, L> {
  const n = topTask(d);
  const s = d.metrics.safe_to_spend, r = d.metrics.resilience_days;
  return {
    lang: { hi: "Namaste! DhanYukti mein aapka swagat hai. Hindi ke liye 1, English ke liye 2 dabaiye.", en: "Welcome to DhanYukti. For Hindi press 1, for English press 2." },
    menu: { hi: "Aaj ka kaam sunne ke liye 1. Kitna kharch kar sakte hain, 2. Gullak mein paisa, 3. Madad, 9.", en: "Today's task, press 1. How much you can spend, 2. Gullak, 3. Help, 9." },
    task: { hi: `${n.title.hi}. ${n.task.hi}. School ko message bhejne ke liye 1. Wapas ke liye star.`, en: `${n.title.en}. ${n.task.en}. To message the school press 1. Back, star.` },
    sent: { hi: "Humne school ko SMS bhej diya. Wapas ke liye star.", en: "We've sent the school an SMS. Back, star." },
    spend: { hi: `Aaj aap ${s.value != null ? inr(s.value) : "kuch nahi"} extra kharch kar sakte hain. Bina aamdani ke ${r.value ?? "?"} din chal sakte hain. Wapas ke liye star.`, en: `You can spend ${s.value != null ? inr(s.value) : "nothing"} extra today. Without income you'd last ${r.value ?? "?"} days. Back, star.` },
    amount: { hi: "Kitne rupaye? 100 ke liye 1, 500 ke liye 2, 800 ke liye 3.", en: "How much? 100, press 1. 500, press 2. 800, press 3." },
    confirm: { hi: `${inr(amt)}, Gullak mein. Sahi hai toh 1 dabaiye.`, en: `${inr(amt)} into your Gullak. Press 1 to confirm.` },
    pin: { hi: "UPI 123PAY se mandate bheja gaya. Apna 4 ank ka UPI PIN daaliye.", en: "Mandate sent via UPI 123PAY. Enter your 4-digit UPI PIN." },
    paid: { hi: "Ho gaya! Gullak mein paisa gaya. Wapas ke liye star.", en: "Done! Money is in your Gullak. Back, star." },
    help: { hi: "Bank mitra aapko 10 minute mein call karenge. Dhanyavaad.", en: "A bank mitra will call you within 10 minutes. Thank you." },
  };
}

function beep() {
  try {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctx = W.AudioContext ?? W.webkitAudioContext; if (!Ctx) return;
    const ctx = new Ctx(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = 941; g.gain.value = 0.08; o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.12); o.onended = () => ctx.close();
  } catch { /* no audio */ }
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export default function IvrSim() {
  const { data, t, lang, setLang } = useApp();
  const { running, start, stop } = useRunner();
  const [state, setState] = useState<State>("idle");
  const [amt, setAmt] = useState(800);
  const [pin, setPin] = useState("");
  const [typed, setTyped] = useState("");
  const langRef = useRef(lang);
  if (!data) return null;

  const go = async (s: State, a = amt, alive: () => boolean = () => true) => {
    setState(s);
    if (s === "idle") return;
    const p = prompts(data, a)[s];
    await sayText(p[langRef.current], langRef.current);
    if (!alive()) return;
    if (s === "help") { await wait(400); setState("idle"); }
  };

  const press = async (k: string, alive?: () => boolean) => {
    beep(); setTyped((x) => (x + k).slice(-8));
    if (state === "lang" && (k === "1" || k === "2")) { const l = k === "1" ? "hi" : "en"; langRef.current = l; setLang(l); return go("menu", amt, alive); }
    if (k === "*" && state !== "lang" && state !== "idle") return go("menu", amt, alive);
    if (state === "menu") { if (k === "1") return go("task", amt, alive); if (k === "2") return go("spend", amt, alive); if (k === "3") return go("amount", amt, alive); if (k === "9") return go("help", amt, alive); }
    if (state === "task" && k === "1") return go("sent", amt, alive);
    if (state === "amount" && ["1", "2", "3"].includes(k)) { const a = { "1": 100, "2": 500, "3": 800 }[k]!; setAmt(a); return go("confirm", a, alive); }
    if (state === "confirm" && k === "1") { setPin(""); return go("pin", amt, alive); }
    if (state === "pin") { const p = pin + k; setPin(p); if (p.length === 4) return go("paid", amt, alive); }
  };

  const call = () => { stop(); langRef.current = lang; setTyped(""); void go("lang"); };
  const hang = () => { stop(); setState("idle"); setTyped(""); };

  const demo = async () => {
    stop();
    const r = start(true);
    langRef.current = lang; setTyped("");
    // Scripted, hands-free walk-through. State is re-read through the prompts spoken in go().
    const seq: [State, string][] = [["lang", lang === "hi" ? "1" : "2"], ["menu", "1"], ["task", "1"], ["sent", "*"], ["menu", "2"], ["spend", "*"], ["menu", "3"], ["amount", "3"], ["confirm", "1"]];
    await go("lang", amt, r.alive);
    for (const [, k] of seq) {
      if (!r.alive()) return;
      await wait(600); beep(); setTyped((x) => (x + k).slice(-8));
      const next: Record<string, State> = { "lang1": "menu", "lang2": "menu", "menu1": "task", "task1": "sent", "sent*": "menu", "menu2": "spend", "spend*": "menu", "menu3": "amount", "amount3": "confirm", "confirm1": "pin" };
      const cur = await new Promise<State>((res) => setState((s) => { res(s); return s; }));
      const to = next[cur + k];
      if (to === "confirm") setAmt(800);
      if (to) await go(to, 800, r.alive);
    }
    for (const d of "1234") { if (!r.alive()) return; await wait(350); beep(); setPin((p) => p + d); }
    if (r.alive()) await go("paid", 800, r.alive);
    r.done();
  };

  const live = state !== "idle";
  const screen = live ? t(prompts(data, amt)[state]) : (lang === "hi" ? "DhanYukti IVR\n1800-000-000" : "DhanYukti IVR\n1800-000-000");
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="font-extrabold">{lang === "hi" ? "Feature phone par call" : "Call from a feature phone"}</p>
        <button onClick={running ? stop : demo} className="flex items-center gap-1.5 rounded-full bg-ink text-white px-3 min-h-10 text-xs font-bold">
          <Play size={14} />{running ? (lang === "hi" ? "Roko" : "Stop") : (lang === "hi" ? "Demo chalao" : "Play demo")}
        </button>
      </div>
      <div className="mx-auto mt-4 w-[230px] rounded-[36px] bg-[#2b2a33] p-4 pb-5 shadow-lift">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-black/40" />
        <div className="mt-3 h-[150px] rounded-lg bg-[#9fbf8f] p-2.5 font-mono text-[11px] leading-snug text-[#17301a] overflow-hidden whitespace-pre-line shadow-inner">
          <p className="flex justify-between opacity-70"><span>{live ? "● 00:" + String(typed.length * 7).padStart(2, "0") : "DhanYukti"}</span><span>▮▮▮</span></p>
          <p className="mt-1.5">{screen}</p>
          {state === "pin" && <p className="mt-1 tracking-[0.4em]">{"*".repeat(pin.length).padEnd(4, "_")}</p>}
        </div>
        <div className="mt-3 flex justify-between">
          <button onClick={call} aria-label="Call" className="grid place-items-center h-10 w-16 rounded-full bg-leaf text-white"><Phone size={18} /></button>
          <button onClick={hang} aria-label="End call" className="grid place-items-center h-10 w-16 rounded-full bg-danger text-white"><PhoneOff size={18} /></button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button key={k} disabled={!live || running} onClick={() => void press(k)}
              className="h-11 rounded-xl bg-[#44434d] text-white text-lg font-bold active:bg-haldi active:text-ink disabled:opacity-60">{k}</button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted">{lang === "hi" ? "Smartphone nahi? 1800-000-000 par call karein." : "No smartphone? Call 1800-000-000."}</p>
    </div>
  );
}
