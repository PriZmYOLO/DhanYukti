"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Eye, Target, Hourglass, Volume2, Minus, Plus, ShieldCheck, Lock } from "lucide-react";
import HomeScene from "@/components/art/HomeScene";
import DemoHouseholds from "@/components/DemoHouseholds";
import Avatar from "@/components/art/Avatar";
import Scene from "@/components/art/Scene";
import Gullak from "@/components/art/Gullak";
import { LangToggle } from "@/components/TopBar";
import { Btn, HelpLink, SpeakBtn } from "@/components/ui/bits";
import { metricValue } from "@/components/home/HealthTiles";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { inr, primaryMember } from "@/lib/format";
import type { L } from "@/lib/types";

const STEPS = ["splash", "language", "login", "family", "passport", "connect", "reveal", "gullak"] as const;
type Step = (typeof STEPS)[number];

const LANGS = [
  { code: "hi", name: "हिंदी", en: "Hindi", sample: "Namaste! Main DhanYukti hoon, aapka paisa saathi.", ok: true },
  { code: "en", name: "English", en: "English", sample: "Hello! I am DhanYukti, your money companion.", ok: true },
  { code: "ta", name: "தமிழ்", en: "Tamil", sample: "வணக்கம்! நான் தன்யுக்தி.", ok: false },
  { code: "mr", name: "मराठी", en: "Marathi", sample: "नमस्कार! मी धनयुक्ती.", ok: false },
  { code: "bn", name: "বাংলা", en: "Bengali", sample: "নমস্কার! আমি ধনযুক্তি।", ok: false },
];

export default function Onboarding() {
  const router = useRouter();
  const app = useApp();
  const { t, lang, setLang, speak, hid, data, setOnboarded, setConsentHandle, refresh, celebrate, assisted, setAssisted } = app;
  const [step, setStep] = useState<Step>("splash");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [fam, setFam] = useState({ members: 4, earners: 1, school: 2 });
  const [work, setWork] = useState("naukri");
  const [loans, setLoans] = useState<boolean | null>(null);
  const [dpdp, setDpdp] = useState<boolean | null>(null);
  const [steps, setSteps] = useState<{ key: string; label: L; done: boolean }[]>([]);
  const [shown, setShown] = useState(0);
  const [mode, setMode] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);


  const go = (s: Step) => setStep(s);
  const back = () => { const i = STEPS.indexOf(step); if (i > 0) setStep(STEPS[i - 1]); };

  async function runFetch(handle: string) {
    setErr(null); setSteps([]); setShown(0);
    try {
      let st = await api.aaStatus(handle);
      for (let i = 0; i < 4 && st.status === "PENDING"; i++) { await new Promise((r) => setTimeout(r, 700)); st = await api.aaStatus(handle); }
      if (st.status !== "ACTIVE") { setErr(`Consent ${st.status}`); return; }
      const r = await api.aaFetch(handle);
      setMode(r.mode); setSteps(r.steps);
      for (let i = 1; i <= r.steps.length; i++) { await new Promise((res) => setTimeout(res, 650)); setShown(i); }
      await refresh();
      setTimeout(() => setStep("reveal"), 700);
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
  }

  // Returning from Anumati: /?step=connect&handle=...
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get("step"); const h = p.get("handle");
    if (s === "consent") setStep("passport");
    if (s === "connect" && h) { setConsentHandle(h); setStep("connect"); runFetch(h); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startAA() {
    setErr(null);
    try {
      const member = data?.household.members.find((m) => m.earner)?.id ?? "m1";
      const r = await api.aaStart(hid, member, mobile || "9999999999");
      setConsentHandle(r.consent_handle);
      if (r.mode === "live" && r.redirect_url.startsWith("http")) window.location.href = r.redirect_url;
      else router.push(`/anumati?handle=${encodeURIComponent(r.consent_handle)}&mobile=${encodeURIComponent(mobile || "9999999999")}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
  }

  const finish = () => { setOnboarded(true); router.push("/app"); };
  const idx = STEPS.indexOf(step);

  return (
    <div className="min-h-full flex flex-col">
      {step !== "splash" && (
        <div className="flex items-center gap-3 px-5 pt-4">
          <button onClick={back} className="grid place-items-center h-11 w-11 rounded-full bg-white shadow-soft" aria-label="Back"><ArrowLeft size={20} /></button>
          <div className="flex-1 flex gap-1.5">{STEPS.slice(1).map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${i < idx ? "bg-ink" : "bg-ink/15"}`} />)}</div>
          <LangToggle />
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={step} className="flex-1 flex flex-col px-5 pb-8" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>

          {step === "splash" && (<>
            <div className="flex justify-between items-center gap-2 pt-5"><p className="text-sm font-bold text-muted flex-1">{"// DhanYukti"}</p><HelpLink compact /><LangToggle /></div>
            <h1 className="mt-6 text-[44px] font-extrabold leading-[1.02] tracking-tight">{lang === "hi" ? <>Paisa kam padne se pehle,<br /><span className="text-clay">pata chal jaaye</span></> : <>Know before your<br /><span className="text-clay">money runs short</span></>}</h1>
            <p className="mt-3 text-[16px] text-muted">{t({ hi: "Roz ek aasaan kaam, aapki bhasha mein.", en: "One simple step a day, in your language." })}</p>
            <div className="flex-1 grid place-items-center"><HomeScene size={240} /></div>
            <Btn variant="ink" className="w-full" onClick={() => go("language")}>{lang === "hi" ? "Shuru karein →" : "Get started →"}</Btn>
            <div className="mt-4"><DemoHouseholds compact /></div>
            <p className="text-center text-xs text-muted mt-3">{t({ hi: "Parivaar ke liye muft · Anumati AA se surakshit", en: "Free for families · secured via Anumati AA" })}</p>
          </>)}

          {step === "language" && (<>
            <Title v={{ hi: "Apni bhasha chunein", en: "Choose your language" }} sub={{ hi: "Sunne ke liye 🔊 dabayein", en: "Tap 🔊 to hear it" }} />
            <div className="space-y-3 mt-5">
              {LANGS.map((l) => (
                <div key={l.code} className={`flex items-center gap-3 rounded-[24px] p-4 ${lang === l.code ? "bg-ink text-white" : "bg-white"} ${l.ok ? "" : "opacity-60"}`}>
                  <button onClick={() => l.ok && setLang(l.code as "hi" | "en")} className="flex-1 text-left min-h-10">
                    <p className="text-xl font-extrabold font-deva">{l.name}</p><p className="text-xs opacity-60">{l.en}{l.ok ? "" : " · v1.1"}</p>
                  </button>
                  <button onClick={() => speak(l.sample)} className={`grid place-items-center h-12 w-12 rounded-full ${lang === l.code ? "bg-haldi text-ink" : "bg-lav"}`}><Volume2 size={20} /></button>
                </div>
              ))}
            </div>
            <div className="flex-1" />
            <Btn variant="ink" className="w-full mt-6" onClick={() => go("login")}>{lang === "hi" ? "Aage" : "Next"}</Btn>
          </>)}

          {step === "login" && (<>
            <Title v={{ hi: "Aapka mobile number", en: "Your mobile number" }} sub={{ hi: "Aadhaar ya PAN ki zaroorat nahi", en: "No Aadhaar or PAN needed" }} />
            <div className="mt-6 flex items-center gap-3 rounded-[24px] bg-white p-4 shadow-soft">
              <span className="font-bold text-lg">🇮🇳 +91</span>
              <input inputMode="numeric" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} placeholder="98765 43210" className="flex-1 text-2xl font-bold num outline-none min-w-0 bg-transparent" />
            </div>
            {mobile.length === 10 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                <p className="text-sm font-bold mb-2">OTP <span className="text-muted font-normal">({lang === "hi" ? "demo: koi bhi 6 ank" : "demo: any 6 digits"})</span></p>
                <input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="w-full tracking-[0.6em] text-center text-3xl font-extrabold num rounded-[24px] bg-white p-4 shadow-soft outline-none" placeholder="••••••" />
              </motion.div>
            )}
            <button onClick={() => setAssisted(!assisted)} className={`mt-5 w-full flex items-center gap-3 rounded-[20px] p-3 text-left min-h-14 ${assisted ? "bg-haldi" : "bg-white"}`}>
              <span className="text-2xl">🤝</span>
              <span className="flex-1"><span className="block font-bold text-sm">{t({ hi: "Koi madad kar raha hai? (bank mitra / parivaar)", en: "Someone helping you? (bank mitra / family)" })}</span>
                <span className="block text-xs opacity-70">{t({ hi: "Sahayak mode chalu karein", en: "Turn on assisted mode" })}</span></span>
              <span className={`h-6 w-6 rounded-md grid place-items-center ${assisted ? "bg-ink text-white" : "border-2 border-ink/20"}`}>{assisted && <Check size={14} />}</span>
            </button>
            {assisted && mobile.length === 10 && <p className="mt-3 rounded-[20px] bg-ink text-white p-3 text-sm font-semibold">✋ {t({ hi: "OTP daalne se pehle phone khud le lijiye. Helper OTP na dekhein.", en: "Take the phone back before entering the OTP. The helper must not see it." })}</p>}
            <div className="mt-3 flex items-center gap-3 rounded-[20px] bg-mint/70 p-3 text-[13px]"><Lock size={18} className="text-leaf shrink-0" />{t({ hi: "Helper (bank mitra) kabhi aapka OTP ya balance nahi dekhte", en: "A helper never sees your OTP or balance" })}</div>
            <div className="flex-1" />
            <Btn variant="ink" className="w-full mt-6" disabled={mobile.length !== 10 || otp.length !== 6} onClick={() => go("family")}>{lang === "hi" ? "Aage" : "Next"}</Btn>
          </>)}

          {step === "family" && (<>
            <Title v={{ hi: "Aapka parivaar", en: "Your family" }} sub={{ hi: "Bas 5 tap", en: "Just 5 taps" }} />
            <div className="mt-4 flex -space-x-3 justify-center">{(data?.household.members ?? []).map((m) => <Avatar key={m.id} kind={m.avatar} size={60} ring />)}</div>
            <div className="mt-5 space-y-3">
              {([["members", { hi: "Ghar mein kitne log?", en: "People at home" }, "👨‍👩‍👧‍👦"], ["earners", { hi: "Kitne kamaate hain?", en: "How many earn?" }, "💼"], ["school", { hi: "School jaane wale bachche", en: "Children in school" }, "🎒"]] as const).map(([k, l, e]) => (
                <div key={k} className="flex items-center gap-3 rounded-[24px] bg-white p-3 shadow-soft">
                  <span className="text-3xl">{e}</span><span className="flex-1 font-bold text-[15px]">{t(l)}</span>
                  <button onClick={() => setFam({ ...fam, [k]: Math.max(0, fam[k] - 1) })} className="grid place-items-center h-11 w-11 rounded-full bg-lav"><Minus size={18} /></button>
                  <span className="w-6 text-center text-2xl font-extrabold num">{fam[k]}</span>
                  <button onClick={() => setFam({ ...fam, [k]: fam[k] + 1 })} className="grid place-items-center h-11 w-11 rounded-full bg-ink text-white"><Plus size={18} /></button>
                </div>
              ))}
            </div>
            <p className="mt-5 font-bold text-sm">{t({ hi: "Kaam kya hai?", en: "Type of work" })}</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[["naukri", "🏭", "Naukri", "Job"], ["dukaan", "🏪", "Dukaan", "Shop"], ["gig", "🛵", "Gig", "Gig"], ["mazdoori", "🧱", "Mazdoori", "Daily"]].map(([k, e, hi, en]) => (
                <button key={k} onClick={() => setWork(k)} className={`rounded-[20px] py-3 ${work === k ? "bg-haldi" : "bg-white"}`}><p className="text-2xl">{e}</p><p className="text-xs font-bold">{lang === "hi" ? hi : en}</p></button>
              ))}
            </div>
            <p className="mt-5 font-bold text-sm">{t({ hi: "Koi loan chal raha hai?", en: "Any running loans?" })}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[true, false].map((v) => <button key={String(v)} onClick={() => setLoans(v)} className={`min-h-13 rounded-[20px] font-bold ${loans === v ? "bg-ink text-white" : "bg-white"}`}>{v ? (lang === "hi" ? "Haan" : "Yes") : (lang === "hi" ? "Nahi" : "No")}</button>)}
            </div>
            <div className="flex-1" />
            <Btn variant="ink" className="w-full mt-6" disabled={loans === null} onClick={() => go("passport")}>{lang === "hi" ? "Aage" : "Next"}</Btn>
          </>)}

          {step === "passport" && (<>
            <Title v={{ hi: "Consent Passport", en: "Consent Passport" }} sub={{ hi: "Do alag permission — dono kabhi bhi band kar sakte hain", en: "Two separate permissions — stop either anytime" }} />
            <ConsentCard tone="rose" tag="DPDP" title={{ hi: "1. Parivaar ki jaankari", en: "1. Family profile" }}
              see={{ hi: "Parivaar, kaam, bhasha, phone ke signal", en: "Family, work, language, phone signals" }}
              why={{ hi: "Sahi bhasha aur sahi salah ke liye", en: "To pick the right language and guidance" }}
              until={{ hi: "Jab tak aap mita na dein", en: "Until you delete it" }}
              value={dpdp} onChange={(v) => { setDpdp(v); api.dpdp(hid, { profile: true, device_signals: v }).catch(() => {}); }} />
            <ConsentCard tone="ink" tag="AA · Anumati" title={{ hi: "2. Bank ka len-den", en: "2. Bank transactions" }}
              see={{ hi: "Aapke bank ka 6 mahine ka len-den, RD, bima", en: "6 months of bank transactions, RD, insurance" }}
              why={{ hi: "Taaki mahine ke aakhir mein paise kam na padein", en: "So you don't run short at month-end" }}
              until={{ hi: "3 mahine. Kabhi bhi band kar sakte hain", en: "3 months. Stop anytime" }} />
            {err && <p className="mt-3 text-sm text-danger font-semibold">{err} — {t({ hi: "API chal raha hai?", en: "Is the API running?" })}</p>}
            <div className="flex-1" />
            <Btn variant="haldi" className="w-full mt-5" disabled={dpdp === null} onClick={startAA}>{lang === "hi" ? "Haan — Anumati se jodein" : "Yes — connect via Anumati"}</Btn>
            <p className="text-center text-[11px] text-muted mt-2">{t({ hi: "Consent Anumati (RBI-licensed Account Aggregator) sambhaalta hai", en: "Consent handled by Anumati, an RBI-licensed Account Aggregator" })}</p>
          </>)}

          {step === "connect" && (<>
            <div className="flex-1 flex flex-col items-center pt-6">
              <div className="relative">
                <motion.div className="absolute inset-0 rounded-full border-4 border-haldi" animate={{ scale: [1, 1.35], opacity: [0.8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                <div className="grid place-items-center h-32 w-32 rounded-full bg-ink"><Scene kind="bank" size={96} /></div>
              </div>
              <h2 className="mt-6 text-2xl font-extrabold text-center">{t({ hi: "Aapka hisaab ban raha hai…", en: "Preparing your account…" })}</h2>
              {mode && <p className="mt-1 text-xs font-bold text-muted">{mode === "live" ? "Anumati + Perfios · live sandbox" : "Anumati + Perfios · replay (recorded sandbox)"}</p>}
              <div className="mt-6 w-full space-y-2">
                {steps.map((s, i) => (
                  <motion.div key={s.key} initial={{ opacity: 0.3 }} animate={{ opacity: i < shown ? 1 : 0.35 }} className="flex items-center gap-3 rounded-[20px] bg-white p-3">
                    <span className={`grid place-items-center h-8 w-8 rounded-full ${i < shown ? "bg-leaf text-white" : "bg-lav"}`}>{i < shown ? <Check size={16} /> : <span className="h-2 w-2 rounded-full bg-muted" />}</span>
                    <span className="text-sm font-semibold">{t(s.label)}</span>
                  </motion.div>
                ))}
              </div>
              {err && <div className="mt-4 text-center"><p className="text-danger font-semibold text-sm">{err}</p><Btn variant="ink" className="mt-3" onClick={() => setStep("passport")}>{lang === "hi" ? "Dobara" : "Retry"}</Btn></div>}
            </div>
          </>)}

          {step === "reveal" && data && (<>
            <Title v={{ hi: "Yeh raha aapka hisaab", en: "Here's your picture" }} sub={{ hi: `${primaryMember(data)?.name ?? ""} ji, parivaar ki paisa sehat`, en: `${primaryMember(data)?.name ?? ""}, your family's money health` }} />
            <div className="mt-5 rounded-[32px] bg-ink text-white p-5">
              <p className="text-[12px] text-haldi font-bold uppercase tracking-widest">{t(data.metrics.resilience_days.label)}</p>
              <p className="text-[64px] font-extrabold num leading-none mt-1">{data.metrics.resilience_days.value ?? "?"}<span className="text-lg ml-2 text-white/60">{lang === "hi" ? "din" : "days"}</span></p>
              <p className="text-sm text-white/70">{t(data.metrics.resilience_days.sub)}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(["safe_to_spend", "debt_load", "protection"] as const).map((k) => (
                  <div key={k} className="rounded-[18px] bg-white/10 p-2.5">
                    <p className="text-[11px] text-white/60 leading-tight">{t(data.metrics[k].label)}</p>
                    <p className="text-[15px] font-extrabold num mt-1">{metricValue(data.metrics[k], lang)}</p>
                  </div>
                ))}
              </div>
            </div>
            {data.nba[0] && (
              <div className="mt-4 rounded-[28px] bg-danger-soft p-4 flex items-center gap-3">
                <Scene kind={data.nba[0].icon} size={56} />
                <div className="flex-1"><p className="text-[11px] font-extrabold text-danger uppercase">{lang === "hi" ? "Pehla kaam" : "First task"}</p><p className="font-extrabold leading-snug">{t(data.nba[0].title)}</p></div>
                <SpeakBtn v={data.nba[0].title} size={40} />
              </div>
            )}
            <div className="flex-1" />
            <Btn variant="ink" className="w-full mt-6" onClick={() => {
              const b = data.game.badges.find((x) => x.id === "pehla_kadam") ?? data.game.badges[0];
              api.gameEvent(hid, "setup").then(() => refresh()).catch(() => {});
              celebrate({ points: 100, title: { hi: "Pehla Kadam!", en: "First Step!" }, badge: b ? { ...b, earned: true } : undefined });
              go("gullak");
            }}>{lang === "hi" ? "Badhiya! Aage" : "Great! Next"}</Btn>
          </>)}

          {step === "gullak" && data && (<>
            <Title v={{ hi: "Pehla Gullak chunein", en: "Pick your first Gullak" }} sub={{ hi: "Salary ke din thoda khud ko do", en: "On salary day, pay yourself a little first" }} />
            <div className="mt-6 grid grid-cols-3 gap-3">
              {data.jars.map((j) => (
                <div key={j.id} className="rounded-[24px] bg-clay-soft p-3 text-center">
                  <div className="mx-auto w-fit"><Gullak fill={j.saved / j.goal} size={70} /></div>
                  <p className="font-extrabold text-sm leading-tight mt-1">{t(j.name)}</p>
                  <p className="text-[11px] text-muted num">{inr(j.goal)}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[24px] bg-white p-4 flex items-center gap-3 shadow-soft">
              <ShieldCheck className="text-leaf" />
              <p className="text-sm flex-1">{t({ hi: "Paisa aapke apne bank RD / bachat mein rehta hai. DhanYukti kabhi paisa nahi pakadta.", en: "Money stays in your own bank RD / savings. DhanYukti never holds money." })}</p>
            </div>
            <div className="flex-1" />
            <Btn variant="clay" className="w-full mt-6" onClick={finish}>{lang === "hi" ? "Ghar chalein 🏠" : "Go home 🏠"}</Btn>
          </>)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Title({ v, sub }: { v: L; sub?: L }) {
  const { t } = useApp();
  return (
    <div className="mt-6 flex items-start gap-3">
      <div className="flex-1"><h1 className="text-[30px] font-extrabold leading-tight tracking-tight">{t(v)}</h1>{sub && <p className="text-muted mt-1">{t(sub)}</p>}</div>
      <SpeakBtn v={sub ? { hi: `${v.hi}. ${sub.hi}`, en: `${v.en}. ${sub.en}` } : v} />
    </div>
  );
}

function ConsentCard({ tone, tag, title, see, why, until, value, onChange }: {
  tone: "rose" | "ink"; tag: string; title: L; see: L; why: L; until: L; value?: boolean | null; onChange?: (v: boolean) => void;
}) {
  const { t, lang } = useApp();
  const dark = tone === "ink";
  return (
    <div className={`mt-4 rounded-[28px] p-4 ${dark ? "bg-ink text-white" : "bg-rose"}`}>
      <div className="flex items-center justify-between">
        <p className="font-extrabold text-[17px]">{t(title)}</p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${dark ? "bg-haldi text-ink" : "bg-white text-rose-deep"}`}>{tag}</span>
      </div>
      <div className="mt-3 space-y-2 text-[14px]">
        <p className="flex gap-2"><Eye size={18} className={`shrink-0 ${dark ? "text-haldi" : ""}`} /><span><b>{lang === "hi" ? "Kya dekhenge:" : "We'll see:"}</b> {t(see)}</span></p>
        <p className="flex gap-2"><Target size={18} className={`shrink-0 ${dark ? "text-haldi" : ""}`} /><span><b>{lang === "hi" ? "Kyon:" : "Why:"}</b> {t(why)}</span></p>
        <p className="flex gap-2"><Hourglass size={18} className={`shrink-0 ${dark ? "text-haldi" : ""}`} /><span><b>{lang === "hi" ? "Kab tak:" : "Until:"}</b> {t(until)}</span></p>
      </div>
      {onChange && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => onChange(true)} className={`min-h-12 rounded-[16px] font-bold ${value === true ? "bg-ink text-white" : "bg-white/70"}`}>✓ {lang === "hi" ? "Haan" : "Yes"}</button>
          <button onClick={() => onChange(false)} className={`min-h-12 rounded-[16px] font-bold ${value === false ? "bg-ink text-white" : "bg-white/70"}`}>{lang === "hi" ? "Phone signal nahi" : "No phone signals"}</button>
        </div>
      )}
    </div>
  );
}
