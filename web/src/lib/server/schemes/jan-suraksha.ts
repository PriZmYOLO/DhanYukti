/**
 * Jan Suraksha rule (Job 2a): are PMJJBY / PMSBY premiums being paid from
 * the member's linked accounts? Public before private: this runs before any
 * private insurance idea, and DhanYukti earns nothing from it.
 *
 * Official facts (financialservices.gov.in, checked 27 Sep 2026):
 *   PMJJBY ₹436/yr → ₹2 lakh life cover; join 18–50, cover to 55;
 *          one bank/post-office account per person.
 *   PMSBY  ₹20/yr  → ₹2 lakh accident death/total disability; 18–70.
 *   Cover year 1 June – 31 May; premium auto-debited on or before the due
 *   date (end of May).
 *
 * Honesty rules:
 *   - A premium is only "seen" from a debit whose narration names the
 *     scheme. Amount alone is never enough.
 *   - "not_seen" needs the data to cover a renewal window (20 May – 15 Jun);
 *     otherwise the answer is "unknown", never "not enrolled".
 *   - Even "not_seen" may mean it's paid from another account; the UI says so.
 *
 * Pure function (type-only imports), so scripts can run it directly.
 */
import type { MoneyPaise } from "../../contracts/common";
import type {
  SchemeCheckResult,
  SchemeFinding,
  SchemeId,
} from "../../contracts/scheme-check";

export interface CheckTransaction {
  type: "CREDIT" | "DEBIT" | null;
  amount_paise: number | null;
  value_date: string | null;
  timestamp: string | null;
  narration: string | null;
}

export interface CheckAccount {
  account_label: string;
  data_from: string | null;
  data_to: string | null;
  holder_age: number | null;
  transactions: CheckTransaction[];
}

const rupees = (r: number): MoneyPaise => ({
  amount_paise: r * 100,
  currency: "INR",
});

export const SCHEMES: Record<
  SchemeId,
  { premium: number; cover: number; join: [number, number]; pattern: RegExp }
> = {
  pmjjby: {
    premium: 436,
    cover: 200_000,
    join: [18, 50],
    pattern: /PMJJBY|P\s*M\s*J\s*J\s*B\s*Y|JEEVAN\s*JYOTI|\bJJBY\b/i,
  },
  pmsby: {
    premium: 20,
    cover: 200_000,
    join: [18, 70],
    pattern: /PMSBY|P\s*M\s*S\s*B\s*Y|SURAKSHA\s*BIMA|\bPMSB\b/i,
  },
};

/** "JAN SURAKSHA" names both schemes; the amount then tells them apart. */
const BOTH = /JAN\s*SURAKSHA/i;

function txnDate(t: CheckTransaction): string | null {
  return t.value_date ?? t.timestamp?.slice(0, 10) ?? null;
}

function matchScheme(t: CheckTransaction): SchemeId[] {
  if (t.type !== "DEBIT" || !t.narration) return [];
  const found = (Object.keys(SCHEMES) as SchemeId[]).filter((id) =>
    SCHEMES[id].pattern.test(t.narration!),
  );
  if (found.length || !BOTH.test(t.narration)) return found;
  const rs = (t.amount_paise ?? 0) / 100;
  if (rs === 436) return ["pmjjby"];
  if (rs === 20) return ["pmsby"];
  if (rs === 456) return ["pmjjby", "pmsby"];
  return [];
}

/** The latest 20 May – 15 Jun window that the data fully covers. */
function coveredWindow(from: string | null, to: string | null) {
  if (!from || !to) return null;
  for (
    let year = Number(to.slice(0, 4));
    year >= Number(from.slice(0, 4));
    year--
  ) {
    const w = { from: `${year}-05-20`, to: `${year}-06-15` };
    if (from <= w.from && to >= w.to) return w;
  }
  return null;
}

function istToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    now,
  );
}

export function checkJanSuraksha(
  accounts: CheckAccount[],
  options: { now?: Date; isSandbox?: boolean } = {},
): Extract<SchemeCheckResult, { status: "ready" }> {
  const now = options.now ?? new Date();
  const today = istToday(now);
  const froms = accounts.map((a) => a.data_from).filter(Boolean) as string[];
  const tos = accounts.map((a) => a.data_to).filter(Boolean) as string[];
  const dataFrom = froms.length ? froms.sort()[0] : null;
  const dataTo = tos.length ? tos.sort()[tos.length - 1] : null;
  // A window counts only if one account alone covers it.
  const windows = accounts
    .map((a) => coveredWindow(a.data_from, a.data_to))
    .filter(Boolean) as { from: string; to: string }[];
  const window =
    windows.sort((a, b) => b.from.localeCompare(a.from))[0] ?? null;
  const age = accounts.find((a) => a.holder_age !== null)?.holder_age ?? null;

  const findings: SchemeFinding[] = (Object.keys(SCHEMES) as SchemeId[]).map(
    (scheme) => {
      const facts = SCHEMES[scheme];
      let evidence: SchemeFinding["evidence"] = null;
      for (const account of accounts) {
        for (const t of account.transactions) {
          const date = txnDate(t);
          if (!date || !matchScheme(t).includes(scheme)) continue;
          if (!evidence || date > evidence.date) {
            evidence = {
              account_label: account.account_label,
              date,
              amount: {
                amount_paise: t.amount_paise ?? facts.premium * 100,
                currency: "INR",
              },
            };
          }
        }
      }
      const outside =
        age !== null && (age < facts.join[0] || age > facts.join[1]);
      const status: SchemeFinding["status"] = evidence
        ? "premium_seen"
        : outside
          ? "outside_age"
          : window
            ? "not_seen"
            : "unknown";
      return {
        scheme,
        status,
        annual_premium: rupees(facts.premium),
        cover: rupees(facts.cover),
        join_age: facts.join,
        evidence,
      };
    },
  );

  const suggest = findings
    .filter((f) => f.status === "not_seen")
    .map((f) => f.scheme);
  const sum = (key: "premium" | "cover") =>
    suggest.length
      ? rupees(suggest.reduce((total, id) => total + SCHEMES[id][key], 0))
      : null;

  const year = Number(today.slice(0, 4));
  const nextRenewal =
    today <= `${year}-05-31` ? `${year}-05-31` : `${year + 1}-05-31`;

  return {
    status: "ready",
    checked_at: now.toISOString(),
    data_from: dataFrom,
    data_to: dataTo,
    holder_age: age,
    renewal_window_checked: window,
    findings,
    suggest,
    suggest_total_premium: sum("premium"),
    suggest_total_cover: sum("cover"),
    next_renewal_by: nextRenewal,
    is_sandbox: options.isSandbox ?? false,
  };
}
