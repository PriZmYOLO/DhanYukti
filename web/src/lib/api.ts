import type {
  Capability, ConsentArtefact, Dashboard, DpdpGrant, GameEventResult, HouseholdSummary, L, SimResult,
} from "./types";
import type { MyBillsView } from "./contracts/my-bills";

/** A "my household" (linked member) error: says what's wrong, never swaps in demo data. */
export class MeError extends Error {
  constructor(public code: string, public safe: string, public missing: L[] = [], public status = 0) {
    super(safe);
  }
}

/**
 * A random id this browser keeps, so the demo households (A/B/C) are this
 * visitor's own copy on the server: nothing one visitor taps changes the demo
 * for anyone else. Not an identity; never linked to a person or their data.
 */
function demoVisitor(): string {
  try {
    let id = localStorage.getItem("dy.demoVisitor");
    if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem("dy.demoVisitor", id);
    }
    return id;
  } catch {
    return (globalThis as { __dyVisitor?: string }).__dyVisitor ??= crypto.randomUUID();
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-DY-Demo": demoVisitor(), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    if (isMePath(path)) {
      const body = (await res.json().catch(() => null)) as { error?: { code?: string; safe_message?: string; missing?: L[] } } | null;
      throw new MeError(body?.error?.code ?? "engine_error", body?.error?.safe_message ?? "Something went wrong.", body?.error?.missing ?? [], res.status);
    }
    throw apiError(res, path);
  }
  return res.json() as Promise<T>;
}

/** The linked member's own household lives at id "me". */
export const ME = "me";
const isMePath = (path: string) => /\/me(\/|$)/.test(path);

/**
 * FastAPI always answers with JSON. A non-JSON error (e.g. Next's own 404 page
 * when no FastAPI is deployed / API_ORIGIN is unset) means "backend not there":
 * throw a TypeError so the demo-data fallback below kicks in.
 */
function apiError(res: Response, path: string): Error {
  const json = (res.headers.get("content-type") ?? "").includes("application/json");
  return json ? new Error(`${res.status} ${path}`) : new TypeError(`api_unreachable ${res.status} ${path}`);
}
const post = <T,>(path: string, body: unknown = {}) => call<T>(path, { method: "POST", body: JSON.stringify(body) });

export type SimInput = {
  moves?: { event_id: string; new_date: string }[];
  shock_amount?: number; salary_delay_days?: number; cut_per_day?: number;
  purchase?: { amount: number; pay: "cash" | "loan"; loan?: { annual_rate_pct?: number; months?: number; processing_fee?: number } };
};

const real = {
  health: () => call<{ ok: boolean; mode: { anumati: string; perfios: string } }>("/health"),
  households: () => call<HouseholdSummary[]>("/households"),
  dashboard: (id: string) => call<Dashboard>(`/households/${id}/dashboard`),
  simulate: (id: string, input: SimInput) => post<SimResult>(`/households/${id}/simulate`, input),
  correct: (id: string, field: string, value: unknown) => post<{ ok: boolean; dashboard: Dashboard }>(`/households/${id}/correct`, { field, value }),
  passport: (hid: string) => call<{ aa: ConsentArtefact[]; dpdp: DpdpGrant[] }>(`/consent/passport/${hid}`),
  dpdp: (household_id: string, grants: { profile: boolean; device_signals: boolean }) => post<{ ok: boolean }>("/consent/dpdp", { household_id, grants }),
  aaStart: (household_id: string, member_id: string, mobile: string) =>
    post<{ consent_handle: string; redirect_url: string; status: string; mode: string }>("/consent/aa/start", { household_id, member_id, mobile }),
  aaStatus: (h: string) => call<{ status: string; mode: string }>(`/consent/aa/${h}/status`),
  aaApproveSandbox: (h: string) => post<{ status: string }>(`/consent/aa/${h}/approve-sandbox`),
  aaFetch: (h: string) => post<{ ok: boolean; accounts: number; transactions: number; steps: { key: string; label: L; done: boolean }[]; mode: string }>(`/consent/aa/${h}/fetch`),
  aaRevoke: (h: string) => post<{ status: string; deleted: string[]; mode: string }>(`/consent/aa/${h}/revoke`),
  gameEvent: (hid: string, type: string, extra: { ref?: string; amount?: number } = {}) => post<GameEventResult>(`/game/${hid}/event`, { type, ...extra }),
  ask: (household_id: string, question: string, lang: "hi" | "en") =>
    household_id === ME
      ? post<{ answer: L; tools_used: string[]; tag: string }>("/ask/me", { question, lang })
      : post<{ answer: L; tools_used: string[]; tag: string }>("/ask", { household_id, question, lang }),
  /** Linked member: is a bank account linked in this browser, and is their picture built? */
  meStatus: () => call<{ linked: boolean; ready: boolean }>("/households/me/status"),
  /** Confirm your bills: repeating payments from the member's own data, and their decisions. */
  myBills: () => call<{ bills: MyBillsView }>("/households/me/bills"),
  decideBill: (series: string, action: "confirm" | "fix" | "ignore" | "undo", extra: { amount?: number; day?: number } = {}) =>
    post<{ bills: MyBillsView; receipt_id: string | null }>("/households/me/bills", { series, action, ...extra }),
  enrich: (hid: string, kind: "electricity" | "rc" | "ration" | "epf", input: Record<string, string> = {}) =>
    post<{ kind: string; mode: string; result: Record<string, unknown>; used_for: L }>(`/enrich/${hid}/${kind}`, { consent: true, input }),
  bsaUpload: async (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/bsa/upload", { method: "POST", body: fd, headers: { "X-DY-Demo": demoVisitor() } });
    if (!res.ok) throw apiError(res, "/bsa/upload");
    return res.json() as Promise<{ mode: string; status: string; report_id: string }>;
  },
  capabilities: () => call<Capability[]>("/capabilities"),
  /** "Delete everything": drop this visitor's own copy of the demo households (their corrections, deposits, points). */
  forgetDemo: () => post<{ ok: boolean; forgotten: boolean }>("/demo/forget"),
};

import { mock } from "./mock";

/** Demo mode: NEXT_PUBLIC_DEMO=1, or flips on automatically the first time the API is unreachable. */
let demoMode = process.env.NEXT_PUBLIC_DEMO === "1";
export const isDemoMode = () => demoMode;

type Api = typeof real;
export const api = new Proxy(real, {
  get(target, key: keyof Api) {
    const fn = target[key] as (...a: unknown[]) => Promise<unknown>;
    const fallback = (mock as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[key as string];
    return async (...args: unknown[]) => {
      // A linked member's own household never falls back to demo data: errors are shown as errors.
      if (args[0] === ME || key === "meStatus") return fn(...args);
      if (demoMode && fallback) return fallback(...args);
      try { return await fn(...args); }
      catch (e) {
        const offline = e instanceof TypeError || /^(500|502|503|504) /.test(String((e as Error).message));
        if (offline && fallback) { demoMode = true; return fallback(...args); }
        throw e;
      }
    };
  },
}) as Api;
