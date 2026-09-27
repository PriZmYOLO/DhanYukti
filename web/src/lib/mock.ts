/**
 * Offline demo layer. Used automatically when the FastAPI backend is unreachable (or when
 * NEXT_PUBLIC_DEMO=1), so the prototype always runs. Dashboards are real engine snapshots
 * (src/data/demo.json); scenarios replay E03's daily flows from that snapshot.
 */
import demo from "@/data/demo.json";
import type { Badge, ConsentArtefact, Dashboard, DpdpGrant, GameEventResult, HouseholdSummary, L, River, SimResult } from "./types";
import type { SimInput } from "./api";

type Demo = {
  households: HouseholdSummary[]; capabilities: unknown[];
  dashboards: Record<string, Dashboard>;
  passports: Record<string, { aa: ConsentArtefact[]; dpdp: DpdpGrant[] }>;
  enrich: Record<string, Record<string, { kind: string; mode: string; result: Record<string, unknown>; used_for: L }>>;
  ask: Record<string, Record<string, { hi: L }>>;
  fetch: { ok: boolean; accounts: number; transactions: number; steps: { key: string; label: L; done: boolean }[]; mode: string };
};
const D = demo as unknown as Demo;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

let dash: Record<string, Dashboard> = clone(D.dashboards);
let pass = clone(D.passports);
const consents: Record<string, { hid: string; status: string }> = {};

const inr = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN")}`;
const dd = (iso: string) => { const d = new Date(iso + "T00:00:00"); return `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}`; };
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

function summarise(days: River["days"], floor: number): River {
  let min = days[0], first: (typeof days)[number] | null = null;
  for (const d of days) { if (d.balance < min.balance) min = d; if (!first && d.balance < 0) first = d; }
  return { floor, days, min_balance: min.balance, min_date: min.date, gap: first ? -first.balance : 0 };
}

/** Re-run the snapshot's daily flows with moved events, a shock, a salary delay or a spending cut. */
function resim(base: River, inp: SimInput & { balanceDelta?: number }): River {
  const days = base.days;
  const other = days.map((d, i) => (i === 0 ? 0 : d.balance - days[i - 1].balance - d.events.reduce((s, e) => s + e.amount, 0)));
  const byDate: Record<string, River["days"][number]["events"]> = {};
  days.forEach((d) => (byDate[d.date] = []));
  for (const d of days) for (const e of d.events) {
    let date = d.date;
    const mv = inp.moves?.find((m) => m.event_id === e.id);
    if (mv) date = mv.new_date;
    if (e.type === "salary" && inp.salary_delay_days) date = addDays(date, inp.salary_delay_days);
    if (byDate[date]) byDate[date].push(e);
  }
  let bal = days[0].balance + (inp.balanceDelta ?? 0);
  const out = days.map((d, i) => {
    if (i > 0) {
      bal += other[i] + (inp.cut_per_day && i <= 5 ? inp.cut_per_day : 0);
      if (i === 1 && inp.shock_amount) bal -= inp.shock_amount;
      bal += byDate[d.date].reduce((s, e) => s + e.amount, 0);
    }
    return { date: d.date, balance: bal, events: byDate[d.date] };
  });
  return summarise(out, base.floor);
}

function resilience(d: Dashboard, shock = 0) {
  const r = d.metrics.resilience_days.value ?? 0;
  const burn = Math.max(1, -Math.round(d.river.days.slice(1, 6).reduce((s, x, i) => s + (x.balance - d.river.days[i].balance - x.events.reduce((a, e) => a + e.amount, 0)), 0) / 5));
  return Math.max(0, Math.round(r - shock / burn));
}

const POINTS: Record<string, number> = { setup: 100, checkin: 5, task_done: 25, gullak_deposit: 50, protection_check: 50, correction: 10, lesson: 15 };
const LEVELS: [number, L][] = [[0, { hi: "Beej", en: "Seed" }], [200, { hi: "Ankur", en: "Sprout" }], [500, { hi: "Paudha", en: "Plant" }], [1000, { hi: "Ped", en: "Tree" }], [2000, { hi: "Bargad", en: "Banyan" }]];

export const mock = {
  health: async () => ({ ok: true, mode: { anumati: "demo", perfios: "demo" } }),
  households: async () => D.households,
  dashboard: async (id: string) => clone(dash[id]),
  simulate: async (id: string, inp: SimInput): Promise<SimResult> => {
    const d = dash[id];
    const river = resim(d.river, inp);
    const before = d.river.gap, after = river.gap;
    let message: L;
    if (inp.moves?.length) {
      const salaryIdx = river.days.findIndex((x) => x.events.some((e) => e.type === "salary"));
      const pre = salaryIdx > 0 ? Math.min(...river.days.slice(1, salaryIdx).map((x) => x.balance)) : river.min_balance;
      const floorGap = Math.max(0, river.floor - pre);
      message = after === 0
        ? { hi: `Fee aage badhane se ${inr(before)} ki kami khatam.${floorGap ? ` Par salary se pehle ${inr(floorGap)} safety floor se kam rahega — 5 din ₹200 kam kharch karein ya Gullak use karein.` : ""}`,
            en: `Moving the fee removes the ${inr(before)} shortfall.${floorGap ? ` But before salary you'll be ${inr(floorGap)} below the safety floor — spend ₹200 less for 5 days or use the Gullak.` : ""}` }
        : { hi: `Ab bhi ${inr(after)} kam padenge.`, en: `Still ${inr(after)} short.` };
    } else {
      const firstNeg = river.days.find((x) => x.balance < 0);
      const r = resilience(d, inp.shock_amount ?? 0);
      message = firstNeg
        ? { hi: `${inp.shock_amount ? `${inr(inp.shock_amount)} ke achanak kharche se ` : ""}${dd(firstNeg.date)} ko ${inr(after)} kam padenge. Bina aamdani ke ${r} din chal sakte hain.`,
            en: `${inp.shock_amount ? `With a sudden ${inr(inp.shock_amount)} expense, ` : ""}you'll be ${inr(after)} short on ${dd(firstNeg.date)}. You can last ${r} days without income.` }
        : { hi: `Sambhal jayega. Bina aamdani ke ${r} din chal sakte hain.`, en: `You'll manage. You can last ${r} days without income.` };
    }
    return { river, resilience_days: resilience(d, inp.shock_amount ?? 0), gap_before: before, gap_after: after, message, scenario: true };
  },
  correct: async (id: string, field: string, value: unknown) => {
    const d = dash[id];
    if (field === "closing_balance" && typeof value === "number") {
      d.river = resim(d.river, { balanceDelta: value - d.river.days[0].balance });
    } else if (field === "safety_floor" && typeof value === "number") {
      d.river = { ...d.river, floor: value };
    } else if (field.startsWith("member:") && field.endsWith(".life")) {
      const mid = field.slice(7, -5);
      d.protection_detail = d.protection_detail.map((p) => (p.member_id === mid ? { ...p, life: Boolean(value) } : p));
      const all = d.protection_detail.every((p) => p.life);
      d.metrics.protection = { ...d.metrics.protection, status: all ? "green" : "amber", confidence: "andaaza" };
    }
    if (d.river.gap === 0) d.nba = d.nba.filter((n) => !n.id.startsWith("nba_deficit"));
    return { ok: true, dashboard: clone(d) };
  },
  passport: async (hid: string) => clone(pass[hid]),
  dpdp: async () => ({ ok: true }),
  aaStart: async (household_id: string) => {
    const h = `cn_demo_${Math.random().toString(36).slice(2, 8)}`;
    consents[h] = { hid: household_id, status: "PENDING" };
    return { consent_handle: h, redirect_url: "", status: "PENDING", mode: "demo" };
  },
  aaStatus: async (h: string) => ({ status: consents[h]?.status ?? "ACTIVE", mode: "demo" }),
  aaApproveSandbox: async (h: string) => { consents[h] = { hid: consents[h]?.hid ?? "A", status: "ACTIVE" }; return { status: "ACTIVE" }; },
  aaFetch: async () => ({ ...clone(D.fetch), mode: "demo" }),
  aaRevoke: async (h: string) => {
    for (const hid of Object.keys(pass)) pass[hid].aa = pass[hid].aa.map((c) => (c.handle === h ? { ...c, status: "REVOKED" } : c));
    return { status: "REVOKED", deleted: ["derived_profile", "open_actions"], mode: "demo" };
  },
  gameEvent: async (hid: string, type: string, extra: { ref?: string; amount?: number } = {}): Promise<GameEventResult> => {
    const g = dash[hid].game;
    const delta = POINTS[type] ?? 0;
    g.points += delta;
    const lvl = LEVELS.filter(([at]) => g.points >= at).length as 1 | 2 | 3 | 4 | 5;
    g.level = lvl; g.level_name = LEVELS[lvl - 1][1]; g.next_level_at = LEVELS[lvl]?.[0] ?? g.points;
    if (type === "checkin") g.streak += 1;
    let badge: Badge | undefined;
    if (type === "gullak_deposit" && extra.ref) {
      dash[hid].jars = dash[hid].jars.map((j) => (j.id === extra.ref ? { ...j, saved: j.saved + (extra.amount ?? 0) } : j));
      g.mission = { ...g.mission, progress: Math.min(g.mission.target, g.mission.progress + (extra.amount ?? 0)) };
    }
    if (type === "protection_check") {
      const b = g.badges.find((x) => x.id === "suraksha_kavach" && !x.earned);
      if (b) { b.earned = true; badge = b; }
    }
    return { points: g.points, delta, streak: g.streak, level: g.level, badge_unlocked: badge, jars: dash[hid].jars };
  },
  ask: async (household_id: string, question: string) => {
    const q = question.toLowerCase();
    const k = /loan|app|safe|lender|udhaar/.test(q) ? "loan" : /agar|what if|late|hospital/.test(q) ? "whatif"
      : /gullak|bacha|save/.test(q) ? "gullak" : /bima|insur|cover/.test(q) ? "bima" : /kharch|spend|kitna/.test(q) ? "spend" : "deficit";
    return { answer: D.ask[household_id][k].hi, tools_used: ["demo"], tag: "jaankari" };
  },
  enrich: async (hid: string, kind: string) => ({ ...clone(D.enrich[hid][kind]), mode: "demo" }),
  bsaUpload: async () => ({ mode: "demo", status: "COMPLETED", report_id: `bsa_demo_${Date.now().toString(36)}` }),
  reset: async () => { dash = clone(D.dashboards); pass = clone(D.passports); return { ok: true }; },
  capabilities: async () => D.capabilities,
};
