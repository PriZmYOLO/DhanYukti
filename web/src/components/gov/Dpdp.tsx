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
    purpose: "Aapke jawaab (parivaar, kaam, aamdani, loan, lakshya, aur jo paise ki baatein aap batayein) aur invite yaad rakhne ke liye, aur jahan bank data mein kami ho wahan 'aapne bataya' likh kar hisaab mein lagane ke liye.",
    data: "Onboarding ke jawaab — kaunse chhode ya 'pata nahi' kaha, woh bhi: parivaar, kaam, aamdani kaisi aati hai, aur marzi se ghar ka cash, aamdani, agli tareekh, ek bill. Invite code. Bank data kabhi nahi.",
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
    purpose: "Parivaar kin sarkari yojanaon (jaise AAY card par Ayushman) ke liye yogya ho sakta hai, yeh batane ke liye.",
    data: "Aapke diye ration card number se: shreni (AAY, PHH…), rajya aur sadasyon ki ginti. Kisi ka naam nahi.",
    retention: "Sirf yahan likhi jaankari, 30 din tak. Band karne ya sab mitane par turant mita di jaati hai. Source ka poora jawaab kabhi nahi rakhte.",
  },
  electricity: {
    title: "Bijli ka bill",
    purpose: "Bill ki asli aakhri tareekh aur rakam mahine ke plan mein jodne ke liye.",
    data: "Aapke diye consumer number se: board, aakhri bill, bakaya aur aakhri tareekh. Number chhupa kar (aakhri 4). Naam ya pata nahi.",
    retention: "Sirf yahan likhi jaankari, 30 din tak. Band karne ya sab mitane par turant mita di jaati hai. Source ka poora jawaab kabhi nahi rakhte.",
  },
  gas: {
    title: "Gas (PNG) ka bill",
    purpose: "Gas bill ki tareekh aur rakam mahine ke plan mein jodne ke liye.",
    data: "Aapke diye number se: gas company, aakhri bill aur aakhri tareekh. Naam ya pata nahi.",
    retention: "Sirf yahan likhi jaankari, 30 din tak. Band karne ya sab mitane par turant mita di jaati hai. Source ka poora jawaab kabhi nahi rakhte.",
  },
  rc: {
    title: "Gaadi (RC aur e-challan)",
    purpose: "Gaadi ka bima ya PUC khatam hone se pehle, aur bakaya challan ke baare mein yaad dilane ke liye.",
    data: "Aapke diye gaadi number se: gaadi ki shreni, bima / PUC / fitness / tax ki tareekh, loan hai ya nahi, bakaya challan ki ginti aur rakam. Maalik ka naam, pata, chassis ya policy number nahi.",
    retention: "Sirf yahan likhi jaankari, 30 din tak. Band karne ya sab mitane par turant mita di jaati hai. Source ka poora jawaab kabhi nahi rakhte.",
  },
  dl: {
    title: "Driving licence",
    purpose: "Licence (khaas kar kaam wala commercial) khatam hone se pehle yaad dilane ke liye.",
    data: "Licence number aur janm tithi se: licence ki sthiti, validity aur gaadi ki shreniyan. Janm tithi aur photo kabhi nahi rakhte.",
    retention: "Sirf yahan likhi jaankari, 30 din tak. Band karne ya sab mitane par turant mita di jaati hai. Source ka poora jawaab kabhi nahi rakhte.",
  },
  epf: {
    title: "EPF passbook",
    purpose: "PF ko retirement ki bachat ke roop mein dikhane (kharch layak nahi ginte) aur PF ke saath EDLI jeevan bima batane ke liye.",
    data: "EPFO ke OTP ke baad: PF aur pension balance, aakhri jama ka mahina, kitni naukriyan. UAN chhupa kar. Passbook PDF ya niji jaankari nahi.",
    retention: "Sirf yahan likhi jaankari, 30 din tak. Band karne ya sab mitane par turant mita di jaati hai. Source ka poora jawaab kabhi nahi rakhte.",
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
  aa_revoked: { hi: "Bank link DhanYukti mein band", en: "Bank link stopped in DhanYukti" },
  aa_ended: { hi: "AA khatam", en: "AA ended" },
  engine_run: { hi: "Engine chala", en: "Engine run" },
  report_filed: { hi: "Report darj", en: "Report filed" },
  bill_confirmed: { hi: "Bill pakka kiya", en: "Bill confirmed" },
  bill_changed: { hi: "Bill theek kiya", en: "Bill corrected" },
  bill_ignored: { hi: "Bill hataya", en: "Bill ignored" },
  bill_undone: { hi: "Faisla wapas", en: "Decision undone" },
  household_joined: { hi: "Sadasya ka khaata parivaar mein juda", en: "A member's account joined the household" },
  sharing_tightened: { hi: "Sharing kam ki", en: "Sharing reduced" },
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
  if (subject.startsWith("bill:")) return `${lang === "hi" ? "Baar-baar ka len-den" : "Repeating payment"} · ${subject.slice(5, 11)}`;
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

type LedgerGroup = "all" | "consent" | "bank" | "engine" | "bills" | "reports";
const GROUP_OF = (k: LedgerEntry["kind"]): Exclude<LedgerGroup, "all"> =>
  k.startsWith("dpdp_") ? "consent" : k.startsWith("aa_") ? "bank" : k === "engine_run" ? "engine" : k.startsWith("bill_") ? "bills" : "reports";
const GROUPS: { k: LedgerGroup; hi: string; en: string }[] = [
  { k: "all", hi: "Sab", en: "All" }, { k: "consent", hi: "Consent", en: "Consent" }, { k: "bank", hi: "Bank (AA)", en: "Bank (AA)" },
  { k: "engine", hi: "Engine", en: "Engine" }, { k: "bills", hi: "Bills", en: "Bills" }, { k: "reports", hi: "Report", en: "Reports" },
];
const TONE: Record<Exclude<LedgerGroup, "all">, string> = {
  consent: "bg-rose/70", bank: "bg-lav", engine: "bg-haldi-soft", bills: "bg-mint", reports: "bg-amber-soft",
};

/**
 * Trust Ledger (the Value Ledger): every consent grant and withdrawal, bank
 * link event, engine run and decision, newest first. Each entry carries the
 * hash of the one before it, so an edit or deletion anywhere breaks the
 * chain and the badge says so. Holds no financial data.
 */
export function ValueLedger({ dpdp, limit = 8 }: { dpdp: Dpdp; limit?: number }) {
  const { lang } = useApp();
  const [all, setAll] = useState(false);
  const [group, setGroup] = useState<LedgerGroup>("all");
  if (!dpdp.state) return dpdp.error ? <p className="text-sm text-danger font-semibold px-1">{dpdp.error}</p> : <div className="skeleton rounded-[24px] h-32" />;
  const ledger = dpdp.state.ledger;
  const entries = [...ledger].reverse().filter((e) => group === "all" || GROUP_OF(e.kind) === group);
  const count = (g: LedgerGroup) => (g === "all" ? ledger.length : ledger.filter((e) => GROUP_OF(e.kind) === g).length);
  const ok = dpdp.state.ledger_verified;
  return (
    <div className="rounded-[24px] bg-white p-3 shadow-soft">
      <div className="flex items-center gap-2 px-1">
        <Link2 size={16} />
        <p className="font-extrabold text-[15px] flex-1">{lang === "hi" ? "Trust Ledger" : "Trust Ledger"}</p>
      </div>
      <p className="px-1 mt-1 text-[12px] text-muted leading-snug">
        {lang === "hi"
          ? "Har consent, bank link, engine run aur aapka har faisla — har entry pichhli se judi (hash). Beech mein kuch badla to chain toot jaati hai. Isme koi paisa ya khaata nahi."
          : "Every consent, bank link, engine run and decision of yours — each entry sealed to the one before (hash). Change anything in the middle and the chain breaks. No money or account details are kept here."}
      </p>
      <div role="status" className={`mt-2 rounded-[16px] px-3 py-2 text-[13px] font-extrabold flex items-center gap-2 ${ok ? "bg-mint text-leaf" : "bg-danger-soft text-danger"}`}>
        <span aria-hidden>{ok ? "✓" : "!"}</span>
        <span className="flex-1">{ok ? (lang === "hi" ? "Chain sahi hai (verified)" : "Chain verified") : (lang === "hi" ? "Chain tooti hai — koi entry badli gayi" : "Chain broken — an entry was changed")}</span>
        <span className="font-semibold num">{ledger.length} {lang === "hi" ? "entry" : ledger.length === 1 ? "entry" : "entries"}</span>
      </div>
      {ledger.length > 0 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {GROUPS.filter((g) => g.k === "all" || count(g.k) > 0).map((g) => (
            <button key={g.k} type="button" onClick={() => { setGroup(g.k); setAll(false); }}
              className={`shrink-0 rounded-full px-3 min-h-9 text-[12px] font-bold ${group === g.k ? "bg-ink text-white" : "bg-lav text-ink"}`}>
              {lang === "hi" ? g.hi : g.en} · {count(g.k)}
            </button>
          ))}
        </div>
      )}
      {entries.length === 0 ? (
        <p className="text-sm text-muted px-1 py-3">{lang === "hi" ? "Abhi koi raseed nahi." : "No receipts yet."}</p>
      ) : (
        <div className="mt-1 divide-y divide-lav">
          {entries.slice(0, all ? entries.length : limit).map((e) => (
            <div key={e.seq} className="flex items-start gap-2 py-2 text-[12px]">
              <span className={`mt-0.5 w-9 shrink-0 rounded-md text-center text-[11px] font-extrabold num ${TONE[GROUP_OF(e.kind)]}`}>#{e.seq}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{KIND[e.kind][lang]} · {subjectLabel(e.subject, lang)}</span>
                <span className="block text-[11px] text-muted">{new Date(e.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {lang === "hi" ? "raseed" : "receipt"} <span className="font-mono">{e.receipt_id}</span></span>
                <span className="block font-mono text-[10px] text-muted truncate" title={`${e.hash} ← ${e.prev_hash}`}>{e.hash.slice(0, 12)} ← {e.prev_hash.slice(0, 12)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      {entries.length > limit && <button onClick={() => setAll(!all)} className="w-full min-h-10 text-xs font-bold text-muted">{all ? (lang === "hi" ? "Kam dikhao" : "Show less") : (lang === "hi" ? `Sab ${entries.length} dikhao` : `Show all ${entries.length}`)}</button>}
    </div>
  );
}

/** One line for the Family tab: how many entries, and whether the chain holds. */
export function LedgerSummary({ dpdp, onOpen }: { dpdp: Dpdp; onOpen: () => void }) {
  const { lang } = useApp();
  if (!dpdp.state) return null;
  const ok = dpdp.state.ledger_verified;
  return (
    <button type="button" onClick={onOpen} className="w-full rounded-[24px] bg-white p-4 shadow-soft flex items-center gap-3 text-left">
      <span className={`grid place-items-center h-10 w-10 rounded-full shrink-0 ${ok ? "bg-mint text-leaf" : "bg-danger-soft text-danger"}`}><Link2 size={18} /></span>
      <span className="flex-1 min-w-0">
        <span className="block font-extrabold">{lang === "hi" ? "Trust Ledger" : "Trust Ledger"}</span>
        <span className="block text-[12px] text-muted">{dpdp.state.ledger.length} {lang === "hi" ? "raseed" : "receipts"} · {ok ? (lang === "hi" ? "✓ chain sahi" : "✓ chain verified") : (lang === "hi" ? "chain tooti" : "chain broken")}</span>
      </span>
      <span className="text-[13px] font-bold">{lang === "hi" ? "Dekhein →" : "Open →"}</span>
    </button>
  );
}
