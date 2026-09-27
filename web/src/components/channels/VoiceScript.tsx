"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward, Volume2 } from "lucide-react";
import { useApp, type Lang } from "@/lib/store";
import type { L } from "@/lib/types";

/* ---------- shared speech helpers (used by the WhatsApp + IVR simulators) ---------- */

/** Make text TTS-friendly: ₹1,500 → "1500 rupaye", drop emoji / ticks. */
export function speechText(text: string, lang: Lang) {
  const word = lang === "hi" ? "rupaye" : "rupees";
  return text
    .replace(/₹\s?([\d,]+(?:\.\d+)?)/g, (_, n: string) => `${n.replace(/,/g, "")} ${word}`)
    .replace(/₹/g, `${word} `)
    .replace(/\p{Extended_Pictographic}|[✓✔️•·]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let activeStop: (() => void) | null = null;
/** Only one simulator talks at a time: claiming the voice stops the previous owner. */
export function takeVoice(stop: () => void) {
  if (activeStop && activeStop !== stop) activeStop();
  activeStop = stop;
}
export function stopSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Speak one line; resolves when it ends (or after a fallback timeout if TTS is silent/missing). */
export function sayText(text: string, lang: Lang): Promise<void> {
  const clean = speechText(text, lang);
  const est = 1200 + clean.length * 75;
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !clean) { setTimeout(resolve, clean ? est : 0); return; }
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = lang === "hi" ? "hi-IN" : "en-IN";
    const voices = s.getVoices();
    const v = voices.find((vo) => vo.lang === u.lang) ?? voices.find((vo) => vo.lang.startsWith(lang));
    if (v) u.voice = v;
    u.rate = 0.95;
    let done = false;
    const tm = setTimeout(() => fin(), est * 2.2 + 2000);
    function fin() { if (!done) { done = true; clearTimeout(tm); resolve(); } }
    u.onend = fin; u.onerror = fin;
    setTimeout(() => s.speak(u), 60); // Chrome drops speak() right after cancel()
  });
}

export type Run = { alive: () => boolean; voice: boolean; done: () => void };

/** Cancellable async sequences: start() invalidates any earlier run. Stops speech on unmount. */
export function useRunner() {
  const tok = useRef(0);
  const [running, setRunning] = useState(false);
  const stop = useCallback(() => { tok.current++; setRunning(false); stopSpeech(); }, []);
  const start = useCallback((voice: boolean): Run => {
    const my = ++tok.current;
    if (voice) takeVoice(stop);
    setRunning(true);
    return { voice, alive: () => tok.current === my, done: () => { if (tok.current === my) setRunning(false); } };
  }, [stop]);
  useEffect(() => {
    const t = tok;
    return () => { t.current++; if (activeStop === stop) activeStop = null; stopSpeech(); };
  }, [stop]);
  return { running, start, stop };
}

/* ---------- VoiceScript: plays a list of lines with highlight + controls ---------- */

export default function VoiceScript({ lines, title }: { lines: L[]; title?: L }) {
  const { t, lang } = useApp();
  const { running, start, stop } = useRunner();
  const [idx, setIdx] = useState(0);

  const playFrom = async (from: number) => {
    const r = start(true);
    for (let i = from; i < lines.length; i++) {
      if (!r.alive()) return;
      setIdx(i);
      await sayText(t(lines[i]), lang);
      if (!r.alive()) return;
      await wait(350);
    }
    if (r.alive()) setIdx(lines.length);
    r.done();
  };
  const cur = Math.min(idx, lines.length - 1);
  const finished = idx >= lines.length;

  return (
    <div>
      {title && <p className="text-[15px] font-extrabold mb-3">{t(title)}</p>}
      <ol className="space-y-2">
        {lines.map((l, i) => {
          const on = !finished && i === cur;
          return (
            <li key={i}>
              <button onClick={() => { stop(); setIdx(i); void playFrom(i); }}
                className={`w-full text-left flex gap-3 items-start rounded-[18px] px-3 py-2.5 min-h-11 transition ${on ? "bg-haldi text-ink shadow-soft" : i < idx ? "bg-white/70 text-ink/60" : "bg-white/40"}`}>
                <span className={`grid place-items-center h-6 w-6 shrink-0 rounded-full text-[11px] font-extrabold ${on ? "bg-ink text-haldi" : "bg-ink/10"}`}>
                  {on && running ? <Volume2 size={13} /> : i + 1}
                </span>
                <span className="text-[14px] leading-snug">{t(l)}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex gap-2">
        {running ? (
          <button onClick={stop} className="flex-1 min-h-12 rounded-[18px] bg-ink text-white font-bold flex items-center justify-center gap-2"><Pause size={18} />{lang === "hi" ? "Roko" : "Pause"}</button>
        ) : (
          <button onClick={() => void playFrom(finished ? 0 : cur)} className="flex-1 min-h-12 rounded-[18px] bg-ink text-white font-bold flex items-center justify-center gap-2"><Play size={18} />{lang === "hi" ? "Chalao" : "Play"}</button>
        )}
        <button aria-label={lang === "hi" ? "Agla" : "Next"} disabled={finished}
          onClick={() => { const n = cur + 1; if (running) { void playFrom(n); } else { stop(); setIdx(n); } }}
          className="grid place-items-center h-12 w-12 rounded-[18px] bg-white shadow-soft disabled:opacity-40"><SkipForward size={18} /></button>
        <button aria-label={lang === "hi" ? "Shuru se" : "Restart"} onClick={() => { stop(); setIdx(0); void playFrom(0); }}
          className="grid place-items-center h-12 w-12 rounded-[18px] bg-white shadow-soft"><RotateCcw size={18} /></button>
      </div>
    </div>
  );
}
