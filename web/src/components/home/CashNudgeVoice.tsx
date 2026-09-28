"use client";
import { useRef, useState } from "react";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { Btn } from "@/components/ui/bits";
import { gov } from "@/lib/gov";
import { ensureSession } from "@/lib/session";
import { useApp } from "@/lib/store";
import { cashShortText } from "@/lib/voice/nudges";
import type { L } from "@/lib/types";

type NudgeResult =
  | { mode: "live"; hindi: string; audio: { base64: string; mime: string } }
  | { mode: "recorded"; hindi: string; url: string; recorded_on: string };

/**
 * "Sunein" on the cash nudge: the Hindi read-out comes from Bhashini (Govt
 * of India) through /api/voice/nudge. Only the amount and the date are
 * sent; the server builds the sentence from a fixed template, so no name or
 * free text can reach the speech service. Needs DPDP consent "voice"; when
 * Bhashini isn't reachable, a recorded clip or the phone's own voice is used,
 * and the label says which.
 */
export default function CashNudgeVoice({ amount, date }: { amount: number; date: string }) {
  const { t, lang, speak } = useApp();
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [consent, setConsent] = useState(false);
  const [info, setInfo] = useState<{ source: L; hindi: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const params = { amount_paise: Math.round(amount) * 100, date };

  async function play() {
    if (state === "playing") { audio.current?.pause(); setState("idle"); return; }
    setState("loading"); setErr(null);
    try {
      await ensureSession();
      const res = await fetch("/api/voice/nudge", {
        method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nudge: "cash_short", params }),
      });
      if (res.status === 403) { setState("idle"); setConsent(true); return; }
      if (!res.ok) {
        // Bhashini not reachable and no recording for these values: the phone's voice, said plainly.
        const { hindiReviewed } = cashShortText(params);
        speak({ hi: hindiReviewed, en: cashShortText(params).english });
        setInfo({ hindi: hindiReviewed, source: { hi: "Phone ki awaaz (Bhashini abhi nahi juda)", en: "Phone voice (Bhashini not reachable right now)" } });
        setState("idle");
        return;
      }
      const r = (await res.json()) as NudgeResult;
      const a = new Audio(r.mode === "live" ? `data:${r.audio.mime};base64,${r.audio.base64}` : r.url);
      audio.current = a;
      a.onended = () => setState("idle");
      a.onerror = () => setState("idle");
      setInfo({
        hindi: r.hindi,
        source: r.mode === "live"
          ? { hi: "Bhashini · Bharat Sarkar · abhi bana", en: "Bhashini · Government of India · live" }
          : { hi: `Bhashini ki recording · ${r.recorded_on}`, en: `Recorded from Bhashini · ${r.recorded_on}` },
      });
      await a.play();
      setState("playing");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
      setState("idle");
    }
  }

  async function allow() {
    try {
      await gov.setDpdp("voice", "grant");
      setConsent(false);
      await play();
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
  }

  return (
    <>
      <button type="button" onClick={play} aria-label={t({ hi: "Hindi mein sunein", en: "Listen in Hindi" })}
        className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-3 min-h-9 text-xs font-bold shrink-0">
        {state === "loading" ? <Loader2 size={14} className="animate-spin" /> : state === "playing" ? <VolumeX size={14} /> : <Volume2 size={14} />}
        {lang === "hi" ? "Sunein" : "Sunein · Listen"}
      </button>
      {(info || err) && (
        <div className="basis-full mt-2 rounded-[16px] bg-lav/60 px-3 py-2 text-[12px] leading-snug">
          {info && <><p lang="hi" className="font-semibold">{info.hindi}</p><p className="mt-0.5 text-muted">🔊 {t(info.source)}</p></>}
          {err && <p className="text-danger font-semibold">{err}</p>}
        </div>
      )}
      <Sheet open={consent} onClose={() => setConsent(false)} title={<p className="text-xl font-extrabold">{t({ hi: "Hindi mein sunein?", en: "Listen in Hindi?" })}</p>}>
        <div className="space-y-3 text-[15px]">
          <p>{t({ hi: "Awaaz Bhashini se banegi — Bharat Sarkar ki bhasha seva (DPI).", en: "The voice comes from Bhashini — the Government of India's language service (DPI)." })}</p>
          <ul className="rounded-[20px] bg-white p-4 space-y-1.5 text-[14px]">
            <li>✓ {t({ hi: "Sirf rakam aur tareekh jaati hai — koi naam ya khaata nahi", en: "Only the amount and the date are sent — no name or account" })}</li>
            <li>✓ {t({ hi: "Kuch save nahi hota — na text, na awaaz", en: "Nothing is stored — not the text, not the audio" })}</li>
            <li>✓ {t({ hi: "Anuvaad koi ank badle to jaanchi hui Hindi boli jaati hai", en: "If a translation changes a number, the reviewed Hindi is spoken instead" })}</li>
            <li>✓ {t({ hi: "Parivaar → Consent mein kabhi bhi band karein; raseed Trust Ledger mein", en: "Stop anytime in Family → Consent; the receipt goes in your Trust Ledger" })}</li>
          </ul>
          <Btn variant="ink" className="w-full" onClick={allow}>{lang === "hi" ? "Haan, sunaao" : "Yes, read it out"}</Btn>
          <Btn variant="white" className="w-full" onClick={() => setConsent(false)}>{lang === "hi" ? "Abhi nahi" : "Not now"}</Btn>
        </div>
      </Sheet>
    </>
  );
}
