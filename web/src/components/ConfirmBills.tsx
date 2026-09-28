"use client";
import { useEffect, useState } from "react";
import { CalendarClock, Check, Pencil, RotateCcw, X } from "lucide-react";
import { api } from "@/lib/api";
import type { BillAction, MyBill, MyBillsView } from "@/lib/contracts/my-bills";
import { day, inr } from "@/lib/format";
import { ensureSession } from "@/lib/session";
import { useApp } from "@/lib/store";
import type { L } from "@/lib/types";

/**
 * Confirm your bills (E02 with a consent step). The Household Twin found these
 * repeating payments in the member's own bank data; the member says what each
 * one is: confirmed, fixed (amount or day) or ignored. Their word applies to
 * every date of that payment across the app and is written to the Value
 * Ledger. Numbers come from the engines; this only formats them.
 */

const TYPE: Record<string, L> = {
  salary: { hi: "Tankhwah", en: "Salary" },
  gig: { hi: "Kamai", en: "Income" },
  rent: { hi: "Kiraya", en: "Rent" },
  emi: { hi: "EMI", en: "EMI" },
  bill: { hi: "Bill", en: "Bill" },
  fee: { hi: "Fees", en: "Fee" },
  premium: { hi: "Beema", en: "Insurance" },
};

function rhythm(b: MyBill): L {
  const m = b.every?.months;
  const d = b.every?.days;
  if (m === 1) return { hi: "har mahine", en: "every month" };
  if (m) return { hi: `har ${m} mahine`, en: `every ${m} months` };
  if (d) return { hi: `lagbhag har ${d} din`, en: `about every ${d} days` };
  return { hi: "baar-baar", en: "repeats" };
}

export default function ConfirmBills() {
  const { t, lang, refresh } = useApp();
  const [view, setView] = useState<MyBillsView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [dom, setDom] = useState("");
  const [receipts, setReceipts] = useState<Record<string, string>>({});

  useEffect(() => {
    let stop = false;
    api.myBills().then((r) => { if (!stop) setView(r.bills); }).catch((e) => { if (!stop) setErr(e instanceof Error ? e.message : "error"); });
    return () => { stop = true; };
  }, []);

  async function decide(series: string, action: BillAction, extra: { amount?: number; day?: number } = {}) {
    setBusy(series); setErr(null);
    try {
      await ensureSession();
      const r = await api.decideBill(series, action, extra);
      setView(r.bills);
      if (r.receipt_id) setReceipts((x) => ({ ...x, [series]: r.receipt_id! }));
      setEditing(null);
      await refresh(); // the picture above now uses the member's word
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(null);
    }
  }

  function saveFix(series: string, dayAllowed: boolean) {
    const a = amount.trim() === "" ? undefined : Number(amount);
    const d = !dayAllowed || dom.trim() === "" ? undefined : Number(dom);
    decide(series, "fix", { amount: a, day: d });
  }

  return (
    <section aria-labelledby="confirm-bills-title" className="mt-4 rounded-[28px] bg-white p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <span className="grid place-items-center h-9 w-9 rounded-xl bg-haldi-soft"><CalendarClock size={18} aria-hidden /></span>
        <h2 id="confirm-bills-title" className="flex-1 font-extrabold text-[16px] leading-tight">
          {t({ hi: "Agle 6 hafte: yeh baar-baar aate dikhe. Sahi hai?", en: "Next 6 weeks: we think these repeat. Right?" })}
        </h2>
        {view && <span className="text-[12px] font-bold text-muted" aria-label={t({ hi: "Aapne jaanche", en: "Checked by you" })}>{view.checked}/{view.total}</span>}
      </div>
      <p className="mt-1 text-[13px] text-muted leading-snug">
        {t({
          hi: "Aapke bank data se. Pakka karein, theek karein ya hataayein: aapki baat har screen par lagti hai. Jo aapne nahi jaancha, woh \"aapne nahi jaancha\" ke saath gina jaata hai.",
          en: "From your own bank data. Confirm, fix or ignore: your word applies on every screen. Anything you haven't checked still counts, marked \"not checked by you\".",
        })}
      </p>

      {!view && !err && <p className="mt-3 text-sm text-muted">{t({ hi: "Dhoondh rahe hain…", en: "Looking for repeats…" })}</p>}
      {err && <p role="alert" className="mt-3 text-sm font-semibold text-danger">{err}</p>}
      {view && view.items.length === 0 && (
        <p className="mt-3 text-sm">{t({ hi: "Is data mein koi dohraata len-den nahi dikha. Roz ka kharcha neeche theek kar sakte hain.", en: "Nothing repeating was found in this data. You can still correct everyday spending below." })}</p>
      )}

      {view && (
        <ul className="mt-3 space-y-2.5">
          {view.items.map((b) => {
            const dec = b.decision;
            const dayAllowed = Boolean(b.every?.months);
            const shown = dec.amount ?? b.amount;
            return (
              <li key={b.series} className={`rounded-[20px] p-3 ${dec.status === "ignored" ? "bg-lav/60 opacity-70" : "bg-cream"}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">{t(TYPE[b.type] ?? { hi: "Len-den", en: "Payment" })}</p>
                    <p className="font-extrabold leading-tight">{t(b.label)}</p>
                    <p className="text-[14px] mt-0.5">
                      <span className={`font-extrabold num ${b.kind === "income" ? "text-leaf" : ""}`}>{b.kind === "income" ? "+" : "−"}{inr(shown)}</span>
                      {" "}· {t(rhythm(b))} · {t({ hi: "agla", en: "next" })} {day(b.next_date)}
                    </p>
                  </div>
                  {b.certainty && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${b.certainty === "pakka" ? "bg-mint text-leaf" : "bg-amber-soft text-[#8a5a0a]"}`}>
                      {b.certainty === "pakka" ? t({ hi: "Bank mein dikha", en: "Seen in bank" }) : t({ hi: "Andaaza", en: "Estimate" })}
                    </span>
                  )}
                </div>
                {b.basis && <p className="mt-1 text-[12px] text-muted">{t(b.basis)}</p>}

                {editing === b.series ? (
                  <FixForm lang={lang} amount={amount} setAmount={setAmount} dom={dayAllowed ? dom : null} setDom={setDom}
                    unit={lang === "hi" ? "Rakam (₹)" : "Amount (₹)"} busy={busy === b.series}
                    onSave={() => saveFix(b.series, dayAllowed)} onCancel={() => setEditing(null)} />
                ) : dec.status ? (
                  <Decided lang={lang} status={dec.status} fixed={dec.amount !== null || dec.day !== null}
                    receipt={receipts[b.series] ?? null} busy={busy === b.series} onUndo={() => decide(b.series, "undo")} />
                ) : (
                  <Actions lang={lang} busy={busy === b.series}
                    onConfirm={() => decide(b.series, "confirm")}
                    onFix={() => { setEditing(b.series); setAmount(String(Math.round(shown))); setDom(b.next_date.slice(8, 10).replace(/^0/, "")); }}
                    onIgnore={() => decide(b.series, "ignore")} />
                )}
              </li>
            );
          })}

          {/* Everyday spending: the engines' estimate, which the member confirms or corrects (never ignores). */}
          <li className="rounded-[20px] p-3 bg-cream">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">{t({ hi: "Roz ka kharcha", en: "Everyday spending" })}</p>
            <p className="text-[14px] mt-0.5">
              {(view.everyday.fixed_per_day ?? view.everyday.per_day) !== null
                ? <><span className="font-extrabold num">−{inr(view.everyday.fixed_per_day ?? view.everyday.per_day)}</span> {t({ hi: "roz", en: "a day" })}</>
                : t({ hi: "Pata nahi. Aap bata sakte hain.", en: "Not known. You can enter it." })}
            </p>
            {view.everyday.basis && <p className="mt-1 text-[12px] text-muted">{t(view.everyday.basis)}</p>}
            {editing === "everyday" ? (
              <FixForm lang={lang} amount={amount} setAmount={setAmount} dom={null} setDom={setDom}
                unit={lang === "hi" ? "Roz (₹)" : "Per day (₹)"} busy={busy === "everyday"}
                onSave={() => saveFix("everyday", false)} onCancel={() => setEditing(null)} />
            ) : view.everyday.status ? (
              <Decided lang={lang} status="confirmed" fixed={view.everyday.fixed_per_day !== null}
                receipt={receipts.everyday ?? null} busy={busy === "everyday"} onUndo={() => decide("everyday", "undo")} />
            ) : (
              <Actions lang={lang} busy={busy === "everyday"}
                onConfirm={view.everyday.per_day !== null ? () => decide("everyday", "confirm") : null}
                onFix={() => { setEditing("everyday"); setAmount(String(view.everyday.fixed_per_day ?? view.everyday.per_day ?? "")); }}
                onIgnore={null} />
            )}
          </li>
        </ul>
      )}
    </section>
  );
}

function Actions({ lang, busy, onConfirm, onFix, onIgnore }: {
  lang: "hi" | "en"; busy: boolean; onConfirm: (() => void) | null; onFix: () => void; onIgnore: (() => void) | null;
}) {
  const btn = "flex-1 min-h-11 rounded-[14px] text-[13px] font-bold inline-flex items-center justify-center gap-1.5 active:scale-[.97] transition disabled:opacity-40";
  return (
    <div className="mt-2.5 flex gap-2">
      {onConfirm && (
        <button type="button" disabled={busy} onClick={onConfirm} className={`${btn} bg-ink text-white`}>
          <Check size={15} aria-hidden />{lang === "hi" ? "Haan, sahi" : "Confirm"}
        </button>
      )}
      <button type="button" disabled={busy} onClick={onFix} className={`${btn} bg-white shadow-soft`}>
        <Pencil size={14} aria-hidden />{lang === "hi" ? "Theek karein" : "Fix"}
      </button>
      {onIgnore && (
        <button type="button" disabled={busy} onClick={onIgnore} className={`${btn} bg-white shadow-soft`}>
          <X size={15} aria-hidden />{lang === "hi" ? "Nahi hoga" : "Ignore"}
        </button>
      )}
    </div>
  );
}

function Decided({ lang, status, fixed, receipt, busy, onUndo }: {
  lang: "hi" | "en"; status: "confirmed" | "ignored"; fixed: boolean; receipt: string | null; busy: boolean; onUndo: () => void;
}) {
  const label = status === "ignored"
    ? (lang === "hi" ? "Hataya: kisi hisaab mein nahi" : "Ignored: left out everywhere")
    : fixed
      ? (lang === "hi" ? "Aapne theek kiya" : "Corrected by you")
      : (lang === "hi" ? "Aapne pakka kiya" : "Confirmed by you");
  return (
    <div className="mt-2 flex items-center gap-2 text-[12px] flex-wrap">
      <span className={`inline-flex items-center gap-1 font-bold ${status === "ignored" ? "text-muted" : "text-leaf"}`}>
        {status === "ignored" ? <X size={13} aria-hidden /> : <Check size={13} aria-hidden />}{label}
      </span>
      {receipt && <span className="text-muted" title={receipt}>· {lang === "hi" ? "Ledger rasid" : "Ledger receipt"} …{receipt.slice(-4)}</span>}
      <button type="button" disabled={busy} onClick={onUndo} className="ml-auto inline-flex items-center gap-1 font-bold text-ink-2 min-h-9 px-2 disabled:opacity-40">
        <RotateCcw size={13} aria-hidden />{lang === "hi" ? "Wapas" : "Undo"}
      </button>
    </div>
  );
}

function FixForm({ lang, amount, setAmount, dom, setDom, unit, busy, onSave, onCancel }: {
  lang: "hi" | "en"; amount: string; setAmount: (v: string) => void; dom: string | null; setDom: (v: string) => void;
  unit: string; busy: boolean; onSave: () => void; onCancel: () => void;
}) {
  const field = "mt-1 w-full min-h-11 rounded-[12px] border border-ink/15 bg-white px-3 text-[15px] font-bold num";
  return (
    <form className="mt-2.5 space-y-2" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <div className="flex gap-2">
        <label className="flex-1 text-[12px] font-bold text-muted">
          {unit}
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} className={field} />
        </label>
        {dom !== null && (
          <label className="w-24 text-[12px] font-bold text-muted">
            {lang === "hi" ? "Tareekh" : "Day"}
            <input inputMode="numeric" maxLength={2} value={dom} onChange={(e) => setDom(e.target.value.replace(/[^0-9]/g, ""))} className={field} />
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="flex-1 min-h-11 rounded-[14px] bg-ink text-white text-[13px] font-bold disabled:opacity-40">
          {lang === "hi" ? "Save karke pakka karein" : "Save and confirm"}
        </button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-[14px] bg-white shadow-soft px-4 text-[13px] font-bold">
          {lang === "hi" ? "Rehne dein" : "Cancel"}
        </button>
      </div>
    </form>
  );
}
