"use client";
import { useState } from "react";
import { Flag, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { gov, type Report, type ReportReason } from "@/lib/gov";
import type { L } from "@/lib/types";

export const REASON_LABEL: Record<ReportReason, L> = {
  wrong_fact: { hi: "Isme koi baat galat hai", en: "A fact here is wrong" },
  not_suitable: { hi: "Mere parivaar ke liye theek nahi", en: "Not right for my family" },
  unclear: { hi: "Samajh nahi aaya", en: "I didn't understand it" },
  privacy: { hi: "Privacy ki chinta", en: "A privacy concern" },
  other: { hi: "Kuch aur", en: "Something else" },
};
const REASONS = Object.keys(REASON_LABEL) as ReportReason[];

/**
 * "Report a recommendation" — the redress route on every Kyon? sheet. Saves
 * the card id, engine, reason and the person's words; returns a Value
 * Ledger receipt. A saved report is shown as received, never as resolved.
 */
export default function ReportForm({ cardId, engine }: { cardId: string; engine: string }) {
  const { t, lang } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<Report | null>(null);

  const submit = async () => {
    if (!reason) { setErr(t({ hi: "Ek wajah chunein", en: "Choose a reason" })); return; }
    setBusy(true); setErr(null);
    try { setDone(await gov.report({ card_id: cardId, engine, reason, details })); }
    catch (e) { setErr(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  };

  if (done) return (
    <div className="rounded-[24px] bg-mint/70 p-4">
      <p className="font-extrabold flex items-center gap-2"><Check size={18} className="text-leaf" />{t({ hi: "Report mil gayi", en: "Report received" })}</p>
      <p className="mt-1 text-[13px] leading-snug">{t({ hi: "Mili hai, abhi suljhi nahi. Team yeh card, uska niyam aur data trail dekhegi. Tab tak is card par amal karna zaroori nahi.", en: "Received, not yet resolved. The team will review this card, its rule and data trail. You don't need to act on the card meanwhile." })}</p>
      <p className="mt-2 text-[11px] font-mono text-muted">{done.report_id}{done.receipt_id ? ` · ${lang === "hi" ? "raseed" : "receipt"} ${done.receipt_id}` : ""}</p>
    </div>
  );

  if (!open) return (
    <button onClick={() => setOpen(true)} className="w-full flex items-center justify-center gap-2 min-h-12 rounded-[20px] bg-white border border-ink/10 text-sm font-bold">
      <Flag size={16} />{t({ hi: "Galat laga? Is salah ko report karein", en: "Something off? Report this recommendation" })}
    </button>
  );

  return (
    <div className="rounded-[24px] bg-white p-4 shadow-soft">
      <p className="font-extrabold flex items-center gap-2"><Flag size={16} />{t({ hi: "Is salah ko report karein", en: "Report this recommendation" })}</p>
      <div className="mt-3 grid gap-2" role="radiogroup">
        {REASONS.map((r) => (
          <button key={r} role="radio" aria-checked={reason === r} onClick={() => { setReason(r); setErr(null); }}
            className={`flex items-center gap-3 rounded-[16px] px-3 min-h-11 text-left text-[14px] ${reason === r ? "bg-ink text-white" : "bg-lav/60"}`}>
            <span className={`h-4 w-4 rounded-full border-2 ${reason === r ? "border-haldi bg-haldi" : "border-ink/30"}`} />{t(REASON_LABEL[r])}
          </button>
        ))}
      </div>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={3}
        placeholder={t({ hi: "Kya galat laga? (optional, 500 akshar)", en: "What felt wrong? (optional, 500 characters)" })}
        className="mt-3 w-full rounded-[16px] bg-lav/40 p-3 text-[14px] outline-none" />
      {err && <p className="mt-2 text-sm font-semibold text-danger">{err}</p>}
      <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
        <button onClick={() => setOpen(false)} className="min-h-12 rounded-[16px] px-4 font-bold bg-lav">{lang === "hi" ? "Rehne dein" : "Cancel"}</button>
        <button disabled={busy} onClick={submit} className="min-h-12 rounded-[16px] font-bold bg-ink text-white disabled:opacity-50">{lang === "hi" ? "Report bhejein" : "Send report"}</button>
      </div>
      <p className="mt-2 text-[11px] text-muted leading-snug">{t({ hi: "Sirf card ki ID, engine, wajah aur aapke shabd save hote hain — card ka text ya bank data nahi.", en: "Only the card id, engine, reason and your words are saved — not the card text or bank data." })}</p>
    </div>
  );
}
