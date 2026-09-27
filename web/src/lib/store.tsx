"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { Badge, Dashboard, L } from "./types";

export type Lang = "hi" | "en";
export type Mode = "aasaan" | "saathi" | "pro";
type Celebration = { points: number; title: L; badge?: Badge } | null;

type Ctx = {
  lang: Lang; setLang: (l: Lang) => void;
  t: (v: L | undefined | null) => string;
  sub: (v: L | undefined | null) => string;
  hid: string; setHid: (id: string) => void;
  data: Dashboard | null; error: string | null; loading: boolean;
  refresh: () => Promise<void>;
  setData: (d: Dashboard) => void;
  onboarded: boolean; setOnboarded: (v: boolean) => void;
  mode: Mode; setMode: (m: Mode) => void;
  celebration: Celebration; celebrate: (c: Celebration) => void;
  award: (type: string, title: L, extra?: { ref?: string; amount?: number }) => Promise<void>;
  speak: (v: L | string) => void; speaking: boolean;
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
    if (demo) { write("dy.onboarded", true); if (["A", "B", "C"].includes(demo)) write("dy.hid", demo); }
    setHidS(read("dy.hid", "A")); setOnbS(read("dy.onboarded", false)); setHandleS(read("dy.handle", null)); setAssistedS(read("dy.assisted", false)); setOnline(navigator.onLine); setHydrated(true);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    if ("serviceWorker" in navigator && location.hostname !== "localhost") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  const setLang = (l: Lang) => { setLangS(l); write("dy.lang", l); };
  const setHid = (id: string) => { setHidS(id); write("dy.hid", id); };
  const setMode = (m: Mode) => { setModeS(m); write("dy.mode", m); };
  const setOnboarded = (v: boolean) => { setOnbS(v); write("dy.onboarded", v); };
  const setConsentHandle = (h: string | null) => { setHandleS(h); write("dy.handle", h); };
  const setAssisted = (v: boolean) => { setAssistedS(v); write("dy.assisted", v); };

  const refresh = useCallback(async () => {
    try { setError(null); setData(await api.dashboard(hid)); }
    catch (e) { setError(e instanceof Error ? e.message : "error"); }
    finally { setLoading(false); }
  }, [hid]);

  useEffect(() => { if (hydrated) { setLoading(true); refresh(); } }, [hydrated, refresh]);

  const t = useCallback((v: L | undefined | null) => (v ? v[lang] || v.en : ""), [lang]);
  const sub = useCallback((v: L | undefined | null) => (v ? v[lang === "hi" ? "en" : "hi"] : ""), [lang]);

  const speak = useCallback((v: L | string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const text = typeof v === "string" ? v : v[lang];
    const s = window.speechSynthesis;
    if (s.speaking) { s.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text.replace(/₹/g, lang === "hi" ? "rupaye " : "rupees "));
    u.lang = lang === "hi" ? "hi-IN" : "en-IN";
    const voice = s.getVoices().find((vo) => vo.lang === u.lang) ?? s.getVoices().find((vo) => vo.lang.startsWith(lang));
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
    setSpeaking(true); s.speak(u);
  }, [lang]);

  const award = useCallback(async (type: string, title: L, extra: { ref?: string; amount?: number } = {}) => {
    try {
      if (extra.ref) setDoneIds((d) => (d.includes(extra.ref!) ? d : [...d, extra.ref!]));
      const r = await api.gameEvent(hid, type, extra);
      if (r.delta > 0 || r.badge_unlocked) celebrate({ points: r.delta, title, badge: r.badge_unlocked });
      await refresh();
    } catch { /* game is non-critical */ }
  }, [hid, refresh]);

  const value = useMemo<Ctx>(() => ({
    lang, setLang, t, sub, hid, setHid, data, error, loading, refresh, setData, onboarded, setOnboarded, mode, setMode,
    celebration, celebrate, award, speak, speaking, consentHandle, setConsentHandle, doneIds, assisted, setAssisted, online,
  }), [lang, t, sub, hid, data, error, loading, refresh, onboarded, mode, celebration, award, speak, speaking, consentHandle, doneIds, assisted, online]);

  return <AppCtx.Provider value={value}>{hydrated ? children : null}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
}
