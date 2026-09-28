"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronDown, Download, Link2, ShieldCheck, ShieldAlert } from "lucide-react";
import { useApp } from "@/lib/store";
import { gov } from "@/lib/gov";
import { downloadReceipt } from "@/lib/dpdp/client";
import { NOTICE_PURPOSES, type DpdpState, type LedgerEntry, type PurposeId, type PurposeState } from "@/lib/dpdp/notice";
import { resolveModeText } from "@/lib/display-mode";
import type { L } from "@/lib/types";

/** Hindi (Hinglish) for the notice. English comes from the notice itself. */
const HI: Record<PurposeId, { title: string; purpose: string; data: string; retention: string }> = {
  member_profile: {
    title: "Parivaar mein aapki profile",
    purpose: "Aapke jawaab (parivaar, kaam, loan, lakshya) aur invite yaad rakhne ke liye, taaki dobara na poochna pade.",
    data: "Onboarding ke jawaab — kaunse chhode ya 'pata nahi' kaha, woh bhi — aur invite code. Bank data kabhi nahi.",
    retention: "Jab tak consent chalu hai, zyada se zyada 90 din. Band karte hi turant mita diya jaata hai, invite bhi.",
  },
  voice: {
    title: "Awaaz mein sunna",
    purpose: "Card ko aapki bhasha mein padhkar sunane ke liye.",
    data: "Sirf us card ka text jise aap dabate hain, parivaar ke naam hata kar. Khaata number kabhi nahi.",
    retention: "Kuch save nahi hota — na text, na awaaz.",
  },
  cover_profile: {
    title: "Parivaar ka bima check",
    purpose: "Parivaar ke har hisse ko kitna health, life aur accident cover chahiye, aur kitna kam hai, yeh nikaalne ke liye.",
    data: "Umar, rishta, kamaane walon ki aamdani, sheher, kharcha, loan, bachat aur pehle se bima (sirf rakam, company ka naam nahi).",
    retention: "Zyada se zyada 90 din. Band karte hi turant mita diya jaata hai.",
  },
  health_conditions: {
    title: "Bima check ke liye bimaari",
    purpose: "Waiting period batane aur insurer ko bimaari batane ki yaad dilane ke liye.",
    data: "Har sadasya ke liye sirf haan/nahi (sugar, BP, dil, thyroid, asthma, aur). Report ya dawai nahi.",
    retention: "Band karte hi turant mita diya jaata hai.",
  },
  insurance_tags: {
    title: "Aapka bima kiske liye hai",
    purpose: "Bank data mein mile har bima ko kaun cover karta hai, yeh dikhane ke liye taaki kami dikhe.",
    data: "Har policy kiske liye hai aur kis tarah ki hai (health, life, motor…), jaisa aap batayein.",
    retention: "Zyada se zyada 90 din. Band karte hi turant mita diya jaata hai.",
  },
  manual_entries: {
    title: "Aapke haath se likhe paise",
    purpose: "Bank na jude ho to aapke likhe hisaab se paison ki tasveer banane ke liye.",
    data: "Nakad, bill, tankhwah ki tareekh jo aap likhte hain. Aapka bayaan maana jaata hai, bank ka sach nahi.",
    retention: "Is build mein sirf aapke phone par. Band karne par 30 din mein mitega.",
  },
  device_signals: {
    title: "Phone ke SMS signal",
    purpose: "Bank aur biller ke SMS se bill aur EMI ki tareekh pakadne ke liye.",
    data: "Sirf bank aur bill ke len-den / due-date SMS. Niji message kabhi nahi.",
    retention: "Jab tak consent chalu hai. Band karne ya data mitane par mita diya jaata hai.",
  },
  ration: {
    title: "Ration card",
    purpose: "Parivaar kin sarkari yojanaon ke liye yogya ho sakta hai, yeh dekhne ke liye.",
    data: "Ration card ki shreni aur parivaar ka size, aapki anumati se dekha gaya.",
    retention: "Jab tak consent chalu hai. Band karne par mita diya jaata hai.",
  },
  electricity: {
    title: "Bijli ka bill",
    purpose: "Bill ki tareekh aur rakam mahine ke plan mein jodne ke liye.",
    data: "Bill ki rakam, due date aur bhugtaan ka itihaas.",
    retention: "Jab tak consent chalu hai. Band karne par mita diya jaata hai.",
  },
  rc: {
    title: "Gaadi ki RC",
    purpose: "Gaadi ka loan ya bima baaki to nahi, yeh dekhne ke liye.",
    data: "Gaadi registration: maalik ka milaan, financier, bima ki validity.",
    retention: "Jab tak consent chalu hai. Band karne par mita diya jaata hai.",
  },
  epf: {
    title: "EPF passbook",
    purpose: "PF ki bachat ko parivaar ke suraksha jaal mein ginne ke liye.",
    data: "EPF balance aur aakhri contribution ka mahina.",
    retention: "Jab tak consent chalu hai. Band karne par mita diya jaata hai.",
  },
  family_rules: {
    title: "Parivaar ke niyam",
    purpose: "Parivaar ke tay kiye niyamon se kharcha aur bachat check karne ke liye.",
    data: "Aapke banaye niyam.",
    retention: "Jab tak niyam hai.",
  },
};

const KIND: Record<LedgerEntry["kind"], L> = {
  dpdp_granted: { hi: "Consent diya", en: "Consent given" },
  dpdp_withdrawn: { hi: "Consent band", en: "Consent withdrawn" },
  aa_requested: { hi: "AA request bani", en: "AA request made" },
  aa_approved: { hi: "AA manzoor", en: "AA approved" },
  aa_revoked: { hi: "AA band kiya", en: "AA revoked" },
  aa_ended: { hi: "AA khatam", en: "AA ended" },
  engine_run: { hi: "Engine chala", en: "Engine run" },
  report_filed: { hi: "Report darj", en: "Report filed" },
  bill_confirmed: { hi: "Bill pakka kiya", en: "Bill confirmed" },
  bill_changed: { hi: "Bill theek kiya", en: "Bill corrected" },
  bill_ignored: { hi: "Bill hataya", en: "Bill ignored" },
  bill_undone: { hi: "Faisla wapas", en: "Decision undone" },
};

export function purposeTitle(id: PurposeId, lang: "hi" | "en") {
  const p = NOTICE_PURPOSES.find((x) => x.id === id);
  return lang === "hi" ? HI[id].title : resolveModeText(p?.title, "standard");
}

export function subjectLabel(subject: string, lang: "hi" | "en") {
  if (NOTICE_PURPOSES.some((p) => p.id === subject)) return purposeTitle(subject as PurposeId, lang);
  if (subject.startsWith("aa:")) return `Anumati AA · ${subject.slice(3)}`;
  if (subject.startsWith("engine:cover:")) return `${lang === "hi" ? "Bima engine" : "Cover engine"} · ${subject.slice(13, 19)}`;
  if (subject.startsWith("report:")) return `${lang === "hi" ? "Report" : "Report"} · ${subject.slice(7, 15)}`;
  return subject;
}

/** Shared state hook: one fetch, grant/withdraw returns the new state. */
export function useDpdp() {
  const [state, setState] = useState<DpdpState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<PurposeId | null>(null);
  const [lastReceipt, setLastReceipt] = useState<LedgerEntry | null>(null);
  const load = useCallback(async () => {
    try { setState(await gov.dpdp()); setError(null); } catch (e) { setError(e instanceof Error ? e.message : "error"); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const set = useCallback(async (id: PurposeId, action: "grant" | "withdraw") => {
    setBusy(id);
    try { const r = await gov.setDpdp(id, action); setState(r.state); setLastReceipt(r.receipt); setError(null); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "error"); return false; }
    finally { setBusy(null); }
  }, []);
  const status = (id: PurposeId): PurposeState["status"] => state?.purposes.find((p) => p.id === id)?.status ?? "never_asked";
  return { state, error, busy, set, status, reload: load, lastReceipt };
}

type Dpdp = ReturnType<typeof useDpdp>;

/**
 * DPDP notice, one purpose per row. Allowing and stopping are the same one
 * tap; each tap writes a receipt to the hash-chained Value Ledger.
 */
export function DpdpPurposes({ dpdp, only, compact, tone = "white" }: { dpdp: Dpdp; only?: PurposeId[]; compact?: boolean; tone?: "white" | "rose" }) {
  const { lang } = useApp();
  const list = NOTICE_PURPOSES.filter((p) => (only ? only.includes(p.id) : true));
  return (
    <div className="space-y-2">
      {list.map((p) => <PurposeRow key={p.id} id={p.id} dpdp={dpdp} compact={compact} tone={tone} />)}
      {dpdp.error && <p className="text-xs font-semibold text-danger">{dpdp.error}</p>}
      {dpdp.state && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted px-1">
          {dpdp.state.ledger_verified ? <ShieldCheck size={13} className="text-leaf" /> : <ShieldAlert size={13} className="text-danger" />}
          {lang === "hi" ? "Notice" : "Notice"} v{dpdp.state.notice_version} · {dpdp.state.ledger.length} {lang === "hi" ? "raseed" : "receipts"} ·{" "}
          {dpdp.state.ledger_verified ? (lang === "hi" ? "chain sahi" : "chain verified") : (lang === "hi" ? "chain toot gayi" : "chain broken")}
        </p>
      )}
    </div>
  );
}

function PurposeRow({ id, dpdp, compact, tone }: { id: PurposeId; dpdp: Dpdp; compact?: boolean; tone: "white" | "rose" }) {
  const { lang } = useApp();
  const [open, setOpen] = useState(false);
  const p = NOTICE_PURPOSES.find((x) => x.id === id)!;
  const st = dpdp.status(id);
  const on = st === "granted";
  const txt = (k: "purpose" | "data" | "retention") => (lang === "hi" ? HI[id][k] : resolveModeText(p[k], "standard"));
  const receipt = dpdp.state?.ledger.find((e) => e.receipt_id === dpdp.state?.purposes.find((x) => x.id === id)?.receipt_id);
  return (
    <div className={`rounded-[20px] p-3 ${tone === "rose" ? "bg-white/70" : "bg-white shadow-soft"} ${!p.in_build ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <button onClick={() => setOpen(!open)} className="flex-1 text-left min-h-11">
          <p className="font-bold text-[14px] leading-snug flex items-center gap-1">{purposeTitle(id, lang)}<ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} /></p>
          {!compact && <p className="text-[12px] text-muted leading-snug mt-0.5">{txt("purpose")}</p>}
          <p className="text-[11px] font-bold mt-1">
            {st === "granted" ? <span className="text-leaf">✓ {lang === "hi" ? "Chalu" : "On"}</span>
              : st === "withdrawn" ? <span className="text-danger">{lang === "hi" ? "Band kiya" : "Withdrawn"}</span>
              : <span className="text-muted">{lang === "hi" ? "Abhi poocha nahi" : "Not asked yet"}</span>}
            {!p.in_build && <span className="text-muted"> · {lang === "hi" ? "is build mein nahi" : "not in this build"}</span>}
          </p>
        </button>
        {p.in_build && (
          <button
            onClick={() => void dpdp.set(id, on ? "withdraw" : "grant")}
            disabled={dpdp.busy === id}
            role="switch" aria-checked={on} aria-label={purposeTitle(id, lang)}
            className={`relative h-8 w-14 rounded-full transition shrink-0 mt-1 disabled:opacity-50 ${on ? "bg-leaf" : "bg-muted/30"}`}>
            <motion.span className="absolute top-1 h-6 w-6 rounded-full bg-white shadow grid place-items-center" animate={{ left: on ? 28 : 4 }}>
              {on && <Check size={12} className="text-leaf" />}
            </motion.span>
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 space-y-1.5 text-[12px] leading-snug border-t border-lav pt-2">
          {compact && <p><b>{lang === "hi" ? "Kyon:" : "Why:"}</b> {txt("purpose")}</p>}
          <p><b>{lang === "hi" ? "Kya data:" : "What data:"}</b> {txt("data")}</p>
          <p><b>{lang === "hi" ? "Kab tak:" : "Kept:"}</b> {txt("retention")}</p>
          <p><b>{lang === "hi" ? "Aur kaun:" : "Who else:"}</b> {p.processor ? resolveModeText(p.processor, "standard") : (lang === "hi" ? "Koi nahi" : "Nobody")}</p>
          {!p.enforced && p.in_build && <p className="text-muted">{lang === "hi" ? "Is build mein band karne par server par turant mitana abhi laagu nahi — yeh data sirf phone par hai." : "Withdrawal isn't enforced on the server in this build — this data stays on the phone."}</p>}
          {receipt && (
            <button onClick={() => downloadReceipt(receipt, purposeTitle(id, "en"))} className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-lav px-3 min-h-9 font-bold">
              <Download size={13} />{lang === "hi" ? "Raseed" : "Receipt"} {receipt.receipt_id.slice(-6)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The Value Ledger: every consent event, newest first, with its hash link. */
export function ValueLedger({ dpdp, limit = 8 }: { dpdp: Dpdp; limit?: number }) {
  const { lang } = useApp();
  const [all, setAll] = useState(false);
  const entries = [...(dpdp.state?.ledger ?? [])].reverse();
  if (!dpdp.state) return null;
  if (entries.length === 0) return <p className="text-sm text-muted px-1">{lang === "hi" ? "Abhi koi raseed nahi." : "No receipts yet."}</p>;
  return (
    <div className="rounded-[24px] bg-white p-3 shadow-soft">
      <div className="flex items-center gap-2 px-1 pb-2">
        <Link2 size={15} />
        <p className="font-bold text-sm flex-1">{lang === "hi" ? "Value Ledger (hash-chain)" : "Value Ledger (hash-chained)"}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${dpdp.state.ledger_verified ? "bg-mint text-leaf" : "bg-danger-soft text-danger"}`}>
          {dpdp.state.ledger_verified ? (lang === "hi" ? "Sahi" : "Verified") : (lang === "hi" ? "Toota" : "Broken")}
        </span>
      </div>
      <div className="divide-y divide-lav">
        {entries.slice(0, all ? entries.length : limit).map((e) => (
          <div key={e.seq} className="flex items-center gap-2 py-2 text-[12px]">
            <span className="w-7 text-muted num">#{e.seq}</span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold truncate">{KIND[e.kind][lang]} · {subjectLabel(e.subject, lang)}</span>
              <span className="block font-mono text-[10px] text-muted truncate">{new Date(e.at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })} · {e.hash.slice(0, 10)}← {e.prev_hash.slice(0, 8)}</span>
            </span>
          </div>
        ))}
      </div>
      {entries.length > limit && <button onClick={() => setAll(!all)} className="w-full min-h-10 text-xs font-bold text-muted">{all ? (lang === "hi" ? "Kam dikhao" : "Show less") : (lang === "hi" ? `Sab ${entries.length} dikhao` : `Show all ${entries.length}`)}</button>}
    </div>
  );
}
