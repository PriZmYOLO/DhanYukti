"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { gov, GovError } from "./gov";
import VoiceLayer from "@/components/gov/VoiceLayer";
import { api, ME, MeError } from "./api";
import type { Badge, Dashboard, L } from "./types";

export type Lang = "hi" | "en";
export type Mode = "aasaan" | "saathi" | "pro";
type Celebration = { points: number; title: L; badge?: Badge } | null;
/** Where the last read-out came from, shown on screen while it plays. */
export type VoiceState = {
  source: "bhashini" | "device" | null;
  note: L | null;
  prompt: boolean;
  /** Language of the last Bhashini read-out, and its text in that script. */
  lang: string | null;
  caption: string | null;
};

type Ctx = {
  lang: Lang; setLang: (l: Lang) => void;
  t: (v: L | undefined | null) => string;
  sub: (v: L | undefined | null) => string;
  hid: string; setHid: (id: string) => void;
  data: Dashboard | null; error: string | null; loading: boolean;
  /** Why the linked member's own household can't be shown (never replaced by a demo). */
  meIssue: MeError | null;
  /** This browser has a linked bank account (live Anumati), so "me" is the default household. */
  linked: boolean;
  /** Switch to the member's own household after a live link. */
  showMyHousehold: () => void;
  refresh: () => Promise<void>;
  setData: (d: Dashboard) => void;
  onboarded: boolean; setOnboarded: (v: boolean) => void;
  mode: Mode; setMode: (m: Mode) => void;
  celebration: Celebration; celebrate: (c: Celebration) => void;
  award: (type: string, title: L, extra?: { ref?: string; amount?: number }) => Promise<void>;
  speak: (v: L | string) => void; speaking: boolean;
  voice: VoiceState; answerVoicePrompt: (allow: boolean) => void;
  /** Read-out language (any Bhashini language). Screen text stays Hindi/English. */
  voiceLang: string; setVoiceLang: (code: string) => void;
  /** Read one text aloud in a given language (e.g. to try a language). */
  speakIn: (v: L, code: string) => void;
  consentHandle: string | null; setConsentHandle: (h: string | null) => void;
  doneIds: string[];
  assisted: boolean; setAssisted: (v: boolean) => void;
  online: boolean;
};

const AppCtx = createContext<Ctx | null>(null);

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v == null ? fallback : (JSON.parse(v) as T); } catch { return fallback; }
}
function write(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } }

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangS] = useState<Lang>("hi");
  const [hid, setHidS] = useState("A");
  const [mode, setModeS] = useState<Mode>("saathi");
  const [onboarded, setOnbS] = useState(true);
  const [consentHandle, setHandleS] = useState<string | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meIssue, setMeIssue] = useState<MeError | null>(null);
  const [linked, setLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [celebration, celebrate] = useState<Celebration>(null);
  const [speaking, setSpeaking] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [assisted, setAssistedS] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setLangS(read("dy.lang", "hi")); setHidS(read("dy.hid", "A")); setModeS(read("dy.mode", "saathi"));
    const demo = new URLSearchParams(location.search).get("demo");
    if (demo) { write("dy.onboarded", true); if (["A", "B", "C"].includes(demo)) { write("dy.hid", demo); write("dy.demoChosen", true); } }
    setOnbS(read("dy.onboarded", false)); setHandleS(read("dy.handle", null)); setAssistedS(read("dy.assisted", false)); setOnline(navigator.onLine);
    // A linked member sees their own household unless they deliberately opened a demo family.
    const stored = read<string | null>("dy.hid", null);
    const chose = read("dy.demoChosen", false);
    const start = (h: string) => { setHidS(h); setHydrated(true); };
    if (demo || (stored && stored !== ME && chose)) { start(read("dy.hid", "A")); api.meStatus().then((s) => setLinked(s.linked)).catch(() => {}); }
    else api.meStatus()
      .then((s) => { setLinked(s.linked); start(s.linked || stored === ME ? ME : stored ?? "A"); })
      .catch(() => start(stored ?? "A"));
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    if ("serviceWorker" in navigator && location.hostname !== "localhost") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  const setLang = (l: Lang) => { setLangS(l); write("dy.lang", l); };
  const setHid = (id: string) => { setHidS(id); write("dy.hid", id); write("dy.demoChosen", id !== ME); };
  const showMyHousehold = useCallback(() => { setHidS(ME); write("dy.hid", ME); write("dy.demoChosen", false); setLinked(true); }, []);
  const setMode = (m: Mode) => { setModeS(m); write("dy.mode", m); };
  const setOnboarded = (v: boolean) => { setOnbS(v); write("dy.onboarded", v); };
  const setConsentHandle = (h: string | null) => { setHandleS(h); write("dy.handle", h); };
  const setAssisted = (v: boolean) => { setAssistedS(v); write("dy.assisted", v); };

  const refresh = useCallback(async () => {
    try { setError(null); setMeIssue(null); setData(await api.dashboard(hid)); }
    catch (e) {
      setError(e instanceof Error ? e.message : "error");
      if (e instanceof MeError) { setMeIssue(e); setData(null); }
    }
    finally { setLoading(false); }
  }, [hid]);

  // Switching household: drop the old one's numbers first, so nobody sees another family's data.
  useEffect(() => { if (hydrated) { setData(null); setLoading(true); refresh(); } }, [hydrated, refresh]);

  const t = useCallback((v: L | undefined | null) => (v ? v[lang] || v.en : ""), [lang]);
  const sub = useCallback((v: L | undefined | null) => (v ? v[lang === "hi" ? "en" : "hi"] : ""), [lang]);

  const [voice, setVoice] = useState<VoiceState>({ source: null, note: null, prompt: false, lang: null, caption: null });
  // A language the person picked for read-outs; until they pick one, read-outs follow the screen language.
  const [pickedVoice, setPickedVoice] = useState<string | null>(null);
  useEffect(() => { setPickedVoice(read<string | null>("dy.voiceLang", null)); }, []);
  const voiceLang = pickedVoice ?? lang;
  const setVoiceLang = (code: string) => { setPickedVoice(code); write("dy.voiceLang", code); };
  const pendingLang = useRef<string>("hi");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clips = useRef(new Map<string, { url: string; caption: string | null }>());
  const pending = useRef<L | null>(null);
  const voiceConsent = useRef<"unknown" | "granted" | "declined">("unknown");

  const stopAll = useCallback(() => {
    audioRef.current?.pause(); audioRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  /** The phone's own voice: used for English, and as a labelled fallback. */
  const deviceSpeak = useCallback((text: string, speakLang: Lang, note: L | null) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const s = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text.replace(/₹/g, speakLang === "hi" ? "rupaye " : "rupees "));
    u.lang = speakLang === "hi" ? "hi-IN" : "en-IN";
    const vo = s.getVoices().find((x) => x.lang === u.lang) ?? s.getVoices().find((x) => x.lang.startsWith(speakLang));
    if (vo) u.voice = vo;
    u.rate = 0.95;
    u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
    setVoice((x) => ({ ...x, source: "device", note, lang: null, caption: null })); setSpeaking(true); s.speak(u);
  }, []);

  /** Names of this household's members are removed before text leaves the phone. */
  const scrub = useCallback((text: string) => {
    let out = text;
    for (const m of data?.household.members ?? []) {
      if (m.name.length < 2) continue;
      out = out.replace(new RegExp(`\\b${m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s+ji)?\\b`, "gi"), "your family member");
    }
    return out;
  }, [data]);

  const bhashini = useCallback(async (v: L, code: string) => {
    const text = scrub(v.en);
    try {
      const key = `${code}|${text}`;
      let hit = clips.current.get(key);
      if (!hit) {
        const r = await gov.speak(text, code);
        hit = { url: `data:${r.audio.mime};base64,${r.audio.base64}`, caption: r.text };
        clips.current.set(key, hit);
      }
      const a = new Audio(hit.url);
      audioRef.current = a;
      a.onended = () => setSpeaking(false); a.onerror = () => setSpeaking(false);
      setVoice((x) => ({ ...x, source: "bhashini", note: null, lang: code, caption: code === "en" ? null : hit!.caption })); setSpeaking(true);
      await a.play();
    } catch (e) {
      const c = e instanceof GovError ? e.code : "network";
      if (c === "consent_required") voiceConsent.current = "unknown";
      const note: L = c === "voice_unavailable" ? { hi: "Bhashini is deployment par juda nahi — phone ki awaaz", en: "Bhashini isn't connected here — phone voice" }
        : c === "numbers_changed" ? { hi: "Anuvaad ne ek ank badla, isliye phone ki awaaz", en: "Translation changed a number — phone voice instead" }
        : c === "language_unavailable" ? { hi: "Is bhasha ki awaaz Bhashini par abhi nahi — phone ki awaaz (Hindi)", en: "Bhashini has no voice for this language now — phone voice (Hindi)" }
        : { hi: "Bhashini se jawaab nahi — phone ki awaaz", en: "Bhashini didn't answer — phone voice" };
      deviceSpeak(v.hi, "hi", note);
    }
  }, [scrub, deviceSpeak]);

  /** Every read-out in an Indian language goes through Bhashini (DPI) under DPDP consent "voice". */
  const speakIn = useCallback((v: L, code: string) => {
    if (speaking) { stopAll(); return; }
    if (voiceConsent.current === "declined") { deviceSpeak(v.hi, "hi", { hi: "Aapne phone ki awaaz chuni", en: "You chose the phone voice" }); return; }
    if (voiceConsent.current === "granted") { void bhashini(v, code); return; }
    pending.current = v; pendingLang.current = code;
    gov.dpdp().then((st) => {
      if (st.purposes.find((p) => p.id === "voice")?.status === "granted") { voiceConsent.current = "granted"; pending.current = null; void bhashini(v, code); }
      else setVoice((x) => ({ ...x, prompt: true }));
    }).catch(() => { pending.current = null; deviceSpeak(v.hi, "hi", { hi: "Consent check nahi hua — phone ki awaaz", en: "Couldn't check consent — phone voice" }); });
  }, [speaking, stopAll, deviceSpeak, bhashini]);

  const speak = useCallback((v: L | string) => {
    if (speaking) { stopAll(); return; }
    // English read-outs use the phone's English voice; every Indian language goes to Bhashini.
    if (typeof v !== "string" && voiceLang !== "en") { speakIn(v, voiceLang); return; }
    const text = typeof v === "string" ? v : v.en;
    deviceSpeak(text, typeof v === "string" ? lang : "en", null);
  }, [lang, voiceLang, speaking, stopAll, deviceSpeak, speakIn]);

  const answerVoicePrompt = useCallback((allow: boolean) => {
    const v = pending.current; pending.current = null;
    setVoice((x) => ({ ...x, prompt: false }));
    if (!v) return;
    if (!allow) { voiceConsent.current = "declined"; deviceSpeak(v.hi, "hi", { hi: "Aapne phone ki awaaz chuni", en: "You chose the phone voice" }); return; }
    gov.setDpdp("voice", "grant").then(() => { voiceConsent.current = "granted"; void bhashini(v, pendingLang.current); })
      .catch(() => deviceSpeak(v.hi, "hi", { hi: "Consent save nahi hua — phone ki awaaz", en: "Consent wasn't saved — phone voice" }));
  }, [bhashini, deviceSpeak]);

  const award = useCallback(async (type: string, title: L, extra: { ref?: string; amount?: number } = {}) => {
    try {
      if (extra.ref) setDoneIds((d) => (d.includes(extra.ref!) ? d : [...d, extra.ref!]));
      const r = await api.gameEvent(hid, type, extra);
      if (r.delta > 0 || r.badge_unlocked) celebrate({ points: r.delta, title, badge: r.badge_unlocked });
      await refresh();
    } catch { /* game is non-critical */ }
  }, [hid, refresh]);

  const value = useMemo<Ctx>(() => ({
    lang, setLang, t, sub, hid, setHid, data, error, loading, refresh, setData, onboarded, setOnboarded, mode, setMode, meIssue, linked, showMyHousehold,
    celebration, celebrate, award, speak, speaking, voice, answerVoicePrompt, voiceLang, setVoiceLang, speakIn, consentHandle, setConsentHandle, doneIds, assisted, setAssisted, online,
  }), [lang, t, sub, hid, data, error, loading, refresh, onboarded, mode, meIssue, linked, showMyHousehold, celebration, award, speak, speaking, voice, answerVoicePrompt, voiceLang, speakIn, consentHandle, doneIds, assisted, online]);

  return <AppCtx.Provider value={value}>{hydrated ? <>{children}<VoiceLayer /></> : null}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
}
