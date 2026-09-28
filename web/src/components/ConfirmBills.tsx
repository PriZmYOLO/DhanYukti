"use client";
import { useEffect, useState } from "react";
import { Check, Pencil, RotateCcw, X, CalendarClock } from "lucide-react";
import { aaLive, type BillsView, type SourceLink } from "@/lib/aa-live";
import type { BillAction, BillCategory, BillItem, Cadence, Confidence, FirstTask, OutlookResult } from "@/lib/contracts/aa-bills";
import { day, inr } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { L } from "@/lib/types";
import { SpeakBtn } from "@/components/ui/bits";

/**
 * Confirm your bills (E02 with a consent step) and the member's own
 * 30 days. The server suggests what repeats in their bank data; the member
 * confirms, fixes or ignores each item; only confirmed items are projected.
 * Every number is worked out on the server; this only formats it.
 */

const rupees = (paise: number) => inr(Math.round(paise / 100));
/** "Savings account · SBI-FIP-UAT ··9648" → "··9648". */
const acct = (label: string) => label.match(/··\d{2,4}/)?.[0] ?? label;

const CADENCE: Record<Cadence, L> = {
  monthly: { hi: "har mahine", en: "every month" },
  quarterly: { hi: "har 3 mahine", en: "every 3 months" },
  yearly: { hi: "har saal", en: "every year" },
};

const CATEGORY: Record<BillCategory, L> = {
  salary: { hi: "Tankhwah", en: "Salary" },
  rent: { hi: "Kiraya", en: "Rent" },
  emi: { hi: "EMI / loan", en: "EMI / loan" },
  utility: { hi: "Bijli-paani-phone", en: "Utility" },
  school_fee: { hi: "School fees", en: "School fee" },
  insurance: { hi: "Beema", en: "Insurance" },
  scheme: { hi: "Sarkari yojana", en: "Govt scheme" },
  other: { hi: "Doosra", en: "Other" },
};

const CONFIDENCE: Record<Confidence, { l: L; cls: string }> = {
  high: { l: { hi: "Pakka lagta hai", en: "Likely" }, cls: "bg-mint text-leaf" },
  medium: { l: { hi: "Shayad", en: "Probably" }, cls: "bg-amber-soft text-[#8a5a0a]" },
  low: { l: { hi: "Pakka nahi", en: "Unsure" }, cls: "bg-danger-soft text-danger" },
};

const RESILIENCE: Record<"red" | "amber" | "green", string> = {
  red: "text-danger",
  amber: "text-amber",
  green: "text-leaf",
};

function evidence(item: BillItem): L {
  const e = item.evidence;
  if (e.basis === "scheme_rule") {
    return {
      hi: "Ek baar kata dikha; yeh yojana har saal 31 May tak renew hoti hai",
      en: "Seen once; the scheme renews every year by 31 May",
    };
  }
  const spread = e.amount_spread_pct === 0
    ? { hi: "har baar same rakam", en: "same amount each time" }
    : { hi: `rakam ${e.amount_spread_pct}% tak badli`, en: `amount varies up to ${e.amount_spread_pct}%` };
  return {
    hi: `${e.months_seen} mahino mein ${e.occurrences} baar dikha · ${spread.hi}`,
    en: `Seen ${e.occurrences} times in ${e.months_seen} months · ${spread.en}`,
  };
}

function taskText(task: FirstTask): L {
  if (task.kind === "shortfall") {
    const bill = task.bill_label ?? "";
    const after = task.next_income_date ? day(task.next_income_date) : null;
    return {
      hi: `${day(task.date)} ko ${rupees(task.gap.amount_paise)} kam padenge${bill ? ` (${bill})` : ""}. Aaj se roz ${rupees(task.per_day.amount_paise)} alag rakhein${after ? `, ya ${bill || "bill"} ko ${after} ke baad dene ki baat karein` : ""}.`,
      en: `${rupees(task.gap.amount_paise)} short on ${day(task.date)}${bill ? ` (${bill})` : ""}. Set aside ${rupees(task.per_day.amount_paise)} a day from today${after ? `, or ask to pay ${bill || "the bill"} after ${after}` : ""}.`,
    };
  }
  if (task.kind === "build_buffer") {
    return {
      hi: `Aapke paas ${task.resilience_days} din ka bachav hai. 30 din tak pahunchne ke liye roz ${rupees(task.per_day.amount_paise)} gullak mein daalein (90 din).`,
      en: `You have ${task.resilience_days} days of cover. Put ${rupees(task.per_day.amount_paise)} a day in the gullak to reach 30 days (90 days).`,
    };
  }
  return {
    hi: `Agle 30 din kami nahi dikhti. Sabse kam balance ${rupees(task.lowest.amount_paise)}, ${day(task.lowest_date)} ko.`,
    en: `No shortfall in the next 30 days. Lowest balance ${rupees(task.lowest.amount_paise)} on ${day(task.lowest_date)}.`,
  };
}

export default function ConfirmBills({ link }: { link: SourceLink }) {
  const { t, lang } = useApp();
  const [view, setView] = useState<BillsView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("");

  // Data can land a few seconds after the reveal: retry briefly on "no data yet".
  useEffect(() => {
    let stop = false;
    let tries = 0;
    const load = async () => {
      try {
        const v = await aaLive.bills(link.link_id);
        if (!stop) { setView(v); setErr(null); }
      } catch (e) {
        if (stop) return;
        if (++tries < 10) window.setTimeout(load, 3000);
        else setErr(e instanceof Error ? e.message : "error");
      }
    };
    load();
    return () => { stop = true; };
  }, [link.link_id]);

  async function decide(id: string, action: BillAction, extra: { amount_rupees?: number; day?: number } = {}) {
    setBusy(id); setErr(null);
    try {
      setView(await aaLive.decideBill(link.link_id, { id, action, ...extra }));
      setEditing(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(null);
    }
  }

  function openFix(id: string, paise: number | null, d: number | null) {
    setEditing(id);
    setAmount(paise === null ? "" : String(Math.round(paise / 100)));
    setDayOfMonth(d === null ? "" : String(d));
  }

  function saveFix(id: string, dayAllowed: boolean) {
    const a = amount.trim() === "" ? undefined : Number(amount);
    const d = !dayAllowed || dayOfMonth.trim() === "" ? undefined : Number(dayOfMonth);
    decide(id, "fix", { amount_rupees: a, day: d });
  }

  const decidedCount = view ? view.items.filter((i) => i.decision).length + (view.everyday.decision ? 1 : 0) : 0;
  const total = view ? view.items.length + 1 : 0;

  return (
    <>
      <section aria-labelledby="confirm-bills-title" className="mt-4 rounded-[28px] bg-white p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-haldi-soft"><CalendarClock size={18} aria-hidden /></span>
          <h2 id="confirm-bills-title" className="flex-1 font-extrabold text-[16px] leading-tight">
            {t({ hi: "Yeh baar-baar aate dikhe", en: "We think these repeat" })}
          </h2>
          {view && <span className="text-[12px] font-bold text-muted">{decidedCount}/{total}</span>}
        </div>
        <p className="mt-1 text-[13px] text-muted leading-snug">
          {t({
            hi: "Har ek ko pakka karein, theek karein ya hataayein. Aapke 30 din sirf pakke kiye hue se bante hain, andaaze se nahi.",
            en: "Confirm, fix or ignore each one. Your 30 days use only what you confirm, never a guess.",
          })}
        </p>

        {!view && !err && <p className="mt-3 text-sm text-muted">{t({ hi: "Dhoondh rahe hain…", en: "Looking for repeats…" })}</p>}
        {err && <p className="mt-3 text-sm font-semibold text-danger">{err}</p>}

        {view && view.items.length === 0 && (
          <p className="mt-3 text-sm">{view.reason ?? t({ hi: "Kuch dohraata nahi dikha.", en: "Nothing repeating was found." })}</p>
        )}

        {view && (
          <ul className="mt-3 space-y-2.5">
            {view.items.map((item) => {
              const dayAllowed = item.evidence.basis === "repeats" && item.cadence !== "yearly";
              const conf = CONFIDENCE[item.confidence];
              const decided = item.decision;
              return (
                <li key={item.id} className={`rounded-[20px] p-3 ${decided?.status === "ignored" ? "bg-lav/60 opacity-70" : "bg-cream"}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                        {item.kind === "income" ? t({ hi: "Aamdani", en: "Income" }) : t(CATEGORY[item.category])}
                      </p>
                      <p className="font-extrabold leading-tight truncate">{item.payee_label}</p>
                      <p className="text-[14px] mt-0.5">
                        <span className={`font-extrabold num ${item.kind === "income" ? "text-leaf" : ""}`}>
                          {item.kind === "income" ? "+" : "−"}{rupees(item.effective_amount.amount_paise)}
                        </span>{" "}
                        · {t(CADENCE[item.cadence])} · {t({ hi: "agla", en: "next" })} {day(item.next_date)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${conf.cls}`}>{t(conf.l)}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-muted">
                    {t(evidence(item))} · {acct(item.account_labels[0] ?? "")}
                  </p>
                  {item.may_have_stopped && (
                    <p className="mt-1 text-[12px] font-semibold text-danger">
                      {t({ hi: `Aakhri baar ${day(item.last_date)} ko dikha; shayad band ho gaya`, en: `Last seen ${day(item.last_date)}; it may have stopped` })}
                    </p>
                  )}

                  {editing === item.id ? (
                    <FixForm
                      lang={lang} amount={amount} setAmount={setAmount}
                      dayOfMonth={dayAllowed ? dayOfMonth : null} setDayOfMonth={setDayOfMonth}
                      busy={busy === item.id}
                      onSave={() => saveFix(item.id, dayAllowed)} onCancel={() => setEditing(null)}
                    />
                  ) : decided ? (
                    <Decided
                      lang={lang} status={decided.status} fixed={Boolean(decided.amount || decided.day)}
                      receipt={decided.receipt_id} busy={busy === item.id} onUndo={() => decide(item.id, "undo")}
                    />
                  ) : (
                    <Actions
                      lang={lang} busy={busy === item.id}
                      onConfirm={() => decide(item.id, "confirm")}
                      onFix={() => openFix(item.id, item.typical_amount.amount_paise, item.typical_day)}
                      onIgnore={() => decide(item.id, "ignore")}
                    />
                  )}
                </li>
              );
            })}

            {/* Everyday spend: an estimate the member confirms or corrects. */}
            <li className={`rounded-[20px] p-3 ${view.everyday.decision?.status === "ignored" ? "bg-lav/60 opacity-70" : "bg-cream"}`}>
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">{t({ hi: "Roz ka kharcha", en: "Everyday spending" })}</p>
              <p className="text-[14px] mt-0.5">
                {view.everyday.effective_per_month
                  ? <><span className="font-extrabold num">−{rupees(view.everyday.effective_per_month.amount_paise)}</span> · {t({ hi: "mahine mein (roz thoda-thoda)", en: "a month (a little each day)" })}</>
                  : t({ hi: "Pata nahi. Aap rakam bata sakte hain.", en: "Not known. You can enter the amount." })}
              </p>
              <p className="mt-1 text-[12px] text-muted">
                {view.everyday.estimate.status === "known"
                  ? t({
                      hi: `Kirana, safar jaise baaki kharche; ${view.everyday.estimate.months_counted} mahino ka beech ka mahina`,
                      en: `Groceries, travel and other spending; typical month over ${view.everyday.estimate.months_counted} months`,
                    })
                  : view.everyday.estimate.reason}
              </p>
              {editing === "everyday" ? (
                <FixForm
                  lang={lang} amount={amount} setAmount={setAmount} dayOfMonth={null} setDayOfMonth={setDayOfMonth}
                  busy={busy === "everyday"} onSave={() => saveFix("everyday", false)} onCancel={() => setEditing(null)}
                />
              ) : view.everyday.decision ? (
                <Decided
                  lang={lang} status={view.everyday.decision.status} fixed={Boolean(view.everyday.decision.amount)}
                  receipt={view.everyday.decision.receipt_id} busy={busy === "everyday"} onUndo={() => decide("everyday", "undo")}
                />
              ) : (
                <Actions
                  lang={lang} busy={busy === "everyday"}
                  onConfirm={view.everyday.estimate.status === "known" ? () => decide("everyday", "confirm") : null}
                  onFix={() => openFix("everyday", view.everyday.effective_per_month?.amount_paise ?? null, null)}
                  onIgnore={() => decide("everyday", "ignore")}
                />
              )}
            </li>
          </ul>
        )}
      </section>

      {view && <Outlook outlook={view.outlook} sandbox={view.is_sandbox} />}
    </>
  );
}

function Actions({ lang, busy, onConfirm, onFix, onIgnore }: {
  lang: "hi" | "en"; busy: boolean; onConfirm: (() => void) | null; onFix: () => void; onIgnore: () => void;
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
      <button type="button" disabled={busy} onClick={onIgnore} className={`${btn} bg-white shadow-soft`}>
        <X size={15} aria-hidden />{lang === "hi" ? "Hataayein" : "Ignore"}
      </button>
    </div>
  );
}

function Decided({ lang, status, fixed, receipt, busy, onUndo }: {
  lang: "hi" | "en"; status: "confirmed" | "ignored"; fixed: boolean; receipt: string | null; busy: boolean; onUndo: () => void;
}) {
  const label = status === "ignored"
    ? (lang === "hi" ? "Hataya: aapke 30 din mein nahi" : "Ignored: not in your 30 days")
    : fixed
      ? (lang === "hi" ? "Aapne theek kiya aur pakka kiya" : "Corrected and confirmed by you")
      : (lang === "hi" ? "Aapne pakka kiya" : "Confirmed by you");
  return (
    <div className="mt-2 flex items-center gap-2 text-[12px]">
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

function FixForm({ lang, amount, setAmount, dayOfMonth, setDayOfMonth, busy, onSave, onCancel }: {
  lang: "hi" | "en"; amount: string; setAmount: (v: string) => void; dayOfMonth: string | null; setDayOfMonth: (v: string) => void;
  busy: boolean; onSave: () => void; onCancel: () => void;
}) {
  const field = "mt-1 w-full min-h-11 rounded-[12px] border border-ink/15 bg-white px-3 text-[15px] font-bold num";
  return (
    <form className="mt-2.5 space-y-2" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <div className="flex gap-2">
        <label className="flex-1 text-[12px] font-bold text-muted">
          {lang === "hi" ? "Rakam (₹)" : "Amount (₹)"}
          <input inputMode="numeric" pattern="[0-9]*" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} className={field} />
        </label>
        {dayOfMonth !== null && (
          <label className="w-24 text-[12px] font-bold text-muted">
            {lang === "hi" ? "Tareekh" : "Day"}
            <input inputMode="numeric" pattern="[0-9]*" maxLength={2} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value.replace(/[^0-9]/g, ""))} className={field} />
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

function Outlook({ outlook, sandbox }: { outlook: OutlookResult; sandbox: boolean }) {
  const { t } = useApp();
  const title = sandbox
    ? { hi: "Aapke agle 30 din, aapke bank se (sandbox)", en: "Your next 30 days, from your bank (sandbox)" }
    : { hi: "Aapke agle 30 din, aapke bank se", en: "Your next 30 days, from your bank" };

  if (outlook.status !== "ready") {
    const msg: Record<Exclude<OutlookResult["status"], "ready">, L> = {
      not_allowed: {
        hi: 'Aapne "Parivaar ke hisaab mein jodein" band rakha, isliye is data se aapke 30 din nahi banaye. Yeh aapka faisla hai.',
        en: 'You kept "Use in household calculations" off, so your 30 days aren\'t worked out from this data. That\'s your choice.',
      },
      needs_confirmation: {
        hi: "Upar kam se kam ek cheez pakki karein. Andaaze se kuch nahi banta.",
        en: "Confirm at least one item above. Nothing is projected from a guess.",
      },
      no_balance: {
        hi: "Bank ne balance nahi bheja, isliye shuruaat pata nahi.",
        en: "The bank sent no balance, so there's no starting point.",
      },
    };
    return (
      <section className="mt-4 rounded-[28px] bg-lav p-4">
        <h2 className="font-extrabold text-[16px] leading-tight">{t(title)}</h2>
        <p className="mt-2 text-[14px] leading-snug">{t(msg[outlook.status])}</p>
      </section>
    );
  }

  const task = taskText(outlook.first_task);
  const short = outlook.first_shortfall;
  return (
    <section aria-labelledby="own-outlook-title" className="mt-4 rounded-[32px] bg-ink text-white p-5">
      <h2 id="own-outlook-title" className="text-[12px] text-haldi font-bold uppercase tracking-widest">{t(title)}</h2>
      {short ? (
        <p className="mt-2 text-[28px] font-extrabold leading-tight">
          {t({ hi: `${day(short.date)} ko ${rupees(short.gap.amount_paise)} kam`, en: `${rupees(short.gap.amount_paise)} short on ${day(short.date)}` })}
        </p>
      ) : (
        <p className="mt-2 text-[28px] font-extrabold leading-tight">{t({ hi: "30 din mein kami nahi", en: "No shortfall in 30 days" })}</p>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label={{ hi: "Bachav", en: "Cover" }} value={outlook.resilience_days === null ? "?" : `${outlook.resilience_days} ${t({ hi: "din", en: "days" })}`} tone={outlook.resilience_status ? RESILIENCE[outlook.resilience_status] : ""} />
        <Stat label={{ hi: "Sabse kam", en: "Lowest" }} value={`${outlook.lowest.balance.amount_paise < 0 ? "−" : ""}${rupees(Math.abs(outlook.lowest.balance.amount_paise))}`} sub={day(outlook.lowest.date)} />
        <Stat label={{ hi: "Agli aamdani", en: "Next income" }} value={outlook.next_income_date ? day(outlook.next_income_date) : "—"} />
      </div>
      <River outlook={outlook} />
      <div className={`mt-3 rounded-[20px] p-3 flex items-start gap-3 ${outlook.first_task.kind === "shortfall" ? "bg-danger-soft text-ink" : outlook.first_task.kind === "build_buffer" ? "bg-amber-soft text-ink" : "bg-mint text-ink"}`}>
        <div className="flex-1">
          <p className="text-[11px] font-extrabold uppercase">{t({ hi: "Pehla kaam", en: "First task" })}</p>
          <p className="font-bold leading-snug text-[14px]">{t(task)}</p>
        </div>
        <SpeakBtn v={task} size={40} />
      </div>
      <p className="mt-3 text-[12px] text-white/70 leading-snug">
        {t({
          hi: `Sirf aapki pakki ki hui ${outlook.used_ids.length} cheezon se. Shuruaati balance ${rupees(outlook.opening.amount_paise)}${outlook.opening_as_of ? ` (${day(outlook.opening_as_of.slice(0, 10))})` : ""}.`,
          en: `From the ${outlook.used_ids.length} item(s) you confirmed, nothing else. Starting balance ${rupees(outlook.opening.amount_paise)}${outlook.opening_as_of ? ` (as of ${day(outlook.opening_as_of.slice(0, 10))})` : ""}.`,
        })}
        {outlook.assumptions.no_income_confirmed && ` ${t({ hi: "Koi aamdani pakki nahi, isliye maana ki paisa nahi aayega.", en: "No income confirmed, so this assumes no money comes in." })}`}
        {outlook.assumptions.no_everyday_confirmed && ` ${t({ hi: "Roz ka kharcha pakka nahi, isliye shaamil nahi.", en: "Everyday spending not confirmed, so it's left out." })}`}
      </p>
    </section>
  );
}

function Stat({ label, value, sub, tone = "" }: { label: L; value: string; sub?: string; tone?: string }) {
  const { t } = useApp();
  return (
    <div className="rounded-[18px] bg-white/10 p-2.5">
      <p className="text-[11px] text-white/60 leading-tight">{t(label)}</p>
      <p className={`text-[15px] font-extrabold num mt-1 ${tone}`}>{value}</p>
      {sub && <p className="text-[11px] text-white/60">{sub}</p>}
    </div>
  );
}

/** Daily closing balance for 30 days, with the zero line. */
function River({ outlook }: { outlook: Extract<OutlookResult, { status: "ready" }> }) {
  const { t } = useApp();
  const W = 300, H = 72, P = 4;
  const vals = outlook.days.map((d) => d.balance.amount_paise);
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals);
  const span = max - min || 1;
  const x = (i: number) => P + (i / (vals.length - 1)) * (W - 2 * P);
  const y = (v: number) => P + ((max - v) / span) * (H - 2 * P);
  const points = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const shortIdx = outlook.first_shortfall ? outlook.days.findIndex((d) => d.date === outlook.first_shortfall!.date) : -1;
  const label = outlook.first_shortfall
    ? t({ hi: `Balance ${day(outlook.first_shortfall.date)} ko shunya se neeche jaata hai`, en: `Balance goes below zero on ${day(outlook.first_shortfall.date)}` })
    : t({ hi: "Balance 30 din shunya se upar rehta hai", en: "Balance stays above zero for 30 days" });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="mt-3 w-full h-[72px]">
      <line x1={P} x2={W - P} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="3 4" />
      <polyline points={points} fill="none" stroke="var(--color-haldi)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {shortIdx >= 0 && <circle cx={x(shortIdx)} cy={y(vals[shortIdx])} r={4.5} fill="var(--color-danger)" stroke="white" strokeWidth={1.5} />}
    </svg>
  );
}
