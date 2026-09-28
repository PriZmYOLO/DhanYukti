"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Eye, Target, Hourglass, ShieldOff, Check, RefreshCcw, Plug } from "lucide-react";
import TopBar from "@/components/TopBar";
import Enrich from "@/components/Enrich";
import ConsentReceipt from "@/components/ConsentReceipt";
import DeclaredEntry from "@/components/extras/DeclaredEntry";
import BsaUpload from "@/components/extras/BsaUpload";
import PrivacyControls from "@/components/extras/PrivacyControls";
import DataSource from "@/components/home/DataSource";
import InstallButton from "@/components/InstallButton";
import Avatar from "@/components/art/Avatar";
import Sheet from "@/components/ui/Sheet";
import { Btn, HelpLink, SectionTitle, Skeleton } from "@/components/ui/bits";
import { useApp, type Mode } from "@/lib/store";
import OpenAnumati from "@/components/OpenAnumati";
import { demoHouseholdName } from "@/lib/demo-data";
import { api } from "@/lib/api";
import { day, inr } from "@/lib/format";
import type { Capability, ConsentArtefact, HouseholdSummary, Member } from "@/lib/types";
import { DpdpPurposes, ValueLedger, useDpdp } from "@/components/gov/Dpdp";
import LiveLinkCard from "@/components/gov/LiveLink";
import InviteBox from "@/components/gov/InviteBox";
import VoiceLanguages from "@/components/gov/VoiceLanguages";
import MyAnswers from "@/components/gov/MyAnswers";
import MyReports from "@/components/gov/MyReports";
import { gov } from "@/lib/gov";
import type { SourceLink } from "@/lib/provisional/h03/types";

const TABS = [
  { k: "family", hi: "Parivaar", en: "Family" }, { k: "consent", hi: "Consent", en: "Consent" },
  { k: "data", hi: "Data", en: "Data" }, { k: "settings", hi: "Settings", en: "Settings" },
] as const;

const SHARE: { k: Member["sharing"]; hi: string; en: string }[] = [
  { k: "poora", hi: "Poora", en: "Full" }, { k: "sirf_total", hi: "Sirf total", en: "Totals" }, { k: "private", hi: "Sirf mere liye", en: "Private" },
];

export default function Family() {
  const { data, hid, setHid, t, lang, mode, setMode, setOnboarded, consentHandle, setConsentHandle, refresh, linked, showMyHousehold } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["k"]>("family");
  const [homes, setHomes] = useState<HouseholdSummary[]>([]);
  const [pass, setPass] = useState<{ aa: ConsentArtefact[] } | null>(null);
  const [liveLinks, setLiveLinks] = useState<SourceLink[]>([]);
  const dpdp = useDpdp();
  const [caps, setCaps] = useState<Capability[]>([]);
  const [sharing, setSharing] = useState<Record<string, Member["sharing"]>>({});
  const [revoke, setRevoke] = useState<ConsentArtefact | null>(null);
  const [revoked, setRevoked] = useState<string[] | null>(null);
  const [receipt, setReceipt] = useState<ConsentArtefact | null>(null);

  useEffect(() => { api.households().then(setHomes).catch(() => {}); api.capabilities().then(setCaps).catch(() => {}); }, []);
  useEffect(() => { api.passport(hid).then(setPass).catch(() => {}); }, [hid, consentHandle]);
  useEffect(() => { if (tab === "consent") gov.links().then(setLiveLinks).catch(() => {}); }, [tab]);
  const reloadDpdp = dpdp.reload;
  useEffect(() => { if (tab === "consent") reloadDpdp(); }, [tab, reloadDpdp]);

  if (!data) return <div className="p-5 space-y-4"><Skeleton h={200} /><Skeleton h={300} /></div>;
  // Demo households on replay/fixture data: the revoke never reaches Anumati.
  const replay = demoHouseholdName(data) !== null && data.data_source.mode !== "live";

  // Household Consent Bundle: each earning adult consents for their own accounts.
  const askConsent = async (memberId: string) => {
    // Live Anumati: each adult links from their own phone through onboarding.
    if ((await gov.aaStatus().catch(() => null))?.live_ui_enabled) { router.push("/?step=consent"); return; }
    const r = await api.aaStart(hid, memberId, "9999999999");
    if (r.mode === "live" && r.redirect_url.startsWith("http")) window.open(r.redirect_url, "_blank");
    else router.push(`/anumati?handle=${encodeURIComponent(r.consent_handle)}&mobile=9999999999&return=/app/family`);
  };

  const doRevoke = async () => {
    if (!revoke) return;
    const r = await api.aaRevoke(revoke.handle);
    setRevoked(r.deleted);
    if (revoke.handle === consentHandle) setConsentHandle(null);
    api.passport(hid).then(setPass); refresh();
  };

  return (
    <div>
      <TopBar title={lang === "hi" ? "Parivaar" : "Family"} speakText={{ hi: "Yahan parivaar ke sadasya, consent aur privacy hai. Consent kabhi bhi band kar sakte hain.", en: "Family members, consents and privacy. You can revoke consent anytime." }} />

      <div className="mx-5 lg:mx-0 mt-3 grid grid-cols-4 rounded-full bg-white p-1 shadow-soft">
        {TABS.map((x) => (
          <button key={x.k} onClick={() => setTab(x.k)} className={`min-h-11 rounded-full text-[13px] font-bold ${tab === x.k ? "bg-ink text-white" : "text-muted"}`}>{lang === "hi" ? x.hi : x.en}</button>
        ))}
      </div>
      {tab === "family" && (<>
      <SectionTitle v={linked ? { hi: "Kiska hisaab dekhein", en: "Whose picture" } : { hi: "Demo parivaar badlein", en: "Switch demo household" }} />
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-5">
        {linked && (
          <button onClick={showMyHousehold} className={`shrink-0 w-56 rounded-[28px] p-4 text-left transition ${hid === "me" ? "bg-ink text-white shadow-lift" : "bg-white"}`}>
            <p className="text-[11px] font-bold opacity-60">{lang === "hi" ? "Aapke bank data se" : "From your own bank data"}</p>
            <p className="font-extrabold text-[17px] mt-0.5">{lang === "hi" ? "Mera parivaar" : "My household"}</p>
            <p className="text-xs mt-2 opacity-80">{lang === "hi" ? "Anumati se juda khaata" : "Linked through Anumati"}</p>
          </button>
        )}
        {homes.map((h) => (
          <button key={h.id} onClick={() => setHid(h.id)} className={`shrink-0 w-56 rounded-[28px] p-4 text-left transition ${hid === h.id ? "bg-ink text-white shadow-lift" : "bg-white"}`}>
            <p className="text-[11px] font-bold opacity-60">{lang === "hi" ? "Demo · " : "Demo · "}{t(h.city)} · {inr(h.income)}/{lang === "hi" ? "mahina" : "mo"}</p>
            <p className="font-extrabold text-[17px] mt-0.5">{t(h.family_name)}</p>
            <p className="text-xs mt-2 opacity-80 line-clamp-2">{t(h.problem)}</p>
            <p className={`text-[11px] font-bold mt-2 ${hid === h.id ? "text-haldi" : "text-clay"}`}>→ {t(h.hero)}</p>
          </button>
        ))}
      </div>

      <SectionTitle v={{ hi: "Sadasya aur sharing", en: "Members & sharing" }} />
      <div className="mx-5 lg:mx-0 space-y-2">
        {data.household.members.map((m) => {
          const s = sharing[m.id] ?? m.sharing;
          return (
            <div key={m.id} className="rounded-[24px] bg-white p-3 shadow-soft">
              <div className="flex items-center gap-3">
                <Avatar kind={m.avatar} size={46} />
                <div className="flex-1"><p className="font-extrabold">{m.name}{m.age ? <span className="text-muted font-semibold text-sm"> · {m.age}</span> : null}</p><p className="text-xs text-muted">{t(m.role)}</p></div>
                {m.earner && <span className="rounded-full bg-mint text-leaf text-[11px] font-extrabold px-2 py-1">{lang === "hi" ? "KAMAANE WALE" : "EARNER"}</span>}
              </div>
              {m.earner && (
                <div className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-lav p-1">
                  {SHARE.map((o) => (
                    <button key={o.k} onClick={() => setSharing({ ...sharing, [m.id]: o.k })} className={`min-h-11 rounded-full text-[12px] font-bold ${s === o.k ? "bg-ink text-white" : "text-muted"}`}>{lang === "hi" ? o.hi : o.en}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SectionTitle v={{ hi: "Aapke jawaab", en: "Your answers" }} />
      <div className="mx-5 lg:mx-0"><MyAnswers onEdit={() => { setOnboarded(false); router.push("/"); }} /></div>
      <SectionTitle v={{ hi: "Parivaar ko bulaayein", en: "Invite family" }} />
      <div className="mx-5 lg:mx-0 -mt-5"><InviteBox enabled={dpdp.status("member_profile") === "granted"} onEnable={() => void dpdp.set("member_profile", "grant")} /></div>
      </>)}
      {tab === "consent" && (<>
      <SectionTitle v={{ hi: "Consent Passport", en: "Consent Passport" }} right={<span className="text-[11px] font-bold text-muted">AA + DPDP</span>} />
      <div className="mx-5 lg:mx-0 space-y-3">
        {liveLinks.map((l) => <LiveLinkCard key={l.link_id} link={l} onChange={(n) => { setLiveLinks((all) => all.map((x) => (x.link_id === n.link_id ? n : x))); reloadDpdp(); }} />)}
        {!pass && <Skeleton h={180} />}
        {pass?.aa.map((c) => (
          <div key={c.handle} className="rounded-[28px] bg-ink text-white p-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-2 bg-[repeating-linear-gradient(0deg,#F7C548_0_8px,transparent_8px_14px)] opacity-60" />
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-haldi text-ink text-[11px] font-extrabold px-2.5 py-1">AA · {c.aa}</span>
              <span className={`rounded-full text-[11px] font-extrabold px-2.5 py-1 ${c.status === "ACTIVE" ? "bg-mint text-leaf" : c.status === "REVOKED" ? "bg-danger-soft text-danger" : "bg-white/15"}`}>{c.status}</span>
              <span className="rounded-full bg-white/10 text-[10px] font-extrabold px-2 py-1 text-white/70" title="Recorded sandbox data for this demo household">REPLAY</span>
              <span className="ml-auto text-xs text-white/60">{c.member_name}</span>
            </div>
            <div className="mt-3 space-y-2 text-[13px]">
              <p className="flex gap-2"><Eye size={16} className="text-haldi shrink-0" /><span>{c.fi_types.join(" · ")} · {c.range_months} {lang === "hi" ? "mahine" : "months"}</span></p>
              <p className="flex gap-2"><Target size={16} className="text-haldi shrink-0" /><span>{t(c.purpose)}</span></p>
              <p className="flex gap-2"><Hourglass size={16} className="text-haldi shrink-0" /><span>{lang === "hi" ? "Tak" : "Until"} {day(c.expiry)} · {t(c.data_life)}</span></p>
            </div>
            <p className="mt-2 text-[11px] text-white/40 font-mono truncate">{c.handle}</p>
            <button onClick={() => setReceipt(c)} className="mt-3 w-full min-h-11 rounded-[18px] bg-haldi text-ink font-bold text-sm">🧾 {lang === "hi" ? "Raseed dekho / bhejo" : "View / share receipt"}</button>
            {c.status === "ACTIVE" && (
              <button onClick={() => { setRevoked(null); setRevoke(c); }} className="mt-2 w-full min-h-12 rounded-[18px] bg-white/10 border border-white/20 font-bold flex items-center justify-center gap-2">
                <ShieldOff size={18} />{lang === "hi" ? "Consent band karein" : "Revoke consent"}
              </button>
            )}
          </div>
        ))}
        {pass && pass.aa.length === 0 && (
          <button onClick={() => router.push("/?step=consent")} className="w-full rounded-[28px] border-2 border-dashed border-ink/20 p-5 text-center font-bold">
            + {lang === "hi" ? "Bank jodein (Anumati AA)" : "Link bank (Anumati AA)"}
          </button>
        )}
        <div className="rounded-[28px] bg-rose/60 p-4">
          <div className="flex items-center gap-2 mb-3"><span className="rounded-full bg-white text-rose-deep text-[11px] font-extrabold px-2.5 py-1">DPDP</span><span className="text-xs font-semibold">{lang === "hi" ? "DhanYukti khud kya rakhta hai — har maksad alag" : "What DhanYukti itself keeps — one purpose at a time"}</span></div>
          <DpdpPurposes dpdp={dpdp} tone="rose" />
        </div>
        <ValueLedger dpdp={dpdp} />
        <MyReports />
        {pass && data.household.members.filter((m) => m.earner && !pass.aa.some((c) => c.member_id === m.id && c.status === "ACTIVE")).map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-[24px] bg-white p-4 shadow-soft">
            <Avatar kind={m.avatar} size={40} />
            <div className="flex-1"><p className="font-bold">{m.name}</p><p className="text-xs text-muted">{t({ hi: "Inke khaate abhi jude nahi", en: "Accounts not linked yet" })}</p></div>
            <button onClick={() => askConsent(m.id)} className="rounded-full bg-ink text-white px-4 min-h-11 text-sm font-bold">{lang === "hi" ? "Consent maangein" : "Ask consent"}</button>
          </div>
        ))}
      </div>

      </>)}
      {tab === "data" && (<>
      <SectionTitle v={{ hi: "Aur jaankari jodein", en: "Add more context" }} right={<span className="text-[11px] font-bold text-muted">Perfios Hub</span>} />
      <Enrich />

      <SectionTitle v={{ hi: "Cash aur udhaar", en: "Cash & informal loans" }} />
      <div className="mx-5 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-4 space-y-3 lg:space-y-0"><DeclaredEntry /><BsaUpload /></div>
      <div className="mt-6"><DataSource /></div>
      <SectionTitle v={{ hi: "Sponsor integration", en: "Sponsor integration" }} right={<Plug size={16} className="text-muted" />} />
      <div className="mx-5 lg:mx-0 rounded-[28px] bg-white p-2 shadow-soft">
        {caps.map((c, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${c.status === "live" ? "bg-leaf" : c.status === "replay" ? "bg-amber" : c.status === "blocked" ? "bg-danger" : "bg-muted"}`} />
            <span className="font-bold w-20 shrink-0">{c.sponsor}</span><span className="flex-1 truncate">{c.api}</span>
            <span className="text-[11px] font-bold uppercase text-muted">{c.status}</span>
          </div>
        ))}
      </div>

      </>)}
      {tab === "settings" && (<>
      <SectionTitle v={{ hi: "Aasaan / Saathi / Pro", en: "Literacy mode" }} />
      <div className="mx-5 lg:mx-0 grid grid-cols-3 gap-2">
        {([["aasaan", "🎧", "Aasaan", "Voice + pictures"], ["saathi", "🤝", "Saathi", "Short text + cards"], ["pro", "📊", "Pro", "Full dashboard"]] as const).map(([k, e, n, d]) => (
          <button key={k} onClick={() => setMode(k as Mode)} className={`rounded-[24px] p-3 text-center ${mode === k ? "bg-haldi" : "bg-white"}`}>
            <p className="text-2xl">{e}</p><p className="font-extrabold text-sm">{n}</p><p className="text-[11px] text-muted leading-tight">{d}</p>
          </button>
        ))}
      </div>
      <p className="mx-5 lg:mx-0 mt-2 text-[11px] text-muted">{t({ hi: "Mode badalne se paison ka hisaab nahi badalta", en: "Switching mode never changes a financial result" })}</p>

      <SectionTitle v={{ hi: "Sunne ki bhasha", en: "Read-out language" }} />
      <div className="mx-5 lg:mx-0"><VoiceLanguages /></div>
      <SectionTitle v={{ hi: "Mera data", en: "My data" }} />
      <div className="mx-5 lg:mx-0"><PrivacyControls /></div>
      <div className="mx-5 lg:mx-0 mt-6">
        <button onClick={() => { setOnboarded(false); router.push("/"); }} className="w-full min-h-12 rounded-[20px] bg-white/60 font-semibold text-sm flex items-center justify-center gap-2"><RefreshCcw size={16} />{lang === "hi" ? "Demo: onboarding dobara" : "Demo: restart onboarding"}</button>
      </div>
      <InstallButton />
      </>)}
      <HelpLink />
      <ConsentReceipt c={receipt} onClose={() => setReceipt(null)} />

      <Sheet open={!!revoke} onClose={() => setRevoke(null)} title={<p className="text-xl font-extrabold">{lang === "hi" ? "Consent band karein?" : "Revoke consent?"}</p>}>
        {replay && <p className="mb-3 rounded-full bg-amber-soft px-3 py-1 text-[12px] font-bold w-fit">{t({ hi: "Recorded sandbox (replay) — Anumati ko kuch nahi bheja jaata", en: "Recorded sandbox (replay) — nothing is sent to Anumati" })}</p>}
        {!revoked ? (
          <div className="space-y-3">
            <p className="text-[15px]">{t({ hi: "DhanYukti ab yeh data istemaal nahi karega aur apni copy mita dega. Consent poori tarah band karne ke liye Anumati app mein bhi band karein.", en: "DhanYukti stops using this data now and deletes its copy. To end the consent itself, close it in the Anumati app." })}</p>
            <p className="text-xs text-muted">{t({ hi: "Parivaar ki permission ki zaroorat nahi — yeh aapka haq hai.", en: "No household vote needed — this is your right." })}</p>
            <Btn variant="danger" className="w-full" onClick={doRevoke}>{lang === "hi" ? "Haan, band karo" : "Yes, revoke"}</Btn>
            <OpenAnumati className="w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {[{ hi: "DhanYukti ne yeh data istemaal karna band kiya", en: "DhanYukti stopped using this data" }, { hi: "DhanYukti dobara fetch nahi karega", en: "DhanYukti won't fetch it again" },
              ...revoked.map((d) => ({ hi: `Mita diya: ${d}`, en: `Deleted: ${d}` }))].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.35 }} className="flex items-center gap-3 rounded-2xl bg-white p-3">
                <span className="grid place-items-center h-7 w-7 rounded-full bg-leaf text-white"><Check size={16} /></span><span className="font-semibold text-sm">{t(s)}</span>
              </motion.div>
            ))}
            <p className="pt-1 text-[14px] font-semibold">{t({ hi: "Consent poori tarah band karne ke liye Anumati app mein bhi band karein.", en: "To end the consent itself, close it in the Anumati app." })}</p>
            <OpenAnumati className="w-full" />
            <Btn variant="ink" className="w-full mt-2" onClick={() => setRevoke(null)}>{lang === "hi" ? "Theek hai" : "Done"}</Btn>
          </div>
        )}
      </Sheet>
    </div>
  );
}
