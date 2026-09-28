/**
 * Offline demo layer. Used automatically when the FastAPI backend is unreachable (or when
 * NEXT_PUBLIC_DEMO=1), so the prototype always runs. Dashboards are real engine snapshots
 * (src/data/demo.json); scenarios replay E03's daily flows from that snapshot.
 */
import demo from "@/data/demo.json";
import type {
  Badge, ConsentArtefact, Dashboard, DpdpGrant, GameEventResult, GoalImpact, HouseholdSummary, L, LoanResult, River, RiverEvent,
  SimResponse, SimResult,
} from "./types";
import type { SimInput } from "./api";

type Demo = {
  households: HouseholdSummary[]; capabilities: unknown[];
  dashboards: Record<string, Dashboard>;
  passports: Record<string, { aa: ConsentArtefact[]; dpdp: DpdpGrant[] }>;
  enrich: Record<string, Record<string, { kind: string; mode: string; result: Record<string, unknown>; used_for: L }>>;
  ask: Record<string, Record<string, { hi: L }>>;
  fetch: { ok: boolean; accounts: number; transactions: number; steps: { key: string; label: L; done: boolean }[]; mode: string };
  /** Engine facts the What-if demo needs (api/scripts/refresh_demo_whatif.py). */
  whatif: Record<string, { needs: Record<string, L>; emi_monthly: number; monthly_income: number; resilience_days: number; next_income_date: string }>;
};
const D = demo as unknown as Demo;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

const dash: Record<string, Dashboard> = clone(D.dashboards);
const pass = clone(D.passports);
const consents: Record<string, { hid: string; status: string }> = {};

const inr = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN")}`;
const dd = (iso: string) => { const d = new Date(iso + "T00:00:00"); return `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}`; };
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

function summarise(days: River["days"], floor: number): River {
  let min = days[0], first: (typeof days)[number] | null = null;
  for (const d of days) { if (d.balance < min.balance) min = d; if (!first && d.balance < 0) first = d; }
  return { floor, days, min_balance: min.balance, min_date: min.date, gap: first ? -first.balance : 0 };
}

type SimExtra = { balanceDelta?: number; extra?: (RiverEvent & { date: string })[]; hid?: string };

/** Re-run the snapshot's daily flows with moved events, a shock, a salary delay, a spending cut or extra events. */
function resim(base: River, inp: SimInput & SimExtra): River {
  const days = base.days;
  const other = days.map((d, i) => (i === 0 ? 0 : d.balance - days[i - 1].balance - d.events.reduce((s, e) => s + e.amount, 0)));
  const byDate: Record<string, River["days"][number]["events"]> = {};
  days.forEach((d) => (byDate[d.date] = []));
  for (const d of days) for (const e of d.events) {
    let date = d.date;
    let ev: RiverEvent = e;
    const mv = inp.moves?.find((m) => m.event_id === e.id);
    if (mv && mv.new_date !== d.date) {
      date = mv.new_date;
      // Moving a bill is a request to the payee: keep the original date, never treat it as agreed.
      ev = { ...e, moved: true, original_date: d.date, needs: (inp.hid && D.whatif[inp.hid]?.needs[e.id]) || { hi: "Jisko paisa dena hai unki haan", en: "The payee to agree" } };
    }
    if (e.type === "salary" && inp.salary_delay_days) date = addDays(date, inp.salary_delay_days);
    if (byDate[date]) byDate[date].push(ev);
  }
  for (const x of inp.extra ?? []) {
    const { date, ...ev } = x;
    if (byDate[date]) byDate[date].push({ ...ev, scenario: true });
  }
  let bal = days[0].balance + (inp.balanceDelta ?? 0);
  const out = days.map((d, i) => {
    if (i > 0) {
      bal += other[i] + (inp.cut_per_day ?? 0);
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

const LOAN_TERMS = ["annual_rate_pct", "months", "processing_fee"] as const;
const LOAN_LABELS: Record<(typeof LOAN_TERMS)[number], L> = {
  annual_rate_pct: { hi: "Byaaj dar (saal ka %)", en: "Interest rate (% a year)" },
  months: { hi: "Kitne mahine", en: "Number of months" },
  processing_fee: { hi: "Processing fee (₹, 0 bhi ho sakti hai)", en: "Processing fee (₹, can be 0)" },
};
const addMonths = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00"); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return d.toISOString().slice(0, 10); };
const perDay = (goal: number, saved: number, target: string, asOf: string) => {
  const days = Math.max(1, Math.round((new Date(target + "T00:00:00").getTime() - new Date(asOf + "T00:00:00").getTime()) / 864e5));
  const p = Math.ceil(Math.max(0, goal - saved) / days);
  return p ? Math.ceil(p / 10) * 10 : 0;
};

/** Mirrors E17.loan_terms: a total cost only with complete terms. */
function loanTerms(principal: number, t: NonNullable<SimInput["purchase"]>["loan"]): LoanResult {
  const missing = LOAN_TERMS.filter((k) => t?.[k] == null);
  const base: LoanResult = { principal, missing: [...missing], missing_labels: missing.map((k) => LOAN_LABELS[k]), complete: !missing.length };
  if (missing.length || !t) return base;
  const rate = Number(t.annual_rate_pct), months = Number(t.months), fee = Number(t.processing_fee);
  const r = rate / 12 / 100;
  const emi = Math.ceil(r === 0 ? principal / months : (principal * r) / (1 - (1 + r) ** -months));
  const repay = emi * months, extra = repay - principal + fee;
  return { ...base, annual_rate_pct: rate, months, processing_fee: fee, emi, total_repay: repay, total_cost: repay + fee,
    extra_over_price: extra, extra_per_100: Math.round((extra * 100) / principal) };
}

const lowestBefore = (river: River, before: string) => {
  const c = river.days.filter((d) => d.date < before);
  return Math.min(...(c.length ? c : river.days.slice(0, 1)).map((d) => d.balance));
};

/** Mirrors E17.responses: which permitted moves close the shortfall (never new credit). */
function responses(hid: string, d: Dashboard, inp: SimInput & SimExtra, scen: River) {
  const w = D.whatif[hid];
  const nid = w.next_income_date;
  const moved = new Set((inp.moves ?? []).map((m) => m.event_id));
  const movable = scen.days.flatMap((x) => x.events.filter((e) => e.movable && e.amount < 0 && x.date < nid && !moved.has(e.id)));
  const jar = d.jars.find((j) => j.kind === "emergency" && j.saved > 0);
  const trial = (moves: { event_id: string; new_date: string }[] = [], cut = 0, delta = 0) =>
    resim(d.river, { ...inp, moves: [...(inp.moves ?? []), ...moves], cut_per_day: (inp.cut_per_day ?? 0) + cut, balanceDelta: (inp.balanceDelta ?? 0) + delta });
  const out: SimResponse[] = [];
  const all = movable.map((e) => ({ event_id: e.id, new_date: nid }));
  movable.forEach((e, i) => {
    const r = trial([all[i]]);
    out.push({ id: `move:${e.id}`, kind: "move", label: { hi: `${e.label.hi} ${new Date(nid + "T00:00:00").getDate()} tareekh ko`, en: `Pay ${e.label.en} on ${dd(nid)}` },
      gap_after: r.gap, fixes: r.gap === 0, conditional: true, needs: w.needs[e.id] });
  });
  let r = trial([], 200);
  out.push({ id: "cut", kind: "cut", label: { hi: "Roz ₹200 kam kharch", en: "Spend ₹200 less a day" }, gap_after: r.gap, fixes: r.gap === 0, conditional: false });
  if (jar) {
    r = trial([], 0, jar.saved);
    out.push({ id: "gullak", kind: "gullak", label: { hi: `Emergency Gullak ke ${inr(jar.saved)} use karein`, en: `Use the Emergency jar (${inr(jar.saved)})` },
      gap_after: r.gap, fixes: r.gap === 0, conditional: false, jar_id: jar.id });
  }
  if (out.length > 1) {
    r = trial(all, 200, jar?.saved ?? 0);
    out.push({ id: "all", kind: "all", label: { hi: "Sab ek saath", en: "All of these together" }, gap_after: r.gap, fixes: r.gap === 0, conditional: all.length > 0 });
  }
  let goal_impact: GoalImpact | undefined;
  const needed = Math.max(0, -lowestBefore(scen, nid));
  if (jar && needed > 0) {
    const used = Math.min(jar.saved, needed), after = jar.saved - used, target = jar.target_date ?? d.as_of;
    goal_impact = { jar_id: jar.id, name: jar.name, goal: jar.goal, target_date: target, used, saved_before: jar.saved, saved_after: after,
      gap_before: Math.max(0, jar.goal - jar.saved), gap_after: Math.max(0, jar.goal - after), daily_before: jar.daily_suggest, daily_after: perDay(jar.goal, after, target, d.as_of) };
  }
  return { responses: out, feasible: out.some((x) => x.fixes), goal_impact };
}

const POINTS: Record<string, number> = { setup: 100, checkin: 5, task_done: 25, gullak_deposit: 50, protection_check: 50, correction: 10, lesson: 15 };
const LEVELS: [number, L][] = [[0, { hi: "Beej", en: "Seed" }], [200, { hi: "Ankur", en: "Sprout" }], [500, { hi: "Paudha", en: "Plant" }], [1000, { hi: "Ped", en: "Tree" }], [2000, { hi: "Bargad", en: "Banyan" }]];

export const mock = {
  health: async () => ({ ok: true, mode: { anumati: "demo", perfios: "demo" } }),
  households: async () => D.households,
  dashboard: async (id: string) => clone(dash[id]),
  simulate: async (id: string, input: SimInput): Promise<SimResult> => {
    const d = dash[id];
    const tomorrow = d.river.days[1]?.date ?? d.as_of;
    let loan: LoanResult | undefined;
    const extra: SimExtra["extra"] = [];
    if (input.purchase) {
      const { amount, pay } = input.purchase;
      if (pay === "cash") extra.push({ id: "purchase", date: tomorrow, type: "bill", amount: -amount, movable: false, label: { hi: "Khareedari (cash se)", en: "Purchase (from cash)" } });
      else {
        loan = loanTerms(amount, input.purchase.loan);
        if (loan.complete) {
          if (loan.processing_fee) extra.push({ id: "loan_fee", date: tomorrow, type: "bill", amount: -loan.processing_fee, movable: false, label: { hi: "Loan processing fee", en: "Loan processing fee" } });
          for (let k = 1; k <= loan.months!; k++) extra.push({ id: `loan_emi_${k}`, date: addMonths(d.as_of, k), type: "emi", amount: -loan.emi!, movable: false, label: { hi: `Naya loan EMI ${k}/${loan.months}`, en: `New loan EMI ${k}/${loan.months}` } });
        }
      }
    }
    const inp: SimInput & SimExtra = { ...input, extra, hid: id };
    const river = resim(d.river, inp);
    const before = d.river.gap, after = river.gap;
    const spendNow = (inp.shock_amount ?? 0) + extra.filter((x) => x.date === tomorrow).reduce((s, x) => s - x.amount, 0);
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
      const r = resilience(d, spendNow);
      message = firstNeg
        ? { hi: `${inp.shock_amount ? `${inr(inp.shock_amount)} ke achanak kharche se ` : ""}${dd(firstNeg.date)} ko ${inr(after)} kam padenge. Bina aamdani ke ${r} din chal sakte hain.`,
            en: `${inp.shock_amount ? `With a sudden ${inr(inp.shock_amount)} expense, ` : ""}you'll be ${inr(after)} short on ${dd(firstNeg.date)}. You can last ${r} days without income.` }
        : { hi: `Sambhal jayega. Bina aamdani ke ${r} din chal sakte hain.`, en: `You'll manage. You can last ${r} days without income.` };
    }
    const w = D.whatif[id];
    const firstBefore = d.river.days.find((x) => x.balance < 0)?.date ?? null;
    const out: SimResult = {
      river, resilience_days: resilience(d, spendNow), gap_before: before, gap_after: after, message, scenario: true,
      resilience_before: w?.resilience_days ?? d.metrics.resilience_days.value ?? undefined,
      min_balance_before: d.river.min_balance, min_date_before: d.river.min_date,
      first_deficit_date_before: firstBefore, first_deficit_date: river.days.find((x) => x.balance < 0)?.date ?? null,
      conditional: river.days.flatMap((x) => x.events.filter((e) => e.moved)),
    };
    if (input.purchase) out.purchase = { amount: input.purchase.amount, pay: input.purchase.pay };
    if (loan) {
      out.loan = loan;
      if (loan.complete && w) {
        const per100 = (emi: number) => (w.monthly_income > 0 ? Math.round((emi * 100) / w.monthly_income) : null);
        Object.assign(loan, { debt_per100_before: per100(w.emi_monthly), debt_per100_after: per100(w.emi_monthly + loan.emi!), first_emi: dd(addMonths(d.as_of, 1)) });
        const a = loan.debt_per100_after;
        loan.debt_status_after = a == null ? null : a > 40 ? "red" : a > 20 ? "amber" : "green"; // mirrors E04.debt_status
        out.message = { hi: `EMI ${inr(loan.emi!)} har mahine, ${loan.months} mahine. Kul ${inr(loan.total_cost!)} denge — daam se ${inr(loan.extra_over_price!)} zyada (har ₹100 par ₹${loan.extra_per_100}).`,
          en: `EMI of ${inr(loan.emi!)} a month for ${loan.months} months. You pay ${inr(loan.total_cost!)} in all — ${inr(loan.extra_over_price!)} more than the price (₹${loan.extra_per_100} on every ₹100).` };
      } else if (!loan.complete) out.message = { hi: "Kul kharcha batane ke liye loan ki poori sharten chahiye.", en: "Total cost needs full loan terms." };
    }
    if (after > 0 && !(loan && !loan.complete) && w) Object.assign(out, responses(id, d, inp, river));
    return out;
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
  capabilities: async () => D.capabilities,
};
