"use client";
import { Landmark } from "lucide-react";
import { day, inr } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { AccountSummary, SourceLink } from "@/lib/aa-live";
import type { L } from "@/lib/types";

const rupees = (paise: number) => inr(Math.round(paise / 100));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Savings account · SBI-FIP-UAT ··9648 (…)" → "··9648"; the full label is in the balance fact. */
const acct = (label: string) => label.match(/··d{2,4}/)?.[0] ?? label;
const month = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

const SCHEME_STATUS: Record<string, L> = {
  premium_seen: { hi: "Premium kata", en: "Premium paid" },
  not_seen: { hi: "Renewal ke samay premium nahi dikha (doosre khaate se kat sakta hai)", en: "No premium in the renewal window (it may be paid from another account)" },
  outside_age: { hi: "Umar joining seema se bahar", en: "Age is outside the joining band" },
  unknown: { hi: "Is data se pata nahi chalta", en: "Can't tell from this data" },
};

/**
 * The member's own facts from a live Anumati link, each with its source.
 * Every number was worked out on the server; this only formats it.
 */
export default function BankSummaryCard({ link, summary, err }: { link: SourceLink; summary: AccountSummary | null; err: string | null }) {
  const { t, lang } = useApp();
  const sandbox = link.is_sandbox;
  return (
    <section aria-labelledby="bank-summary-title" className="mt-5 rounded-[28px] bg-white p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <span className="grid place-items-center h-9 w-9 rounded-xl bg-mint"><Landmark size={18} aria-hidden /></span>
        <h2 id="bank-summary-title" className="flex-1 font-extrabold text-[16px] leading-tight">
          {t(sandbox ? { hi: "Aapke bank se, Anumati ke zariye (sandbox)", en: "From your bank via Anumati (sandbox)" } : { hi: "Aapke bank se, Anumati ke zariye", en: "From your bank via Anumati" })}
        </h2>
      </div>

      {!summary && !err && <p className="mt-3 text-sm text-muted">{t({ hi: "Bank data padh rahe hain…", en: "Reading your bank data…" })}</p>}
      {err && <p className="mt-3 text-sm font-semibold text-danger">{err}</p>}

      {summary && (
        <dl className="mt-3 space-y-3 text-[14px]">
          <Fact term={{ hi: "Kul balance", en: "Total balance" }}
            value={summary.balance.total ? rupees(summary.balance.total.amount_paise) : t({ hi: "Pata nahi (bank ne balance nahi bheja)", en: "Not known (the bank sent no balance)" })}
            source={<>
              {summary.balance.accounts.map((a) => (
                <span key={a.account_label} className="block">{a.account_label}: {a.balance ? rupees(a.balance.amount_paise) : t({ hi: "pata nahi", en: "not known" })}{a.balance_at ? ` · ${day(a.balance_at.slice(0, 10))}` : ""}</span>
              ))}
              {summary.balance.accounts_without_balance > 0 && <span className="block">{t({ hi: `${summary.balance.accounts_without_balance} khaate ka balance kul mein nahi jod sake`, en: `${summary.balance.accounts_without_balance} account(s) left out of the total: balance not known` })}</span>}
            </>} />

          <Fact term={{ hi: "Har mahine aane wala paisa", en: "Money coming in each month" }}
            value={summary.monthly_inflow.status === "known" ? `${rupees(summary.monthly_inflow.median.amount_paise)} ${lang === "hi" ? "(beech ka mahina)" : "(typical month)"}` : t({ hi: "Pata nahi", en: "Not known" })}
            source={summary.monthly_inflow.status === "known"
              ? t({ hi: `${summary.monthly_inflow.months_counted} poore mahinon ke credit ka median (${month(summary.monthly_inflow.from_month)} – ${month(summary.monthly_inflow.to_month)})`, en: `Median of credits over ${summary.monthly_inflow.months_counted} complete months (${month(summary.monthly_inflow.from_month)} – ${month(summary.monthly_inflow.to_month)})` })
              : summary.monthly_inflow.reason} />

          <Fact term={{ hi: "Har mahine jaane wale bhugtaan", en: "Regular payments out" }}
            value={summary.recurring_debits.items.length === 0 ? t({ hi: "Koi nahi mila", en: "None found" }) : null}
            source={summary.recurring_debits.items.length === 0 ? summary.recurring_debits.reason : null}>
            {summary.recurring_debits.items.length > 0 && (
              <ul className="mt-1 space-y-1.5">
                {summary.recurring_debits.items.map((r) => (
                  <li key={r.payee_label}>
                    <span className="font-bold">{r.payee_label}</span> · <span className="num font-bold">~{rupees(r.typical_amount.amount_paise)}</span>
                    <span className="block text-[12px] text-muted">{t({ hi: `${r.months_seen} mahinon mein, aakhri ${day(r.last_date)}`, en: `In ${r.months_seen} months, last on ${day(r.last_date)}` })} · {t({ hi: "khaata", en: "from" })} {r.account_labels.map(acct).join(", ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </Fact>

          <Fact term={{ hi: "Sarkari bima (PMJJBY / PMSBY)", en: "Government insurance (PMJJBY / PMSBY)" }}
            value={summary.jan_suraksha.status === "not_checked_consent_off" ? t({ hi: "Check nahi kiya", en: "Not checked" }) : null}
            source={summary.jan_suraksha.status === "not_checked_consent_off"
              ? t({ hi: "Aapne \"Alert aur salah\" band rakha, isliye yeh check nahi chala", en: "You kept \"Alerts & suggestions\" off, so this check didn't run" })
              : summary.jan_suraksha.renewal_window_checked
                ? t({ hi: `Renewal samay ${day(summary.jan_suraksha.renewal_window_checked.from)} – ${day(summary.jan_suraksha.renewal_window_checked.to)} dekha`, en: `Checked the renewal window ${day(summary.jan_suraksha.renewal_window_checked.from)} – ${day(summary.jan_suraksha.renewal_window_checked.to)}` })
                : t({ hi: "Data mein renewal ka samay (20 May – 15 Jun) poora nahi hai", en: "The data doesn't cover a renewal window (20 May – 15 Jun)" })}>
            {summary.jan_suraksha.status === "checked" && (
              <ul className="mt-1 space-y-1">
                {summary.jan_suraksha.findings.map((f) => (
                  <li key={f.scheme}><span className="font-bold uppercase">{f.scheme}</span>: {t(SCHEME_STATUS[f.status])}
                    {f.evidence && <span className="text-[12px] text-muted"> · {acct(f.evidence.account_label)}, {day(f.evidence.date)}</span>}</li>
                ))}
              </ul>
            )}
          </Fact>

          <p className="text-[12px] text-muted">
            {t({ hi: "Data ki avadhi", en: "Data covers" })}: {summary.window.from && summary.window.to ? `${summary.window.from} → ${summary.window.to}` : t({ hi: "pata nahi", en: "not known" })} · {summary.window.transaction_count} {t({ hi: "len-den", en: "transactions" })}.{" "}
            {t({ hi: "Hisaab DhanYukti ke server par hua; len-den is screen par nahi aate.", en: "Worked out on DhanYukti's server; transactions never reach this screen." })}
          </p>
        </dl>
      )}
    </section>
  );
}

function Fact({ term, value, source, children }: { term: L; value: React.ReactNode; source: React.ReactNode; children?: React.ReactNode }) {
  const { t, lang } = useApp();
  return (
    <div className="rounded-[18px] bg-cream p-3">
      <dt className="text-[12px] font-bold text-muted">{t(term)}</dt>
      <dd>
        {value !== null && <p className="text-[18px] font-extrabold num leading-tight">{value}</p>}
        {children}
        {source && <p className="mt-1 text-[12px] text-muted"><span className="font-bold">{lang === "hi" ? "Srot:" : "Source:"}</span> {source}</p>}
      </dd>
    </div>
  );
}
