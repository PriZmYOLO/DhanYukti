import "server-only";

import { listJoinedLinks, listLinks, readAccountData, readHouseholdAccountData, type StoredAccountData } from "@/lib/server/aa/links";
import { kvDel, kvGet, kvSet, kvSetIfAbsent } from "@/lib/server/aa/store";
import { hasConsent } from "@/lib/server/dpdp/ledger";
import { readAnswers } from "@/lib/server/onboarding/store";
import { readHubFacts, type HubFacts } from "@/lib/server/twin/hub";
import { STATE_TTL, twinKeys, withoutBankCorrections } from "@/lib/server/twin/keys";
import type { LinkMember, SourceLink } from "@/lib/provisional/h03/types";
import type { L } from "@/lib/types";

/**
 * A linked member's Household Twin: built by the FastAPI engines (E02) from
 * THEIR decrypted bank data while it is still here (≤ 24 hours), then kept
 * as derived facts only, next to their own jars/game/corrections.
 *
 * FastAPI is stateless for twins: every call sends the twin + state and
 * gets the answer back. Nothing here ever falls back to a demo household.
 */

const DAY = 24 * 60 * 60;
/** Same life as the other derived facts from a bank link. */
export const TWIN_TTL = 30 * DAY;


export type Twin = Record<string, unknown> & { id: "me"; as_of: string; fetched_at?: string; built_from?: string[] };
export type TwinState = Record<string, unknown>;

export class TwinError extends Error {
  constructor(
    public status: number,
    public code: string,
    public safe: string,
    public missing: L[] = [],
  ) {
    super(code);
  }
}

function engineOrigin(): string | null {
  const o = process.env.API_ORIGIN ?? (process.env.VERCEL ? null : "http://127.0.0.1:8000");
  return o ? o.replace(/\/+$/, "") : null;
}

/** Server-to-server call to the engines. Render's free plan can take ~50 s to wake. */
export async function callEngine<T>(path: string, body: unknown): Promise<T> {
  const origin = engineOrigin();
  if (!origin) throw new TwinError(503, "engine_not_configured", "The money engines aren't connected on this deployment (API_ORIGIN).");
  let res: Response;
  try {
    res = await fetch(`${origin}/api/twin/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.TWIN_SHARED_SECRET ? { "x-twin-secret": process.env.TWIN_SHARED_SECRET } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    throw new TwinError(503, "engine_unreachable", "The money engines didn't answer. Please try again in a minute.", );
  }
  const json = (await res.json().catch(() => null)) as T | { detail?: string } | null;
  if (res.status === 422) throw new TwinError(422, "invalid_request", typeof (json as { detail?: string })?.detail === "string" ? (json as { detail: string }).detail : "That change isn't supported.");
  if (!res.ok || json === null) throw new TwinError(503, "engine_error", "The money engines had a problem. Please try again.");
  return json as T;
}

const rupees = (paise: number | null | undefined) => (paise == null ? null : Math.round(paise) / 100);
const istDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

/** Build (or rebuild) from every active link in this session whose data is still here. */
export async function buildTwin(sid: string): Promise<Twin> {
  // A fresh build (no twin now: first link, or after stop/revoke/expiry) never inherits
  // decisions made on an earlier twin's payments.
  if (!(await kvGet(twinKeys.twin(sid)))) {
    const old = await kvGet<TwinState>(twinKeys.state(sid));
    if (old) await kvSet(twinKeys.state(sid), withoutBankCorrections(old), STATE_TTL);
  }
  // One household = this phone's own links + links family members made from this household's
  // invites on their own phones. Each account belongs to whoever linked it; a "private" account
  // never reaches the engines, a "sirf_total" one is reduced to totals there.
  const own = (await listLinks(sid)).filter((l) => l.consent.status === "active" && !l.is_demo);
  const joined = (await listJoinedLinks(sid)).filter((l) => l.consent.status === "active");
  const SELF: LinkMember = { id: "me", self: true, relation: null, role: "self", sharing: "poora" };
  // A link this phone made into ANOTHER household is still this person's own account here.
  const whose = (l: SourceLink): LinkMember => (l.household === "joined" || !l.member ? SELF : l.member);
  const entries = [
    ...own.map((l) => ({ link: l, member: whose(l), read: () => readAccountData(sid, l.link_id) })),
    ...joined.map((l) => ({ link: l, member: l.member ?? SELF, read: () => readHouseholdAccountData(sid, l.link_id) })),
  ];
  if (!entries.length) throw new TwinError(404, "not_linked", "No bank account is linked yet.");
  const used = entries.filter((e) => e.member.self || e.member.sharing !== "private");
  if (!used.length) {
    throw new TwinError(409, "twin_insufficient", "Every linked account is set to private, so there's no household picture to show.");
  }
  const read = await Promise.all(used.map(async (e) => ({ ...e, data: await e.read() })));
  const datas = read.filter(
    (x): x is typeof x & { data: StoredAccountData } => x.data !== null && x.data.accounts.length > 0,
  );
  if (!datas.length) {
    const arrived = used.some((e) => e.link.import.status === "complete" || e.link.import.status === "partial");
    throw arrived
      ? new TwinError(410, "data_expired", "Your bank data is deleted 24 hours after it arrives. Link again to rebuild your picture.")
      : new TwinError(409, "data_pending", "Your bank data hasn't arrived yet.");
  }
  const fetchedAt = datas.map((x) => x.data.fetched_at).sort().at(-1)!;
  const accounts = datas.flatMap(({ data: x, member }) =>
    x.accounts.map((a, i) => ({
      id: `${x.link_id.slice(-6)}-${i + 1}`,
      member: member.self ? "me" : member.id,
      masked: a.masked_acc_number,
      fip: a.fip_id,
      type: a.account_type,
      fi_type: a.fi_type ?? "DEPOSIT",
      balance: rupees(a.balance_paise),
      transactions: (a.transactions ?? [])
        .filter((t) => t.amount_paise != null && t.type && (t.value_date || t.timestamp))
        .map((t) => ({
          date: t.value_date ?? istDate(new Date(t.timestamp!)),
          narration: t.narration ?? "",
          amount: (t.type === "CREDIT" ? 1 : -1) * rupees(t.amount_paise)!,
        })),
    })),
  );
  const holderOf = (pick: (m: LinkMember) => boolean) =>
    datas.filter((x) => pick(x.member)).flatMap((x) => x.data.accounts).find((a) => a.holder_first_name || a.holder_age);
  const holder = holderOf((m) => m.self);
  // Family members, as each chose to show. Same person via two banks = two ids (kept simple).
  const linked = [...new Map(datas.filter((x) => !x.member.self).map((x) => [x.member.id, x.member])).values()].map((m) => {
    const h = holderOf((mm) => mm.id === m.id);
    return { id: m.id, name: h?.holder_first_name ?? null, age: h?.holder_age ?? null, relation: m.relation, role: m.role, sharing: m.sharing, self: false };
  });
  // Family answers shape the twin only with the member's DPDP "profile" consent.
  const answers = (await hasConsent(sid, "member_profile")) ? await readAnswers(sid) : null;
  const r = await callEngine<{ status: "ready" | "insufficient"; missing: L[]; twin?: Twin; state?: TwinState }>("build", {
    as_of: istDate(new Date(fetchedAt)),
    fetched_at: fetchedAt,
    sandbox: entries.some((e) => e.link.is_sandbox),
    accounts,
    profile: { first_name: holder?.holder_first_name ?? null, age: holder?.holder_age ?? null, answers, linked },
  });
  if (r.status !== "ready" || !r.twin) {
    throw new TwinError(409, "twin_insufficient", "Your bank data didn't have enough to build your picture.", r.missing);
  }
  const twin: Twin = { ...r.twin, built_from: datas.map((x) => x.data.link_id) };
  await kvSet(twinKeys.twin(sid), twin, TWIN_TTL);
  if (!(await kvGet(twinKeys.state(sid)))) await kvSet(twinKeys.state(sid), r.state ?? {}, STATE_TTL);
  return twin;
}

/** Build unless another request is already building. */
export async function rebuildTwinQuietly(sid: string): Promise<void> {
  if (!(await kvSetIfAbsent(twinKeys.lock(sid), 1, 60))) return;
  try {
    await buildTwin(sid);
  } catch {
    /* the next screen load builds (or explains why it can't) */
  } finally {
    await kvDel(twinKeys.lock(sid));
  }
}

/**
 * This member's twin + state + what they told us in onboarding; builds the
 * twin if their data is here and it isn't built yet. The answers are read on
 * every call (only with DPDP "profile" consent), so an edit or a withdrawal
 * shows up at once. The engines use them only to fill gaps in the bank data.
 * Records from Perfios Hub come the same way (a withdrawn purpose drops out at once).
 */
export async function loadTwin(sid: string): Promise<{ twin: Twin; state: TwinState; declared: unknown; hub: HubFacts }> {
  let twin = await kvGet<Twin>(twinKeys.twin(sid));
  if (!twin) twin = await buildTwin(sid);
  const state = (await kvGet<TwinState>(twinKeys.state(sid))) ?? {};
  const declared = (await hasConsent(sid, "member_profile")) ? await readAnswers(sid) : null;
  // records added through Perfios Hub, each only while its own DPDP purpose is granted
  const hub = await readHubFacts(sid);
  return { twin, state, declared, hub };
}

export async function saveState(sid: string, state: TwinState) {
  await kvSet(twinKeys.state(sid), state, STATE_TTL);
}

export async function hasTwin(sid: string): Promise<boolean> {
  return (await kvGet(twinKeys.twin(sid))) !== null;
}
