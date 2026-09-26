/**
 * Finds private insurance premiums in linked bank data and summarises
 * cover from what the member told us. Detection is facts only (insurer,
 * licence, amounts, dates). Who a policy covers and what kind it is come
 * only from the member's tags; nothing is guessed.
 *
 * Pure (type-only imports) so scripts can run it.
 */
import type {
  CoverSummary,
  DetectedPolicy,
  MemberGroup,
  PolicyTags,
} from "../../contracts/insurance-cover";
import { matchInsurer } from "./insurers";

interface Txn {
  type: "CREDIT" | "DEBIT" | null;
  amount_paise: number | null;
  value_date: string | null;
  timestamp: string | null;
  narration: string | null;
}

interface Account {
  account_label: string;
  transactions: Txn[];
}

const FREQUENCY_PER_YEAR = {
  monthly: 12,
  quarterly: 4,
  half_yearly: 2,
  yearly: 1,
} as const;

function frequencyOf(count: number): DetectedPolicy["frequency"] {
  if (count >= 10) return "monthly";
  if (count >= 3) return "quarterly";
  if (count === 2) return "half_yearly";
  return "yearly";
}

export function detectPolicies(
  accounts: Account[],
  tags: Record<string, PolicyTags> = {},
): DetectedPolicy[] {
  // Group debits by insurer and premium size (within 10%): two policies
  // with the same insurer usually have different premiums.
  const groups: {
    insurerId: string;
    insurer: string;
    licence: DetectedPolicy["licence"];
    account_label: string;
    amount: number;
    payments: { date: string; amount: number }[];
  }[] = [];

  for (const account of accounts) {
    for (const t of account.transactions) {
      if (t.type !== "DEBIT" || !t.amount_paise || t.amount_paise <= 0) {
        continue;
      }
      const insurer = matchInsurer(t.narration);
      const date = t.value_date ?? t.timestamp?.slice(0, 10) ?? null;
      if (!insurer || !date) continue;
      const group = groups.find(
        (g) =>
          g.insurerId === insurer.id &&
          Math.abs(g.amount - t.amount_paise!) <= g.amount * 0.1,
      );
      if (group) {
        group.payments.push({ date, amount: t.amount_paise });
      } else {
        groups.push({
          insurerId: insurer.id,
          insurer: insurer.name,
          licence: insurer.licence,
          account_label: account.account_label,
          amount: t.amount_paise,
          payments: [{ date, amount: t.amount_paise }],
        });
      }
    }
  }

  return groups
    .map((g) => {
      const last = g.payments.reduce((a, b) => (b.date > a.date ? b : a));
      const frequency = frequencyOf(g.payments.length);
      const policy_key = `${g.insurerId}-${Math.round(g.amount / 10_000)}`;
      return {
        policy_key,
        insurer: g.insurer,
        licence: g.licence,
        account_label: g.account_label,
        last_paid: {
          date: last.date,
          amount: { amount_paise: last.amount, currency: "INR" as const },
        },
        payments_seen: g.payments.length,
        frequency,
        yearly_premium: {
          amount_paise: last.amount * FREQUENCY_PER_YEAR[frequency],
          currency: "INR" as const,
        },
        tags: tags[policy_key] ?? null,
      };
    })
    .sort(
      (a, b) => b.yearly_premium.amount_paise - a.yearly_premium.amount_paise,
    );
}

export function summariseCover(policies: DetectedPolicy[]): CoverSummary {
  const tagged = policies.filter((p) => p.tags);
  const health = new Set<MemberGroup>();
  for (const p of tagged) {
    if (p.tags!.kind === "health") p.tags!.covers.forEach((g) => health.add(g));
  }
  return {
    policies_found: policies.length,
    policies_tagged: tagged.length,
    life_for_self: tagged.some(
      (p) => p.tags!.kind === "life" && p.tags!.covers.includes("self"),
    )
      ? "yes"
      : "not_told",
    health_groups: Array.from(health),
    motor: tagged.some((p) => p.tags!.kind === "motor"),
    yearly_premiums_total: policies.length
      ? {
          amount_paise: policies.reduce(
            (sum, p) => sum + p.yearly_premium.amount_paise,
            0,
          ),
          currency: "INR",
        }
      : null,
  };
}
