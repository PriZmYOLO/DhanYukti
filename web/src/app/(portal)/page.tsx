"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Eye, Target, Hourglass, Volume2, Minus, Plus, ShieldCheck, Lock, ExternalLink, Landmark } from "lucide-react";
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
import { aaLive, liveStage, LIVE_CONSENT, LIVE_STEPS, type AccountSummary, type SourceLink } from "@/lib/aa-live";
import BankSummaryCard from "@/components/BankSummaryCard";
import DemoDataChip from "@/components/DemoDataChip";
import { demoHouseholdName } from "@/lib/demo-data";
import { inr, primaryMember } from "@/lib/format";
import type { L } from "@/lib/types";
import { gov } from "@/lib/gov";
import { DpdpPurposes, useDpdp } from "@/components/gov/Dpdp";
import InviteBox from "@/components/gov/InviteBox";
import VoiceLanguages from "@/components/gov/VoiceLanguages";
import { EMPTY_ANSWERS, GOALS, answered, unansweredCount, type Answer, type GoalIntent, type OnboardingAnswers, type WorkKind } from "@/lib/onboarding/answers";
import type { ConsentChoices } from "@/lib/provisional/h03/types";

const STEPS = ["splash", "language", "login", "family", "passport", "connect", "reveal", "invite", "gullak"] as const;
type Step = (typeof STEPS)[number];

const LANGS = [
  { code: "hi", name: "हिंदी", en: "Hindi", sample: "Namaste! Main DhanYukti hoon, aapka paisa saathi.", ok: true },
  { code: "en", name: "English", en: "English", sample: "Hello! I am DhanYukti, your money companion.", ok: true },
];

export default function Onboarding() {
  const router = useRouter();
  const app = useApp();
  const { t, lang, setLang, speak, hid, data, setOnboarded, setConsentHandle, refresh, celebrate, assisted, setAssisted } = app;
  const [step, setStep] = useState<Step>("splash");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [ans, setAnsS] = useState<OnboardingAnswers>(() => readLocalAnswers());
  const setAns = (a: OnboardingAnswers) => { setAnsS(a); try { localStorage.setItem("dy.onboarding", JSON.stringify(a)); } catch { /* private mode */ } };
  const [saved, setSaved] = useState<"device" | "server" | "error">("device");
  const dpdp = useDpdp();
  // The three AA grants beside source access; every one starts off (default deny).
  const [grants, setGrants] = useState<Omit<ConsentChoices, "source_access">>({ household_computation: false, viewer_scope: "only_me", alerts_and_actions: false });
  const [steps, setSteps] = useState<{ key: string; label: L; done: boolean }[]>([]);
  const [shown, setShown] = useState(0);
  const [mode, setMode] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  // Live Anumati flow (Next.js /api/aa/*). null = still checking this deployment.
  const [live, setLive] = useState<boolean | null>(null);
  const [liveLink, setLiveLink] = useState<SourceLink | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [polling, setPolling] = useState<string | null>(null);
  // The member's own facts from a live, active link (worked out on the server).
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [summaryErr, setSummaryErr] = useState<string | null>(null);
  const liveActive = liveLink !== null && !liveLink.is_demo && liveLink.consent.status === "active";

  const go = (s: Step) => setStep(s);
  const profileOn = dpdp.status("member_profile") === "granted";

  // Answers are saved on the server only under DPDP "member_profile";
  // without it they stay on this phone. Skipped questions stay "unanswered".
  useEffect(() => {
    if (!profileOn) { setSaved("device"); return; }
    gov.saveOnboarding(ans).then(() => setSaved("server")).catch(() => setSaved("error"));
  }, [profileOn, ans]);
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
    // Is the live Anumati flow switched on for this deployment?
    aaLive.available().then(async (on) => {
      setLive(on);
      if (!on) return;
      // Came back (or reloaded) mid-approval: pick the live link up again.
      const pending = aaLive.pending();
      if (!pending || (s === "consent")) return;
      try {
        const link = await aaLive.get(pending);
        const stage = liveStage(link);
        if (stage === "ended" || stage === "done") { aaLive.rememberPending(null); return; }
        setLiveLink(link); setStep("connect"); setPolling(link.link_id);
      } catch { aaLive.rememberPending(null); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the live link while the member approves at Anumati and the bank sends data.
  useEffect(() => {
    if (!polling) return;
    const started = Date.now();
    let stop = false;
    const tick = async () => {
      if (stop) return;
      try {
        const link = await aaLive.get(polling);
        setLiveLink(link);
        const stage = liveStage(link);
        if (stage === "done") {
          aaLive.rememberPending(null); setPolling(null);
          setConsentHandle(link.link_id);
          await refresh();
          return;
        }
        if (stage === "ended") {
          aaLive.rememberPending(null); setPolling(null);
          setErr(link.consent.status === "denied"
            ? t({ hi: "Aapne Anumati par mana kiya. Koi data nahi aaya.", en: "You declined at Anumati. No data was fetched." })
            : t({ hi: "Consent chalu nahi hua. Dobara koshish karein.", en: "The consent didn't go through. Please try again." }));
          return;
        }
      } catch { /* keep trying */ }
      if (Date.now() - started > 10 * 60_000) { setPolling(null); return; }
      window.setTimeout(tick, 3000);
    };
    tick();
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling]);

  async function startAA() {
    setErr(null);
    if (live) return startLive();
    return startReplay();
  }

  /** Recorded sandbox (FastAPI replay): the fallback when live isn't set up or the network is bad. */
  async function startReplay() {
    setErr(null);
    try {
      const member = data?.household.members.find((m) => m.earner)?.id ?? "m1";
      const r = await api.aaStart(hid, member, mobile || "9999999999");
      setConsentHandle(r.consent_handle);
      if (r.mode === "live" && r.redirect_url.startsWith("http")) window.location.assign(r.redirect_url);
      else router.push(`/anumati?handle=${encodeURIComponent(r.consent_handle)}&mobile=${encodeURIComponent(mobile || "9999999999")}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
  }

  /**
   * Live: create the request, start it at Anumati with the member's mobile,
   * and open Anumati's hosted approval page. The UAT module has no return
   * URL, so Anumati opens in a new tab and this tab follows the link.
   */
  async function startLive() {
    // Open the tab inside the tap, before any await, so it isn't blocked as a popup.
    const tab = window.open("about:blank", "_blank");
    try {
      const link = await aaLive.create(grants);
      const h = await aaLive.approve(link.link_id, mobile);
      if (h.mode === "redirect") {
        aaLive.rememberPending(link.link_id);
        setLiveLink(h.link); setLiveUrl(h.redirect_url);
        if (tab) tab.location.href = h.redirect_url;
        else { window.location.assign(h.redirect_url); return; }
        setStep("connect"); setPolling(link.link_id);
        return;
      }
      tab?.close();
      if (h.mode === "needs_details") {
        setErr(t({ hi: "Bank mein registered 10 ank ka mobile number daalein", en: "Enter the 10-digit mobile number registered with your bank" }));
        setStep("login");
        return;
      }
      setErr(h.mode === "unavailable" ? h.reason : t({ hi: "Abhi jud nahi paaye", en: "Couldn't connect right now" }));
    } catch (e) {
      tab?.close();
      setErr(e instanceof Error ? e.message : "error");
    }
  }

  useEffect(() => {
    if (step !== "reveal" || !liveActive || !liveLink) return;
    let stop = false;
    setSummaryErr(null);
    aaLive.summary(liveLink.link_id)
      .then((s) => { if (!stop) setSummary(s); })
      .catch((e) => { if (!stop) setSummaryErr(e instanceof Error ? e.message : "error"); });
    return () => { stop = true; };
  }, [step, liveActive, liveLink]);

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
            <div className="mt-5"><VoiceLanguages compact /></div>
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
            {err && step === "login" && <p className="mt-3 text-sm text-danger font-semibold">{err}</p>}
            <div className="mt-3 flex items-center gap-3 rounded-[20px] bg-mint/70 p-3 text-[13px]"><Lock size={18} className="text-leaf shrink-0" />{t({ hi: "Helper (bank mitra) kabhi aapka OTP ya balance nahi dekhte", en: "A helper never sees your OTP or balance" })}</div>
            <div className="flex-1" />
            <Btn variant="ink" className="w-full mt-6" disabled={mobile.length !== 10 || otp.length !== 6} onClick={() => go("family")}>{lang === "hi" ? "Aage" : "Next"}</Btn>
          </>)}

          {step === "family" && (<>
            <Title v={{ hi: "Aapka parivaar", en: "Your family" }} sub={{ hi: "Jo pata ho woh batayein — chhodna bhi theek hai", en: "Answer what you know — skipping is fine" }} />
            <div className="mt-3 flex -space-x-3 justify-center">{(data?.household.members ?? []).map((m) => <Avatar key={m.id} kind={m.avatar} size={52} ring />)}</div>
            <div className="mt-4 space-y-2">
              <CountRow e="👨‍👩‍👧‍👦" l={{ hi: "Ghar mein kitne log?", en: "People at home" }} a={ans.members} set={(v) => setAns({ ...ans, members: v })} />
              <CountRow e="💼" l={{ hi: "Kitne kamaate hain?", en: "How many earn?" }} a={ans.earners} set={(v) => setAns({ ...ans, earners: v })} />
            </div>
            <p className="mt-4 font-bold text-sm">{t({ hi: "Kaun kamaane walon par nirbhar hai?", en: "Who depends on the earners?" })}</p>
            <div className="mt-2 space-y-2">
              <CountRow e="🧒" l={{ hi: "Bachche", en: "Children" }} a={ans.dependents.children} set={(v) => setAns({ ...ans, dependents: { ...ans.dependents, children: v } })} />
              <CountRow e="🎒" l={{ hi: "Unmein school jaane wale", en: "Of them, in school" }} a={ans.dependents.children_in_school} set={(v) => setAns({ ...ans, dependents: { ...ans.dependents, children_in_school: v } })} />
              <CountRow e="👵" l={{ hi: "Buzurg (60+)", en: "Elders (60+)" }} a={ans.dependents.elders} set={(v) => setAns({ ...ans, dependents: { ...ans.dependents, elders: v } })} />
              <CountRow e="🧑‍🦽" l={{ hi: "Aur koi nirbhar", en: "Other dependents" }} a={ans.dependents.other} set={(v) => setAns({ ...ans, dependents: { ...ans.dependents, other: v } })} />
            </div>
            <p className="mt-4 font-bold text-sm">{t({ hi: "Kaam kya hai?", en: "Type of work" })}</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {([["naukri", "🏭", "Naukri", "Job"], ["dukaan", "🏪", "Dukaan", "Shop"], ["gig", "🛵", "Gig", "Gig"], ["mazdoori", "🧱", "Mazdoori", "Daily"]] as const).map(([k, e, hi, en]) => {
                const on = ans.work.state === "answered" && ans.work.value === k;
                return <button key={k} onClick={() => setAns({ ...ans, work: on ? { state: "unanswered" } : answered<WorkKind>(k) })} className={`rounded-[20px] py-3 ${on ? "bg-haldi" : "bg-white"}`}><p className="text-2xl">{e}</p><p className="text-xs font-bold">{lang === "hi" ? hi : en}</p></button>;
              })}
            </div>
            <p className="mt-4 font-bold text-sm">{t({ hi: "Koi loan chal raha hai?", en: "Any running loans?" })}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([[answered(true), "Haan", "Yes"], [answered(false), "Nahi", "No"], [{ state: "dont_know" } as Answer<boolean>, "Pata nahi", "Not sure"]] as const).map(([v, hi, en]) => {
                const on = JSON.stringify(ans.loans) === JSON.stringify(v);
                return <button key={hi} onClick={() => setAns({ ...ans, loans: on ? { state: "unanswered" } : v })} className={`min-h-13 rounded-[20px] font-bold ${on ? "bg-ink text-white" : "bg-white"}`}>{lang === "hi" ? hi : en}</button>;
              })}
            </div>
            <p className="mt-4 font-bold text-sm">{t({ hi: "Sabse bada lakshya?", en: "Your biggest goal?" })}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {GOALS.map((g) => {
                const on = ans.goal.state === "answered" && ans.goal.value === g;
                return <button key={g} onClick={() => setAns({ ...ans, goal: on ? { state: "unanswered" } : answered<GoalIntent>(g) })} className={`min-h-12 rounded-[18px] px-3 text-left text-[13px] font-bold ${on ? "bg-clay text-white" : "bg-white"}`}>{GOAL_EMOJI[g]} {t(GOAL_LABEL[g])}</button>;
              })}
            </div>
            <p className="mt-4 rounded-[18px] bg-lav/70 p-3 text-[12px] leading-snug">
              {unansweredCount(ans) > 0
                ? t({ hi: `${unansweredCount(ans)} sawaal chhode — koi baat nahi. Unhe "jawaab nahi diya" maana jaayega, zero nahi.`, en: `${unansweredCount(ans)} left blank — that's fine. They're saved as "not answered", never as zero.` })
                : t({ hi: "Sab jawaab mil gaye. Shukriya!", en: "All answered. Thank you!" })}
            </p>
            <div className="flex-1" />
            <Btn variant="ink" className="w-full mt-5" onClick={() => go("passport")}>{lang === "hi" ? "Aage" : "Next"}</Btn>
          </>)}

          {step === "passport" && (<>
            <Title v={{ hi: "Consent Passport", en: "Consent Passport" }} sub={{ hi: "Alag alag permission — har ek kabhi bhi band kar sakte hain", en: "Separate permissions — stop any of them anytime" }} />
            <div className="mt-4 rounded-[28px] bg-rose p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-extrabold text-[17px]">{t({ hi: "1. DhanYukti kya rakhe", en: "1. What DhanYukti keeps" })}</p>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold bg-white text-rose-deep">DPDP</span>
              </div>
              <DpdpPurposes dpdp={dpdp} only={["member_profile", "voice", "cover_profile", "device_signals"]} compact tone="rose" />
              <p className="mt-2 text-[12px] font-semibold">
                {saved === "server" ? `✓ ${t({ hi: `Aapke jawaab save hue${unansweredCount(ans) ? ` (${unansweredCount(ans)} "jawaab nahi diya")` : ""}`, en: `Your answers are saved${unansweredCount(ans) ? ` (${unansweredCount(ans)} "not answered")` : ""}` })}`
                  : saved === "error" ? t({ hi: "Jawaab save nahi hue — dobara koshish karein", en: "Couldn't save your answers — try again" })
                  : t({ hi: "Profile consent ke bina jawaab sirf is phone par rahenge", en: "Without profile consent, answers stay only on this phone" })}
              </p>
            </div>
            <ConsentCard tone="ink" tag="AA · Anumati" title={{ hi: "2. Bank ka len-den", en: "2. Bank transactions" }}
              see={LIVE_CONSENT.see} why={LIVE_CONSENT.why} until={LIVE_CONSENT.until} />
            {live && (
              <div className="mt-2 rounded-[24px] bg-white p-3 space-y-1">
                <p className="text-[12px] font-bold text-muted px-1">{t({ hi: "Bank data ka istemaal — teeno pehle se band", en: "How the bank data may be used — all start off" })}</p>
                <GrantRow on={grants.household_computation} set={(v) => setGrants({ ...grants, household_computation: v })} l={{ hi: "Parivaar ke hisaab mein jodein", en: "Use in household calculations" }} />
                <GrantRow on={grants.alerts_and_actions} set={(v) => setGrants({ ...grants, alerts_and_actions: v })} l={{ hi: "Alert aur salah (sarkari bima check bhi)", en: "Alerts & suggestions (incl. the government insurance check)" }} />
                <GrantRow on={grants.viewer_scope === "household_adults"} set={(v) => setGrants({ ...grants, viewer_scope: v ? "household_adults" : "only_me" })} l={{ hi: "Ghar ke bade bhi nateeje dekh sakein", en: "Household adults may see the results" }} />
              </div>
            )}
            {err && <p className="mt-3 text-sm text-danger font-semibold">{err}{live ? "" : ` — ${t({ hi: "API chal raha hai?", en: "Is the API running?" })}`}</p>}
            <div className="flex-1" />
            <Btn variant="haldi" className="w-full mt-5" onClick={startAA}>{lang === "hi" ? "Haan — Anumati se jodein" : "Yes — connect via Anumati"}</Btn>
            {live && <button onClick={startReplay} className="mt-2 w-full min-h-11 text-[13px] font-bold text-muted underline">{t({ hi: "Net kharab? Recorded sandbox (replay) chalayein", en: "Bad network? Use the recorded sandbox (replay)" })}</button>}
            <p className="text-center text-[11px] text-muted mt-2">{t({ hi: "Consent Anumati (RBI-licensed Account Aggregator) sambhaalta hai", en: "Consent handled by Anumati, an RBI-licensed Account Aggregator" })}{live ? " · live sandbox" : ""}</p>
          </>)}

          {step === "connect" && liveLink && (<LiveConnect link={liveLink} url={liveUrl} err={err}
            onRetry={() => { setErr(null); setLiveLink(null); setStep("passport"); }}
            onNext={() => setStep("reveal")} />)}

          {step === "connect" && !liveLink && (<>
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
            {liveActive && liveLink ? (<>
              <BankSummaryCard link={liveLink} summary={summary} err={summaryErr} />
              {demoHouseholdName(data) && <p className="mt-3 text-[14px] font-semibold leading-snug">{t(liveLink.is_sandbox
                ? { hi: `Sandbox test bank mein ek asli parivaar ka poora saal nahi hota, isliye aage ka demo ${demoHouseholdName(data)} ke parivaar ke data par chalta hai.`, en: `Sandbox test banks don't carry a real family's year, so the rest of the demo uses ${demoHouseholdName(data)}'s household.` }
                : { hi: `Aapka poora hisaab abhi aapke bank data se nahi banta, isliye aage ka demo ${demoHouseholdName(data)} ke parivaar ke data par chalta hai.`, en: `Your full picture isn't built from your bank data yet, so the rest of the demo uses ${demoHouseholdName(data)}'s household.` })}</p>}
            </>) : (
              <p className="mt-4 text-xs font-bold text-muted">Anumati + Perfios · Recorded sandbox (replay)</p>
            )}
            <Title v={{ hi: "Yeh raha aapka hisaab", en: "Here's your picture" }} sub={{ hi: `${primaryMember(data)?.name ?? ""} ji, parivaar ki paisa sehat`, en: `${primaryMember(data)?.name ?? ""}, your family's money health` }} />
            <DemoDataChip short className="mt-2" />
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
              go("invite");
            }}>{lang === "hi" ? "Badhiya! Aage" : "Great! Next"}</Btn>
          </>)}

          {step === "invite" && (<>
            <Title v={{ hi: "Ghar ke aur logon ko bulaayein", en: "Invite others at home" }} sub={{ hi: "Har koi apna consent khud deta hai — kuch bhi apne aap share nahi hota", en: "Everyone gives their own consent — nothing is shared automatically" }} />
            <InviteBox enabled={profileOn} onEnable={() => void dpdp.set("member_profile", "grant")} />
            <div className="flex-1" />
            <Btn variant="ink" className="w-full mt-6" onClick={() => go("gullak")}>{lang === "hi" ? "Aage" : "Next"}</Btn>
            <button onClick={() => go("gullak")} className="mt-2 w-full min-h-11 text-sm font-bold text-muted">{lang === "hi" ? "Baad mein" : "Later"}</button>
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

/** Live Anumati progress: real consent state and the accounts the bank sent. */
function LiveConnect({ link, url, err, onRetry, onNext }: {
  link: SourceLink; url: string | null; err: string | null; onRetry: () => void; onNext: () => void;
}) {
  const { t, lang } = useApp();
  const stage = liveStage(link);
  const reached = stage === "ended" ? 0 : LIVE_STEPS.findIndex((s) => s.key === stage) + 1;
  const done = stage === "done";
  const accounts = link.import.accounts;
  return (
    <div className="flex-1 flex flex-col items-center pt-6">
      <div className="relative">
        {!done && <motion.div className="absolute inset-0 rounded-full border-4 border-haldi" animate={{ scale: [1, 1.35], opacity: [0.8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} />}
        <div className="grid place-items-center h-32 w-32 rounded-full bg-ink"><Scene kind="bank" size={96} /></div>
      </div>
      <h2 className="mt-6 text-2xl font-extrabold text-center">
        {stage === "sent" ? t({ hi: "Anumati par manzoor karein", en: "Approve at Anumati" })
          : done ? t({ hi: "Aapke khaate jud gaye", en: "Your accounts are linked" })
          : t({ hi: "Aapka hisaab ban raha hai…", en: "Preparing your account…" })}
      </h2>
      <p className="mt-1 text-xs font-bold text-muted">Anumati AA · {link.is_sandbox ? "live sandbox" : "live"}</p>
      {stage === "sent" && (
        <p className="mt-3 text-center text-sm text-muted">{t({ hi: "Anumati naye tab mein khula hai. Wahan OTP daal kar manzoor karein, phir yahan laut aayein.", en: "Anumati opened in a new tab. Enter the OTP there and approve, then come back here." })}</p>
      )}
      <div className="mt-6 w-full space-y-2">
        {LIVE_STEPS.map((s, i) => (
          <motion.div key={s.key} initial={{ opacity: 0.3 }} animate={{ opacity: i < reached ? 1 : 0.35 }} className="flex items-center gap-3 rounded-[20px] bg-white p-3">
            <span className={`grid place-items-center h-8 w-8 rounded-full ${i < reached ? "bg-leaf text-white" : "bg-lav"}`}>{i < reached ? <Check size={16} /> : <span className="h-2 w-2 rounded-full bg-muted" />}</span>
            <span className="text-sm font-semibold">{t(s.label)}</span>
          </motion.div>
        ))}
      </div>
      {accounts.length > 0 && (
        <div className="mt-4 w-full space-y-2">
          {accounts.map((a) => (
            <div key={a.account_id} className="flex items-center gap-3 rounded-[20px] bg-mint/70 p-3">
              <span className="grid place-items-center h-10 w-10 rounded-xl bg-white"><Landmark size={18} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold truncate">{a.account_label}</span>
                <span className="block text-xs text-muted">{a.data_from && a.data_to ? `${a.data_from} → ${a.data_to}` : a.status}</span>
              </span>
              {a.balance && <span className="font-extrabold num">{inr(Math.round(a.balance.amount_paise / 100))}</span>}
            </div>
          ))}
        </div>
      )}
      {stage === "sent" && url && (
        <a href={url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 min-h-11 text-sm font-bold shadow-soft">
          <ExternalLink size={16} />{lang === "hi" ? "Anumati dobara kholein" : "Open Anumati again"}
        </a>
      )}
      {err && <div className="mt-4 text-center"><p className="text-danger font-semibold text-sm">{err}</p><Btn variant="ink" className="mt-3" onClick={onRetry}>{lang === "hi" ? "Dobara" : "Retry"}</Btn></div>}
      <div className="flex-1" />
      {done && <Btn variant="ink" className="w-full mt-6" onClick={onNext}>{lang === "hi" ? "Hisaab dekhein →" : "See my picture →"}</Btn>}
    </div>
  );
}

function readLocalAnswers(): OnboardingAnswers {
  try {
    const raw = localStorage.getItem("dy.onboarding");
    if (raw) return { ...EMPTY_ANSWERS, ...(JSON.parse(raw) as OnboardingAnswers) };
  } catch { /* first run or private mode */ }
  return EMPTY_ANSWERS;
}

const GOAL_LABEL: Record<GoalIntent, L> = {
  education: { hi: "Bachchon ki padhai", en: "Children's education" },
  emergency_cushion: { hi: "Mushkil waqt ke liye bachat", en: "Emergency cushion" },
  repay_debt: { hi: "Karz utaarna", en: "Pay off loans" },
  big_purchase: { hi: "Badi kharidari", en: "A big purchase" },
  festival_wedding: { hi: "Tyohaar / shaadi", en: "Festival / wedding" },
  other: { hi: "Kuch aur", en: "Something else" },
};
const GOAL_EMOJI: Record<GoalIntent, string> = { education: "🎓", emergency_cushion: "🛟", repay_debt: "🧾", big_purchase: "🏍️", festival_wedding: "🪔", other: "✨" };

/** A count that can be skipped or "don't know" — never silently zero. */
function CountRow({ e, l, a, set }: { e: string; l: L; a: Answer<number>; set: (v: Answer<number>) => void }) {
  const { t, lang } = useApp();
  const n = a.state === "answered" ? a.value : null;
  const dk = a.state === "dont_know";
  return (
    <div className="flex items-center gap-2 rounded-[22px] bg-white p-2.5 pl-3 shadow-soft">
      <span className="text-2xl">{e}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-[14px] leading-tight">{t(l)}</span>
        <button onClick={() => set(dk ? { state: "unanswered" } : { state: "dont_know" })} className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${dk ? "bg-ink text-white" : "bg-lav text-muted"}`}>{dk ? "✓ " : ""}{lang === "hi" ? "Pata nahi" : "Not sure"}</button>
      </span>
      <button aria-label="−" onClick={() => set(n === null ? answered(0) : n === 0 ? { state: "unanswered" } : answered(n - 1))} className="grid place-items-center h-10 w-10 rounded-full bg-lav shrink-0"><Minus size={16} /></button>
      <span className={`w-6 text-center font-extrabold num ${n === null ? "text-muted text-lg" : "text-2xl"}`}>{n ?? (dk ? "?" : "–")}</span>
      <button aria-label="+" onClick={() => set(answered((n ?? 0) + 1))} className="grid place-items-center h-10 w-10 rounded-full bg-ink text-white shrink-0"><Plus size={16} /></button>
    </div>
  );
}

function GrantRow({ on, set, l }: { on: boolean; set: (v: boolean) => void; l: L }) {
  const { t } = useApp();
  return (
    <button onClick={() => set(!on)} role="switch" aria-checked={on} className="w-full flex items-center gap-3 rounded-[16px] px-1 min-h-11 text-left">
      <span className="flex-1 text-[13px] font-semibold leading-snug">{t(l)}</span>
      <span className={`h-6 w-6 rounded-md grid place-items-center shrink-0 ${on ? "bg-ink text-white" : "border-2 border-ink/20"}`}>{on && <Check size={14} />}</span>
    </button>
  );
}

