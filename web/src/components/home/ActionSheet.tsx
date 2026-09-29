"use client";
import { useEffect, useState } from "react";
import { ExternalLink, MessageCircle, ShieldCheck, TriangleAlert, CalendarCheck, Phone } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Gullak from "@/components/art/Gullak";
import { Bi, Btn, SpeakBtn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";
import type { Action, L, NBA } from "@/lib/types";

const asL = (x: unknown): L => (x && typeof x === "object" && "hi" in (x as L) ? (x as L) : { hi: String(x ?? ""), en: String(x ?? "") });

type Props = { open: boolean; onClose: () => void; action: Action | null; nba?: NBA | null };

export default function ActionSheet({ open, onClose, action, nba }: Props) {
  const { t, lang } = useApp();
  if (!action) return null;
  return (
    <Sheet open={open} onClose={onClose} title={<Bi v={action.label} className="text-xl font-extrabold" />}>
      {action.type === "message" && <MessageFlow action={action} nba={nba} onDone={onClose} />}
      {action.type === "gullak" && <GullakFlow action={action} onDone={onClose} />}
      {action.type === "protect" && <ProtectFlow action={action} onDone={onClose} />}
      {action.type === "cheaper_option" && <CheaperFlow action={action} onDone={onClose} />}
      {action.type === "plan" && <PlanFlow onDone={onClose} />}
      {action.type === "link" && <LinkFlow action={action} nba={nba} onDone={onClose} />}
      {action.type === "help" && (
        <a href="tel:1800000000" className="flex items-center gap-3 rounded-[24px] bg-white p-4"><Phone /> <span className="font-bold">{t({ hi: "Callback maangein", en: "Request a callback" })}</span></a>
      )}
      <p className="mt-4 text-center text-[11px] text-muted">{lang === "hi" ? "DhanYukti khud paisa nahi bhejta — aap hi confirm karte hain." : "DhanYukti never moves money by itself — you confirm every step."}</p>
    </Sheet>
  );
}

function MessageFlow({ action, nba, onDone }: { action: Action; nba?: NBA | null; onDone: () => void }) {
  const { t, award, lang } = useApp();
  const text = asL(action.payload.text);
  const to = String(action.payload.to ?? "");
  const [lng, setLng] = useState<"hi" | "en">(lang);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm"><span className="text-muted">{lang === "hi" ? "Kisko:" : "To:"}</span><b>{to}</b></div>
      <div className="rounded-[24px] bg-[#E7F8E9] p-4 relative">
        <div className="absolute -top-2 left-6 h-4 w-4 rotate-45 bg-[#E7F8E9]" />
        <p className="text-[15px] leading-relaxed whitespace-pre-line">{text[lng]}</p>
        <div className="mt-3 flex gap-2">
          {(["hi", "en"] as const).map((l) => (
            <button key={l} onClick={() => setLng(l)} className={`rounded-full px-3 py-1 text-xs font-bold ${lng === l ? "bg-leaf text-white" : "bg-white"}`}>{l === "hi" ? "Hindi" : "English"}</button>
          ))}
          <span className="flex-1" /><SpeakBtn v={text} size={36} />
        </div>
      </div>
      <a href={`https://wa.me/?text=${encodeURIComponent(text[lng])}`} target="_blank" rel="noreferrer"
        onClick={() => { award("task_done", { hi: "Message bhej diya! Shabaash", en: "Message sent! Well done" }, { ref: nba?.id }); onDone(); }}
        className="flex items-center justify-center gap-2 min-h-14 rounded-[20px] bg-[#0E7A42] text-white font-bold">
        <MessageCircle size={20} /> {t({ hi: "WhatsApp par bhejo", en: "Send on WhatsApp" })}
      </a>
    </div>
  );
}

function GullakFlow({ action, onDone }: { action: Action; onDone: () => void }) {
  const { data, t, award, lang, speak } = useApp();
  const jars = data?.jars ?? [];
  const [jarId, setJarId] = useState<string>(String(action.payload.jar_id ?? jars[0]?.id ?? ""));
  const suggested = Number(action.payload.amount ?? jars.find((j) => j.id === jarId)?.daily_suggest ?? 100);
  const [amt, setAmt] = useState(suggested);
  const [confirm, setConfirm] = useState(false);
  const jar = jars.find((j) => j.id === jarId);
  const readBack: L = {
    hi: `${inr(amt)} ${jar ? jar.name.hi : "Gullak"} mein, aapke apne khaate se. Sahi hai?`,
    en: `${inr(amt)} into ${jar ? jar.name.en : "Gullak"}, from your own account. Correct?`,
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (confirm) speak(readBack); }, [confirm]);
  if (!jar) return <p className="text-muted">{t({ hi: "Pehle ek Gullak banayein", en: "Create a Gullak first" })}</p>;
  return confirm ? (
    <div className="text-center space-y-4">
      <div className="mx-auto w-fit"><Gullak fill={(jar.saved + amt) / jar.goal} size={110} /></div>
      <p className="text-xs font-bold uppercase tracking-widest text-clay">{lang === "hi" ? "Pakka karein" : "Please confirm"}</p>
      <p className="text-2xl font-extrabold leading-snug">{t(readBack)}</p>
      <div className="grid grid-cols-2 gap-3">
        <Btn variant="white" onClick={() => setConfirm(false)}>{lang === "hi" ? "Nahi, badlo" : "No, change"}</Btn>
        <Btn variant="clay" onClick={() => { award("gullak_deposit", { hi: "Gullak mein paisa gaya!", en: "Money is in the Gullak!" }, { ref: jar.id, amount: amt }); onDone(); }}>
          {lang === "hi" ? "Haan, daalo" : "Yes, add"}
        </Btn>
      </div>
      <p className="text-[11px] text-muted">UPI AutoPay · {lang === "hi" ? "aapke RD / bachat khaate mein" : "into your own RD / savings pocket"}</p>
    </div>
  ) : (
    <div className="space-y-4">
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
        {jars.map((j) => (
          <button key={j.id} onClick={() => setJarId(j.id)} className={`shrink-0 w-32 rounded-[24px] p-3 text-left ${jarId === j.id ? "bg-clay-soft ring-2 ring-clay" : "bg-white"}`}>
            <Gullak fill={j.saved / j.goal} size={60} />
            <p className="font-bold text-sm mt-1">{t(j.name)}</p>
            <p className="text-xs text-muted num">{inr(j.saved)} / {inr(j.goal)}</p>
          </button>
        ))}
      </div>
      <div>
        <p className="text-sm font-bold mb-2">{lang === "hi" ? "Kitna daalein?" : "How much?"}</p>
        <div className="grid grid-cols-4 gap-2">
          {[50, 100, 200, 500, 800, 1000, 1500, 2000].map((v) => (
            <button key={v} onClick={() => setAmt(v)} className={`min-h-12 rounded-2xl font-bold num ${amt === v ? "bg-ink text-white" : "bg-white"}`}>₹{v}</button>
          ))}
        </div>
      </div>
      <Btn variant="clay" className="w-full" onClick={() => setConfirm(true)}>{lang === "hi" ? `${inr(amt)} Gullak mein daalo` : `Put ${inr(amt)} in Gullak`}</Btn>
    </div>
  );
}

function ProtectFlow({ action, onDone }: { action: Action; onDone: () => void }) {
  const { data, t, award, lang } = useApp();
  const links = (action.payload.links as { label: L | string; url: string }[] | undefined)
    ?? Object.entries(action.payload).filter(([, v]) => typeof v === "string" && String(v).startsWith("http")).map(([k, v]) => ({ label: k.replace(/_url$/, "").toUpperCase(), url: String(v) }));
  return (
    <div className="space-y-3">
      {data?.protection_detail.map((p) => (
        <div key={p.member_id} className="flex items-center gap-3 rounded-[24px] bg-white p-4">
          <ShieldCheck className={p.life ? "text-leaf" : "text-danger"} />
          <div className="flex-1"><p className="font-bold">{p.name}</p><p className="text-xs text-muted">{t(p.note)}</p></div>
          <span className={`text-xs font-bold rounded-full px-2 py-1 ${p.life ? "bg-mint text-leaf" : "bg-danger-soft text-danger"}`}>{lang === "hi" ? (p.life ? "Bima hai" : "Bima nahi") : p.life ? "Covered" : "No cover"}</span>
        </div>
      ))}
      {links.map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" onClick={() => award("protection_check", { hi: "Suraksha check ho gaya", en: "Protection checked" })}
          className="flex items-center gap-3 rounded-[24px] bg-mint p-4 min-h-14 font-bold">
          <ExternalLink size={18} /> <span className="flex-1">{typeof l.label === "string" ? l.label : t(l.label)}</span>
          <span className="text-[11px] rounded bg-white/70 px-1.5 py-0.5">{lang === "hi" ? "Sarkari site" : "Official site"}</span>
        </a>
      ))}
      <p className="text-xs text-muted">{t({ hi: "Hum koi policy nahi bechte. Enrolment bank ya licensed intermediary se hoga.", en: "We don't sell policies. Enrolment is via your bank or a licensed intermediary." })}</p>
      <Btn variant="ink" className="w-full" onClick={onDone}>{lang === "hi" ? "Theek hai" : "Okay"}</Btn>
    </div>
  );
}

function rbiBadge(on: boolean | null): L {
  if (on === true) return { hi: "Hamari RBI list copy mein", en: "In our copy of RBI's list" };
  if (on === false) return { hi: "RBI list mein nahi (demo)", en: "Not on RBI list (demo)" };
  return { hi: "Hamari copy mein nahi — check karein", en: "Not in our copy — check" };
}

function CheaperFlow({ action, onDone }: { action: Action; onDone: () => void }) {
  const { data, t, award, lang } = useApp();
  // 36 is DhanYukti's own cost line, not an RBI rule; an app missing from our partial copy of RBI's list is "unknown", not "bad".
  const bad = data?.lender_shield.filter((l) => l.on_rbi_list === false || (l.above_our_cost_line ?? l.effective_annual_pct > 36)) ?? [];
  const rbi = String(action.payload.rbi_dla_url ?? "https://www.rbi.org.in");
  const sachet = String(action.payload.sachet_url ?? "https://sachet.rbi.org.in");
  return (
    <div className="space-y-3">
      {bad.map((l) => (
        <div key={l.app} className="rounded-[24px] bg-danger-soft p-4">
          <div className="flex items-center gap-2"><TriangleAlert className="text-danger" size={20} /><b className="text-lg">{l.app}</b>
            <span className="ml-auto text-[11px] font-bold rounded-full bg-white px-2 py-0.5 text-danger">{t(rbiBadge(l.on_rbi_list))}</span></div>
          <p className="mt-2 text-[15px]">{t({ hi: `${inr(l.borrowed)} liye, ${l.days} din mein ${inr(l.charges)} byaaj gaya`, en: `Borrowed ${inr(l.borrowed)}, paid ${inr(l.charges)} in ${l.days} days` })}</p>
          <p className="text-sm text-muted mt-1">{t(l.verdict)}</p>
        </div>
      ))}
      <a href={rbi} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-[24px] bg-white p-4 min-h-14 font-semibold"><ExternalLink size={18} /><span>{t({ hi: "RBI ki lending app list dekhein", en: "Check RBI's lending app list" })}{action.payload.rbi_dla_path != null && <span className="block text-[11px] font-normal text-muted">{t(asL(action.payload.rbi_dla_path))}</span>}</span></a>
      <a href={sachet} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-[24px] bg-white p-4 min-h-14 font-semibold"><ExternalLink size={18} />{t({ hi: "SACHET par shikayat karein", en: "Complain on SACHET" })}</a>
      {action.payload.option != null && <div className="rounded-[24px] bg-mint p-4"><p className="text-xs font-bold text-leaf uppercase tracking-wider">{lang === "hi" ? "Sasta vikalp" : "Cheaper option"}</p><p className="font-bold mt-1">{t(asL(action.payload.option))}</p><p className="text-[11px] mt-1 text-muted">Referral · {lang === "hi" ? "sirf RBI-registered lender" : "RBI-registered lenders only"}</p></div>}
      <Btn variant="ink" className="w-full" onClick={() => { award("task_done", { hi: "Lender check ho gaya", en: "Lender checked" }); onDone(); }}>{lang === "hi" ? "Samajh gaya" : "Got it"}</Btn>
    </div>
  );
}

function PlanFlow({ onDone }: { onDone: () => void }) {
  const { hid, t, award, lang } = useApp();
  const [msg, setMsg] = useState<L | null>(null);
  useEffect(() => { api.simulate(hid, { cut_per_day: 200 }).then((r) => setMsg(r.message)).catch(() => {}); }, [hid]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((d) => (
          <div key={d} className="rounded-2xl bg-white py-3 text-center"><CalendarCheck className="mx-auto" size={18} /><p className="text-xs mt-1 text-muted">{lang === "hi" ? "Din" : "Day"} {d}</p><p className="font-bold num">₹300</p></div>
        ))}
      </div>
      <p className="text-[15px]">{t({ hi: "5 din roz ₹200 kam kharch — ₹500 ki jagah ₹300.", en: "5 days, ₹200 less each day — ₹300 instead of ₹500." })}</p>
      {msg && <p className="rounded-2xl bg-haldi-soft p-3 text-sm">{t(msg)} <span className="text-[11px] font-bold text-muted">· sirf andaaza</span></p>}
      <Btn className="w-full" onClick={() => { award("task_done", { hi: "Plan shuru!", en: "Plan started!" }); onDone(); }}>{lang === "hi" ? "Plan shuru karo" : "Start plan"}</Btn>
    </div>
  );
}

/** A task done on an official site (renew insurance, pay a challan, renew a licence). */
function LinkFlow({ action, nba, onDone }: { action: Action; nba?: NBA | null; onDone: () => void }) {
  const { t, award, lang } = useApp();
  const url = String(action.payload.url ?? "");
  const steps = (Array.isArray(action.payload.steps) ? action.payload.steps : []).map(asL);
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={i} className="flex items-start gap-3 rounded-[20px] bg-white p-3">
          <span className="grid place-items-center h-7 w-7 shrink-0 rounded-full bg-haldi text-sm font-bold">{i + 1}</span>
          <p className="text-[15px] leading-snug">{t(s)}</p>
        </div>
      ))}
      {url.startsWith("https://") && (
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 min-h-14 rounded-[20px] bg-ink text-white font-bold">
          <ExternalLink size={18} /> {t({ hi: "Sarkari site kholein", en: "Open the official site" })}
        </a>
      )}
      <Btn variant="white" className="w-full" onClick={() => { award("task_done", { hi: "Ho gaya! Shabaash", en: "Done! Well done" }, { ref: nba?.id }); onDone(); }}>
        {lang === "hi" ? "Maine kar liya" : "I've done it"}
      </Btn>
    </div>
  );
}
