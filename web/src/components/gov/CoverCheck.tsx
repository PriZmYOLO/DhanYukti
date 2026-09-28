"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Download, ExternalLink, Plus, ShieldCheck, Trash2, Sparkles, Landmark } from "lucide-react";
import { useApp } from "@/lib/store";
import { gov, paise, toPaise, type CoverHints } from "@/lib/gov";
import { inr, primaryMember } from "@/lib/format";
import { Btn } from "@/components/ui/bits";
import {
  BIMA_SUGAM_URL, CITY, CONDITION, FEATURE, HAVE_NOTE, MISSING, NOTE, PSTATUS, RELATION, RULE, SCHEME, SPEC, USTATUS, unitLabel,
} from "@/lib/cover-copy";
import {
  CONDITIONS, DEFAULT_FILTERS, RELATIONS,
  type CityTier, type Condition, type CoverPlan, type CoverProfile, type DeclaredCover, type MemberConditions, type ProfileMember, type Relation,
} from "@/lib/contracts/cover-engine";
import type { Dashboard, L } from "@/lib/types";

type Names = Record<string, string>;
const NAMES_KEY = "dy.cover.names";
export const LAST_KEY = "dy.cover.last";
/** Gaps of different kinds are never added together (health ≠ life cover). */
export type CoverSummary = { gaps: number; top: L | null; top_gap_paise: number; by_kind: Partial<Record<"health" | "life" | "accident", number>>; unknown: number; receipt_id: string | null; at: string };

function readNames(): Names { try { return JSON.parse(localStorage.getItem(NAMES_KEY) ?? "{}") as Names; } catch { return {}; } }
function writeNames(n: Names) { try { localStorage.setItem(NAMES_KEY, JSON.stringify(n)); } catch { /* ignore */ } }

/** First guess at the family from the household on screen. Every field stays editable. */
function prefill(data: Dashboard | null, hints: CoverHints | null): { profile: CoverProfile; names: Names } {
  const members: ProfileMember[] = [];
  const names: Names = {};
  const me = primaryMember(data);
  const all = data?.household.members ?? [];
  const earners = all.filter((m) => m.earner);
  let spouseTaken = false;
  const ordered = me ? [me, ...all.filter((m) => m.id !== me.id)] : all;
  ordered.forEach((m, i) => {
    const id = `m${i + 1}`;
    let relation: Relation = "other";
    if (i === 0) relation = "self";
    else if (m.avatar === "elder_man" || m.avatar === "elder_woman") relation = "parent";
    else if (m.avatar === "girl" || m.avatar === "boy" || (m.age != null && m.age < 18)) relation = "child";
    else if (!spouseTaken) { relation = "spouse"; spouseTaken = true; }
    // Income is only prefilled when one person earns it all; otherwise it's asked.
    const income = m.earner && earners.length === 1 && data && data.household.monthly_income != null ? toPaise(data.household.monthly_income * 12) : null;
    members.push({ id, relation, age: m.age ?? null, earns: m.earner, annual_income: m.earner ? income : null });
    names[id] = m.name;
  });
  return {
    names,
    profile: {
      version: 1, city_tier: null, members,
      annual_expenses: null, loans_outstanding: null, liquid_savings: null,
      existing: [],
      // Premiums seen in the member's own AA data count as "already has it".
      pmjjby_member_ids: hints?.pmjjby === "seen" && members[0] ? [members[0].id] : [],
      pmsby_member_ids: hints?.pmsby === "seen" && members[0] ? [members[0].id] : [],
      vay_vandana_member_ids: [],
      filters: DEFAULT_FILTERS, updated_at: null,
    },
  };
}

function summarise(plan: CoverPlan): CoverSummary {
  const gaps = plan.units.filter((u) => u.status === "gap");
  const top = [...gaps].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))[0];
  const by_kind: CoverSummary["by_kind"] = {};
  for (const u of gaps) by_kind[u.kind] = (by_kind[u.kind] ?? 0) + (u.gap?.amount_paise ?? 0);
  return {
    gaps: gaps.length, top: top ? unitLabel(top) : null, top_gap_paise: top?.gap?.amount_paise ?? 0, by_kind,
    unknown: plan.units.filter((u) => u.status === "unknown").length,
    receipt_id: plan.receipt_id, at: plan.generated_at,
  };
}

/**
 * Family cover engine on screen: needs → what you have → gap → a cover
 * specification to take to Bima Sugam or any insurer. Firewalled: the
 * engine never sees an insurer, product, price or commission.
 */
export default function CoverCheck() {
  const { data, t, lang } = useApp();
  const [consents, setConsents] = useState<{ cover_profile: boolean; health_conditions: boolean } | null>(null);
  const [profile, setProfile] = useState<CoverProfile | null>(null);
  const [conditions, setConditions] = useState<MemberConditions>({});
  const [names, setNamesS] = useState<Names>({});
  const [hints, setHints] = useState<CoverHints | null>(null);
  const [plan, setPlan] = useState<CoverPlan | null>(null);
  const [editing, setEditing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setNames = (n: Names) => { setNamesS(n); writeNames(n); };
  const nameOf = useCallback((id: string) => {
    const m = profile?.members.find((x) => x.id === id);
    return names[id] || (m ? t(RELATION[m.relation]) : id);
  }, [names, profile, t]);

  const load = useCallback(async () => {
    try {
      const [r, h] = await Promise.all([gov.coverProfile(), gov.coverHints().catch(() => null)]);
      setConsents(r.consents); setConditions(r.conditions ?? {}); setHints(h);
      const stored = readNames();
      if (r.profile && r.profile.members.length) { setProfile(r.profile); setNamesS(stored); setEditing(false); }
      else { const p = prefill(data, h); setProfile(p.profile); setNames(p.names); }
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.household.id]);
  useEffect(() => { load(); }, [load]);

  // A saved profile gets a fresh run on open, so the result always matches it.
  useEffect(() => {
    if (consents?.cover_profile && profile && !editing && !plan && profile.updated_at) {
      gov.runCover().then((p) => { setPlan(p); try { localStorage.setItem(LAST_KEY, JSON.stringify(summarise(p))); } catch { /* ignore */ } }).catch(() => {});
    }
  }, [consents, profile, editing, plan]);

  const grant = async (purpose: "cover_profile" | "health_conditions") => {
    setErr(null);
    try { await gov.setDpdp(purpose, "grant"); setConsents((c) => ({ ...(c ?? { cover_profile: false, health_conditions: false }), [purpose]: true })); }
    catch (e) { setErr(e instanceof Error ? e.message : "error"); }
  };

  const run = async () => {
    if (!profile) return;
    setBusy(true); setErr(null);
    try {
      const saved = await gov.saveCoverProfile(profile, consents?.health_conditions ? conditions : {});
      setProfile(saved.profile);
      const p = await gov.runCover();
      setPlan(p); setEditing(false);
      try { localStorage.setItem(LAST_KEY, JSON.stringify(summarise(p))); } catch { /* ignore */ }
      setTimeout(() => document.getElementById("cover-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  };

  if (err && !consents) return <p className="mx-5 lg:mx-0 rounded-[24px] bg-danger-soft p-4 text-sm font-semibold text-danger">{err}</p>;
  if (!consents || !profile) return <div className="mx-5 lg:mx-0 skeleton rounded-[28px] h-40" />;

  if (!consents.cover_profile) return (
    <div className="mx-5 lg:mx-0 rounded-[28px] bg-ink text-white p-5">
      <p className="text-[12px] font-bold uppercase tracking-widest text-haldi">{t({ hi: "Pehle aapka consent", en: "First, your consent" })}</p>
      <p className="mt-2 text-[20px] font-extrabold leading-snug">{t({ hi: "Parivaar ko kitna bima chahiye — aur kitna kam hai", en: "How much cover your family needs — and what's missing" })}</p>
      <p className="mt-2 text-[14px] text-white/80">{t({ hi: "Umar, aamdani, sheher, kharcha, loan aur pehle ka bima (sirf rakam) — 90 din tak, band karte hi mita diya jaata hai. Kisi company ko nahi jaata.", en: "Ages, incomes, city, spending, loans and existing cover (amounts only) — kept up to 90 days, deleted the moment you stop. Never sent to any insurer." })}</p>
      <Btn variant="haldi" className="w-full mt-4" onClick={() => grant("cover_profile")}>{lang === "hi" ? "Consent dein aur shuru karein" : "Give consent and start"}</Btn>
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
    </div>
  );

  return (
    <div className="space-y-3">
      <Firewall />
      {editing ? (
        <ProfileForm profile={profile} setProfile={setProfile} names={names} setNames={setNames} nameOf={nameOf}
          conditions={conditions} setConditions={setConditions} conditionsAllowed={consents.health_conditions}
          onAllowConditions={() => grant("health_conditions")} hints={hints} onRun={run} busy={busy} />
      ) : (
        <button onClick={() => setEditing(true)} className="mx-5 lg:mx-0 w-[calc(100%-2.5rem)] lg:w-full rounded-[20px] bg-white p-3 shadow-soft text-left text-sm font-bold flex items-center gap-2">
          <span className="flex-1">{profile.members.map((m) => nameOf(m.id)).join(", ")} · {profile.city_tier ? t(CITY[profile.city_tier]) : t({ hi: "sheher nahi bataya", en: "city not told" })}</span>
          <span className="rounded-full bg-lav px-3 py-1 text-xs">{lang === "hi" ? "Badlein" : "Edit"}</span>
        </button>
      )}
      {err && <p className="mx-5 lg:mx-0 text-sm font-semibold text-danger">{err}</p>}
      {plan && !editing && <PlanView plan={plan} nameOf={nameOf} />}
    </div>
  );
}

function Firewall() {
  const { t } = useApp();
  return (
    <div className="mx-5 lg:mx-0 rounded-[20px] bg-mint/70 p-3 flex items-start gap-2 text-[12px] leading-snug">
      <ShieldCheck size={18} className="text-leaf shrink-0 mt-0.5" />
      <span><b>{t({ hi: "Firewall:", en: "Firewall:" })}</b> {t({ hi: "Engine ko kisi company, product, daam ya commission ka pata hi nahi. DhanYukti ko kisi policy se ₹0 milta hai. Wahi details = wahi jawaab.", en: "The engine never sees an insurer, product, price or commission. DhanYukti earns ₹0 from any policy. Same details, same answer." })}</span>
    </div>
  );
}

/* --------------------------------- form --------------------------------- */

function NumInput({ value, onChange, placeholder, suffix, money }: { value: number | null; onChange: (v: number | null) => void; placeholder: string; suffix?: string; money?: boolean }) {
  return (
    <div className="flex items-center gap-1 rounded-[14px] bg-lav/60 px-3 min-h-11">
      {money && value !== null && <span className="text-[15px] font-bold">₹</span>}
      <input inputMode="numeric" value={value === null ? "" : money ? value.toLocaleString("en-IN") : value} placeholder={placeholder} aria-label={placeholder}
        onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); onChange(d === "" ? null : Number(d)); }}
        className="flex-1 min-w-0 bg-transparent outline-none text-[15px] font-bold num" />
      {suffix && <span className="text-xs text-muted">{suffix}</span>}
    </div>
  );
}

/** Show what a filled money box means (its placeholder disappears once typed). */
const value = (m: { amount_paise: number } | null, label: string) => (m ? label : undefined);

function ProfileForm({ profile, setProfile, names, setNames, nameOf, conditions, setConditions, conditionsAllowed, onAllowConditions, hints, onRun, busy }: {
  profile: CoverProfile; setProfile: (p: CoverProfile) => void; names: Names; setNames: (n: Names) => void; nameOf: (id: string) => string;
  conditions: MemberConditions; setConditions: (c: MemberConditions) => void; conditionsAllowed: boolean; onAllowConditions: () => void;
  hints: CoverHints | null; onRun: () => void; busy: boolean;
}) {
  const { t, lang } = useApp();
  const [more, setMore] = useState(false);
  const set = (p: Partial<CoverProfile>) => setProfile({ ...profile, ...p });
  const setMember = (id: string, p: Partial<ProfileMember>) => set({ members: profile.members.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  const nextId = (prefix: "m" | "c", used: string[]) => { for (let i = 1; i < 999; i++) if (!used.includes(`${prefix}${i}`)) return `${prefix}${i}`; return `${prefix}999`; };
  const addMember = () => { const id = nextId("m", profile.members.map((m) => m.id)); set({ members: [...profile.members, { id, relation: "child", age: null, earns: false, annual_income: null }] }); };
  const removeMember = (id: string) => set({
    members: profile.members.filter((m) => m.id !== id),
    existing: profile.existing.map((c) => ({ ...c, member_ids: c.member_ids.filter((x) => x !== id) })).filter((c) => c.member_ids.length),
    pmjjby_member_ids: profile.pmjjby_member_ids.filter((x) => x !== id), pmsby_member_ids: profile.pmsby_member_ids.filter((x) => x !== id),
    vay_vandana_member_ids: profile.vay_vandana_member_ids.filter((x) => x !== id),
  });
  const addCover = (c?: Partial<DeclaredCover>) => {
    const id = nextId("c", profile.existing.map((x) => x.id));
    const self = profile.members.find((m) => m.relation === "self")?.id ?? profile.members[0]?.id;
    set({ existing: [...profile.existing, { id, kind: "health", member_ids: self ? [self] : [], sum_insured: null, employer: false, source: "declared", ...c }] });
  };
  const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const selfId = profile.members.find((m) => m.relation === "self")?.id;
  const adults = profile.members.filter((m) => m.relation !== "child");

  return (
    <div className="mx-5 lg:mx-0 rounded-[28px] bg-white p-4 shadow-soft space-y-5">
      <div>
        <p className="font-extrabold">{t({ hi: "Aap kahaan rehte hain?", en: "Where do you live?" })}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["metro", "tier2", "tier3"] as CityTier[]).map((c) => (
            <button key={c} onClick={() => set({ city_tier: profile.city_tier === c ? null : c })} className={`min-h-12 rounded-[16px] px-2 text-[12px] font-bold leading-tight ${profile.city_tier === c ? "bg-ink text-white" : "bg-lav"}`}>{t(CITY[c])}</button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-extrabold">{t({ hi: "Parivaar", en: "Your family" })}</p>
        <p className="text-[12px] text-muted">{t({ hi: "Jo nahi pata, khaali chhodein — hum andaaza nahi lagate", en: "Leave blank what you don't know — we never guess" })}</p>
        <div className="mt-2 space-y-2">
          {profile.members.map((m) => (
            <div key={m.id} className="rounded-[18px] bg-lav/40 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input value={names[m.id] ?? ""} maxLength={20} placeholder={t(RELATION[m.relation])} onChange={(e) => setNames({ ...names, [m.id]: e.target.value })}
                  className="flex-1 min-w-0 bg-transparent font-extrabold outline-none" aria-label="Name (stays on this phone)" />
                <button aria-label="Remove" onClick={() => removeMember(m.id)} className="grid place-items-center h-9 w-9 rounded-full bg-white"><Trash2 size={15} /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {RELATIONS.map((r) => (
                  <button key={r} disabled={r === "self" && !!selfId && selfId !== m.id} onClick={() => setMember(m.id, { relation: r })}
                    className={`rounded-full px-3 min-h-9 text-[12px] font-bold disabled:opacity-30 ${m.relation === r ? "bg-ink text-white" : "bg-white"}`}>{t(RELATION[r])}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumInput value={m.age} placeholder={lang === "hi" ? "Umar" : "Age"} suffix={lang === "hi" ? "saal" : "yrs"} onChange={(v) => setMember(m.id, { age: v === null ? null : Math.min(120, v) })} />
                <button onClick={() => setMember(m.id, { earns: !m.earns, annual_income: m.earns ? null : m.annual_income })} className={`min-h-11 rounded-[14px] text-[12px] font-bold ${m.earns ? "bg-leaf text-white" : "bg-white"}`}>{m.earns ? "✓ " : ""}{t({ hi: "Kamaate hain", en: "Earns" })}</button>
              </div>
              {m.earns && <NumInput money suffix={value(m.annual_income, lang === "hi" ? "saal ki aamdani" : "a year")} value={paise(m.annual_income)} placeholder={lang === "hi" ? "Saal ki aamdani ₹" : "Yearly income ₹"} onChange={(v) => setMember(m.id, { annual_income: v === null ? null : toPaise(v) })} />}
            </div>
          ))}
          <button onClick={addMember} className="w-full min-h-11 rounded-[16px] border-2 border-dashed border-ink/15 text-sm font-bold flex items-center justify-center gap-1"><Plus size={15} />{t({ hi: "Sadasya jodein", en: "Add a member" })}</button>
          <p className="text-[11px] text-muted">{t({ hi: "Naam sirf is phone par rehte hain — engine ko sirf m1, m2 jaisi ID jaati hai.", en: "Names stay on this phone — the engine only gets ids like m1, m2." })}</p>
        </div>
      </div>

      <div>
        <p className="font-extrabold">{t({ hi: "Ghar ka paisa (saal ka)", en: "Household money (yearly)" })}</p>
        <div className="mt-2 grid gap-2">
          <NumInput money suffix={value(profile.annual_expenses, lang === "hi" ? "kharcha" : "spending")} value={paise(profile.annual_expenses)} placeholder={lang === "hi" ? "Saal ka kharcha ₹ (optional)" : "Yearly spending ₹ (optional)"} onChange={(v) => set({ annual_expenses: v === null ? null : toPaise(v) })} />
          <NumInput money suffix={value(profile.loans_outstanding, lang === "hi" ? "baaki loan" : "loans left")} value={paise(profile.loans_outstanding)} placeholder={lang === "hi" ? "Baaki loan ₹ (optional)" : "Loans left ₹ (optional)"} onChange={(v) => set({ loans_outstanding: v === null ? null : toPaise(v) })} />
          <NumInput money suffix={value(profile.liquid_savings, lang === "hi" ? "bachat" : "savings")} value={paise(profile.liquid_savings)} placeholder={lang === "hi" ? "Kaam aane wali bachat ₹ (optional)" : "Usable savings ₹ (optional)"} onChange={(v) => set({ liquid_savings: v === null ? null : toPaise(v) })} />
        </div>
      </div>

      {hints?.bank_data === "expired" && hints.policies.length === 0 && hints.expired_message && (
        <p className="rounded-[18px] bg-haldi-soft p-3 text-[13px]"><Landmark size={15} className="inline mr-1.5" />{hints.expired_message}</p>
      )}
      {hints && (hints.policies.length > 0 || hints.pmjjby !== "unknown" || hints.pmsby !== "unknown") && (
        <div className="rounded-[18px] bg-haldi-soft p-3">
          <p className="font-extrabold text-sm flex items-center gap-1.5"><Landmark size={15} />{t({ hi: "Aapke bank data mein mila (Anumati AA)", en: "Found in your bank data (Anumati AA)" })}</p>
          {hints.pmjjby === "seen" && selfId && <HintRow label="PMJJBY premium" done={profile.pmjjby_member_ids.includes(selfId)} onAdd={() => set({ pmjjby_member_ids: toggleIn(profile.pmjjby_member_ids, selfId) })} />}
          {hints.pmsby === "seen" && selfId && <HintRow label="PMSBY premium" done={profile.pmsby_member_ids.includes(selfId)} onAdd={() => set({ pmsby_member_ids: toggleIn(profile.pmsby_member_ids, selfId) })} />}
          {hints.policies.map((p) => {
            const kind = p.tags?.kind === "life" || p.tags?.kind === "accident" ? p.tags.kind : p.tags?.kind === "health" || p.licence === "health" ? "health" : p.licence === "life" ? "life" : null;
            return <HintRow key={p.policy_key} label={`${p.insurer} · ${inr(paise(p.yearly_premium))}/${lang === "hi" ? "saal" : "yr"}`}
              done={profile.existing.some((c) => c.source === "aa_detected" && c.kind === kind)} disabled={!kind}
              onAdd={() => kind && addCover({ kind, source: "aa_detected" })} />;
          })}
          <p className="mt-1 text-[11px] text-muted">{t({ hi: "Company ka naam sirf aapko pehchaanne ke liye — engine ko nahi jaata. Jodne ke baad rakam likhein.", en: "The insurer's name is only for you to recognise it — the engine never gets it. Type the sum insured after adding." })}</p>
        </div>
      )}

      <div>
        <p className="font-extrabold">{t({ hi: "Pehle se bima", en: "Cover you already have" })}</p>
        <div className="mt-2 space-y-2">
          {profile.existing.map((c) => (
            <div key={c.id} className="rounded-[18px] bg-lav/40 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                {(["health", "life", "accident"] as const).map((k) => (
                  <button key={k} onClick={() => set({ existing: profile.existing.map((x) => (x.id === c.id ? { ...x, kind: k } : x)) })} className={`rounded-full px-3 min-h-9 text-[12px] font-bold ${c.kind === k ? "bg-ink text-white" : "bg-white"}`}>
                    {k === "health" ? "Health" : k === "life" ? (lang === "hi" ? "Jeevan" : "Life") : (lang === "hi" ? "Durghatna" : "Accident")}
                  </button>
                ))}
                {c.source === "aa_detected" && <span className="text-[10px] font-bold rounded-full bg-haldi px-2 py-0.5">AA</span>}
                <button aria-label="Remove" onClick={() => set({ existing: profile.existing.filter((x) => x.id !== c.id) })} className="ml-auto grid place-items-center h-9 w-9 rounded-full bg-white"><Trash2 size={15} /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.members.map((m) => (
                  <button key={m.id} onClick={() => set({ existing: profile.existing.map((x) => (x.id === c.id ? { ...x, member_ids: toggleIn(x.member_ids, m.id) } : x)) })}
                    className={`rounded-full px-3 min-h-8 text-[12px] font-bold ${c.member_ids.includes(m.id) ? "bg-leaf text-white" : "bg-white"}`}>{nameOf(m.id)}</button>
                ))}
              </div>
              <NumInput money suffix={value(c.sum_insured, lang === "hi" ? "cover" : "cover")} value={paise(c.sum_insured)} placeholder={lang === "hi" ? "Cover ki rakam ₹" : "Sum insured ₹"} onChange={(v) => set({ existing: profile.existing.map((x) => (x.id === c.id ? { ...x, sum_insured: v === null ? null : toPaise(v) } : x)) })} />
              <button onClick={() => set({ existing: profile.existing.map((x) => (x.id === c.id ? { ...x, employer: !x.employer } : x)) })} className="text-[12px] font-bold flex items-center gap-2">
                <span className={`h-5 w-5 rounded-md grid place-items-center ${c.employer ? "bg-ink text-white" : "border-2 border-ink/20"}`}>{c.employer && "✓"}</span>{t({ hi: "Naukri se mila", en: "From employer" })}
              </button>
            </div>
          ))}
          <button onClick={() => addCover()} className="w-full min-h-11 rounded-[16px] border-2 border-dashed border-ink/15 text-sm font-bold flex items-center justify-center gap-1"><Plus size={15} />{t({ hi: "Policy jodein", en: "Add a policy" })}</button>
        </div>
      </div>

      <div>
        <p className="font-extrabold">{t({ hi: "Sarkari yojana jo pehle se hai", en: "Government schemes you already have" })}</p>
        <div className="mt-2 space-y-1.5">
          {adults.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-1.5 text-[12px]">
              <span className="w-20 font-bold truncate">{nameOf(m.id)}</span>
              {([["pmjjby_member_ids", "PMJJBY"], ["pmsby_member_ids", "PMSBY"], ["vay_vandana_member_ids", "Vay Vandana"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => set({ [k]: toggleIn(profile[k], m.id) } as Partial<CoverProfile>)} className={`rounded-full px-2.5 min-h-8 font-bold ${profile[k].includes(m.id) ? "bg-leaf text-white" : "bg-lav"}`}>{label}</button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setMore(!more)} className="w-full flex items-center justify-between text-sm font-bold min-h-10">
        {t({ hi: "Aapki shartein aur bimaari (optional)", en: "Your filters and health conditions (optional)" })}<ChevronDown size={16} className={more ? "rotate-180" : ""} />
      </button>
      {more && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-[12px] font-bold">
            {([["room_rent_no_cap", { hi: "Room rent seema nahi", en: "No room-rent limit" }], ["restore_benefit", { hi: "Restore benefit", en: "Restore benefit" }], ["maternity", { hi: "Maternity", en: "Maternity" }], ["opd", { hi: "OPD", en: "OPD" }]] as const).map(([k, l]) => (
              <button key={k} onClick={() => set({ filters: { ...profile.filters, [k]: !profile.filters[k] } })} className={`min-h-11 rounded-[14px] ${profile.filters[k] ? "bg-ink text-white" : "bg-lav"}`}>{profile.filters[k] ? "✓ " : ""}{t(l)}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="flex-1 font-bold">{t({ hi: "Co-payment zyada se zyada", en: "Most co-payment you accept" })}</span>
            {([0, 10, 20] as const).map((v) => <button key={v} onClick={() => set({ filters: { ...profile.filters, copay_max_pct: v } })} className={`rounded-full px-3 min-h-9 font-bold ${profile.filters.copay_max_pct === v ? "bg-ink text-white" : "bg-lav"}`}>{v}%</button>)}
          </div>
          <div className="rounded-[18px] bg-rose/50 p-3">
            <p className="font-bold text-sm">{t({ hi: "Bimaari (sirf haan/nahi)", en: "Health conditions (yes/no only)" })}</p>
            {!conditionsAllowed ? (
              <><p className="text-[12px] mt-1">{t({ hi: "Iske liye alag consent chahiye.", en: "This needs its own consent." })}</p>
                <button onClick={onAllowConditions} className="mt-2 rounded-full bg-ink text-white px-4 min-h-10 text-xs font-bold">{t({ hi: "Bimaari ke liye consent dein", en: "Allow health conditions" })}</button></>
            ) : profile.members.map((m) => (
              <div key={m.id} className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                <span className="w-20 font-bold truncate">{nameOf(m.id)}</span>
                {CONDITIONS.map((c: Condition) => {
                  const on = conditions[m.id]?.includes(c) ?? false;
                  return <button key={c} onClick={() => setConditions({ ...conditions, [m.id]: toggleIn(conditions[m.id] ?? [], c) as Condition[] })} className={`rounded-full px-2.5 min-h-8 font-bold ${on ? "bg-ink text-white" : "bg-white"}`}>{t(CONDITION[c])}</button>;
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <Btn variant="ink" className="w-full" disabled={busy || profile.members.length === 0} onClick={onRun}>{busy ? (lang === "hi" ? "Hisaab ho raha hai…" : "Checking…") : (lang === "hi" ? "Save karein aur bima check karein" : "Save and check our cover")}</Btn>
    </div>
  );
}

function HintRow({ label, done, onAdd, disabled }: { label: string; done: boolean; onAdd: () => void; disabled?: boolean }) {
  const { lang } = useApp();
  return (
    <div className="mt-2 flex items-center gap-2 text-[13px]">
      <span className="flex-1 truncate">{label}</span>
      <button disabled={done || disabled} onClick={onAdd} className="rounded-full bg-ink text-white px-3 min-h-8 text-xs font-bold disabled:opacity-40">{done ? (lang === "hi" ? "Juda" : "Added") : (lang === "hi" ? "Jodein" : "Add")}</button>
    </div>
  );
}

/* -------------------------------- results ------------------------------- */

function PlanView({ plan, nameOf }: { plan: CoverPlan; nameOf: (id: string) => string }) {
  const { t, lang } = useApp();
  const [why, setWhy] = useState<string | null>(null);
  const sum = summarise(plan);
  const names = (ids: string[]) => ids.map(nameOf).join(", ");
  const units = [...plan.units].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  const specText = () => {
    const lines = [
      `DhanYukti — ${lang === "hi" ? "Bima specification" : "Cover specification"}`,
      `${plan.ruleset_version} · input ${plan.input_hash.slice(0, 12)}${plan.receipt_id ? ` · receipt ${plan.receipt_id}` : ""}`,
      lang === "hi" ? "Kisi company/product/daam/commission ke bina bana. Sirf wahi plan dekhein jo har line poori karein." : "Made without any insurer, product, price or commission. Compare only plans that meet every line.",
      "",
      ...plan.specs.flatMap((s, i) => [
        `${i + 1}. ${t(SPEC[s.cover_type])} — ${inr(paise(s.sum_insured))}${s.term_until_age ? ` (${lang === "hi" ? "umar" : "to age"} ${s.term_until_age})` : ""}`,
        `   ${lang === "hi" ? "Kiske liye" : "For"}: ${names(s.member_ids)}`,
        ...s.must_have.map((f) => `   ✓ ${t(FEATURE[f])}${f === "copay_max" ? `: ${s.filter_values.copay_max_pct}%` : f === "ped_wait_max" ? `: ${s.filter_values.ped_wait_max_months}` : ""}`),
        ...s.notes.map((n) => `   ! ${t(NOTE[n])}`),
      ]),
      "",
      lang === "hi" ? "Yeh anumaan hai, salah nahi. DhanYukti koi policy nahi bechta." : "An estimate from published assumptions, not advice. DhanYukti sells no policy.",
    ];
    return lines.join("\n");
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([specText()], { type: "text/plain" }));
    const a = document.createElement("a"); a.href = url; a.download = `dhanyukti-cover-spec-${plan.input_hash.slice(0, 8)}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div id="cover-result" className="space-y-3 scroll-mt-4">
      <div className="mx-5 lg:mx-0 rounded-[32px] bg-ink text-white p-5">
        <p className="text-[12px] font-bold uppercase tracking-widest text-haldi">{t({ hi: "Parivaar ke bima ki kami", en: "Your family's cover gaps" })}</p>
        {sum.gaps ? (<>
          <p className="mt-1 text-[15px] text-white/80">{t({ hi: "Pehla kadam", en: "First step" })}: <b className="text-white">{t(sum.top)}</b></p>
          <p className="text-[42px] font-extrabold num leading-tight">{inr(Math.round(sum.top_gap_paise / 100))}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["health", "life", "accident"] as const).filter((k) => sum.by_kind[k]).map((k) => (
              <span key={k} className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-bold">{t(KIND_L[k])} {inr(Math.round((sum.by_kind[k] ?? 0) / 100))}</span>
            ))}
          </div>
          <p className="mt-2 text-sm text-white/70">{t({ hi: `${sum.gaps} jagah kami — alag alag tarah ka bima, isliye jode nahi gaye`, en: `${sum.gaps} gaps — different kinds of cover, so they aren't added up` })}{sum.unknown ? t({ hi: ` · ${sum.unknown} abhi pata nahi`, en: ` · ${sum.unknown} can't tell yet` }) : ""}</p>
        </>) : (
          <p className="text-[28px] font-extrabold leading-tight mt-1">{t({ hi: "Jo bataya uske hisaab se koi kami nahi", en: "No gaps from what you told us" })}</p>
        )}
        <p className="mt-3 text-[10px] font-mono text-white/50">{plan.ruleset_version} · {plan.input_hash.slice(0, 12)}{plan.receipt_id ? ` · ${plan.receipt_id}` : ""}</p>
      </div>

      {plan.missing.length > 0 && (
        <div className="mx-5 lg:mx-0 rounded-[20px] bg-amber-soft p-3 text-[13px]">
          <b>{t({ hi: "Zyada sahi jawaab ke liye batayein:", en: "Add these for a more exact result:" })}</b> {plan.missing.map((m) => t(MISSING[m] ?? { hi: m, en: m })).join(" · ")}
        </div>
      )}

      <Step n={1} title={{ hi: "Pehle sarkari yojana", en: "Government schemes first" }} lead={{ hi: "Sabse sasta cover. DhanYukti ko inse kuch nahi milta.", en: "Cheapest cover. DhanYukti earns nothing from them." }}>
        {plan.public_first.length === 0 && <p className="text-sm text-muted">{t({ hi: "Kisi bade sadasya ki umar nahi batayi.", en: "No adult's age was given." })}</p>}
        {plan.public_first.map((p, i) => (
          <div key={i} className="flex items-center gap-2 py-2 border-t border-lav first:border-0 text-[13px]">
            <span className="flex-1"><b>{nameOf(p.member_id)}</b> · {t(SCHEME[p.scheme])}<span className="block text-[11px] text-muted">{inr(paise(p.cover))} cover · {p.annual_premium && p.annual_premium.amount_paise > 0 ? `${inr(paise(p.annual_premium))}/${lang === "hi" ? "saal" : "yr"}` : (lang === "hi" ? "muft" : "free")}</span></span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${PSTATUS[p.status].cls}`}>{t(PSTATUS[p.status])}</span>
          </div>
        ))}
      </Step>

      <Step n={2} title={{ hi: "Kitna chahiye, kitna hai", en: "What you need, what you have" }}>
        {units.map((u) => (
          <div key={u.unit_id} className="py-3 border-t border-lav first:border-0">
            <div className="flex items-center gap-2">
              {u.priority && <span className="grid place-items-center h-6 w-6 rounded-full bg-ink text-white text-[11px] font-extrabold">{u.priority}</span>}
              <span className="flex-1 font-extrabold text-[14px]">{t(unitLabel(u))}<span className="block text-[11px] font-semibold text-muted">{names(u.member_ids)}{u.term_until_age ? ` · ${lang === "hi" ? "umar" : "until age"} ${u.term_until_age}` : ""}</span></span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${USTATUS[u.status].cls}`}>{t(USTATUS[u.status])}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              {([[{ hi: "Chahiye", en: "Need" }, u.need], [{ hi: "Hai", en: "Have" }, u.have], [{ hi: "Kami", en: "Gap" }, u.gap]] as const).map(([l, v], i) => (
                <div key={i} className={`rounded-[14px] p-2 ${i === 2 && u.status === "gap" ? "bg-danger-soft" : "bg-lav/50"}`}>
                  <p className="text-[10px] font-bold text-muted uppercase">{t(l)}</p>
                  <p className="text-[14px] font-extrabold num">{v ? inr(paise(v)) : "?"}</p>
                </div>
              ))}
            </div>
            {u.have_items.length > 0 && <p className="mt-1 text-[11px] text-muted">{u.have_items.map((h) => `${h.source_id.startsWith("c") ? (lang === "hi" ? "Policy" : "Policy") : h.source_id.toUpperCase()} ${inr(paise(h.amount))} (${t(HAVE_NOTE[h.note])})`).join(" · ")}</p>}
            {u.missing.length > 0 && <p className="mt-1 text-[11px] text-[#9a5f00]">{t({ hi: "Chahiye:", en: "Needs:" })} {u.missing.map((m) => t(MISSING[m] ?? { hi: m, en: m })).join(", ")}</p>}
            <button onClick={() => setWhy(why === u.unit_id ? null : u.unit_id)} className="mt-1 text-[12px] font-bold text-clay">Kyon? {why === u.unit_id ? "▴" : "▾"}</button>
            {why === u.unit_id && <ul className="mt-1 space-y-1 text-[12px] leading-snug">{u.rule_ids.map((r) => <li key={r}><span className="font-mono text-[10px] rounded bg-lav px-1">{r}</span> {t(RULE[r] ?? { hi: r, en: r })}</li>)}</ul>}
          </div>
        ))}
      </Step>

      <Step n={3} title={{ hi: "Aapki bima specification", en: "Your cover specification" }} lead={{ hi: "Yeh Bima Sugam (IRDAI) ya kisi bhi insurer ke paas le jaayein. Sirf wahi plan dekhein jo har line poori kare.", en: "Take this to Bima Sugam (IRDAI) or any insurer. Compare only plans that meet every line." }}>
        {plan.specs.length === 0 && <p className="text-sm text-muted">{t({ hi: "Jo bataya uske hisaab se kuch bharna nahi.", en: "Nothing to fill from what you told us." })}</p>}
        {plan.specs.map((s) => (
          <div key={s.unit_id} className="py-3 border-t border-lav first:border-0">
            <p className="font-extrabold">{t(SPEC[s.cover_type])} <span className="num">+{inr(paise(s.sum_insured))}</span>{s.term_until_age ? <span className="text-sm text-muted"> · {lang === "hi" ? "umar" : "to age"} {s.term_until_age}</span> : null}</p>
            <p className="text-[12px] text-muted">{lang === "hi" ? "Kiske liye" : "For"}: {names(s.member_ids)}</p>
            <ul className="mt-1.5 space-y-1 text-[13px]">
              {s.must_have.map((f) => <li key={f} className="flex gap-1.5"><span className="text-leaf">✓</span>{t(FEATURE[f])}{f === "copay_max" ? `: ${s.filter_values.copay_max_pct}%` : f === "ped_wait_max" ? `: ${s.filter_values.ped_wait_max_months}` : ""}</li>)}
            </ul>
            {s.notes.length > 0 && <ul className="mt-2 space-y-1 text-[12px] text-[#9a5f00]">{s.notes.map((n) => <li key={n}>! {t(NOTE[n])}</li>)}</ul>}
          </div>
        ))}
        {plan.specs.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={BIMA_SUGAM_URL} target="_blank" rel="noreferrer" className="min-h-12 rounded-[16px] bg-ink text-white font-bold text-sm flex items-center justify-center gap-1.5"><ExternalLink size={16} />Bima Sugam</a>
            <button onClick={download} className="min-h-12 rounded-[16px] bg-lav font-bold text-sm flex items-center justify-center gap-1.5"><Download size={16} />{lang === "hi" ? "Spec download" : "Download spec"}</button>
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted">{t({ hi: "Bima Sugam IRDAI ka insurance marketplace hai; kharidari charanon mein shuru ho rahi hai. DhanYukti koi plan nahi dikhata ya bechta — yeh IRDAI registration ka kaam hai.", en: "Bima Sugam is IRDAI's insurance marketplace; buying is rolling out in stages. DhanYukti doesn't list or sell plans — that needs IRDAI registration." })}</p>
      </Step>

      <details className="mx-5 lg:mx-0 rounded-[20px] bg-white p-3 shadow-soft text-[12px]">
        <summary className="font-bold cursor-pointer flex items-center gap-1.5"><Sparkles size={14} />{t({ hi: "Kya maan kar chale (assumptions)", en: "Assumptions used" })}</summary>
        <ul className="mt-2 space-y-1">
          <li>{t({ hi: "Parivaar floater", en: "Family floater base" })}: {(["metro", "tier2", "tier3"] as CityTier[]).map((c) => `${t(CITY[c])} ${inr(paise(plan.rules_used.floater_base[c]))}`).join(" · ")}</li>
          <li>{t({ hi: "Maa-pitaji", en: "Parents" })} ({plan.rules_used.senior_age}+): {(["metro", "tier2", "tier3"] as CityTier[]).map((c) => inr(paise(plan.rules_used.senior_base[c]))).join(" / ")}</li>
          <li>{t({ hi: "4 se zyada har vyakti", en: "Each person above 4" })}: +{inr(paise(plan.rules_used.extra_per_member_over_4))}</li>
          <li>{t({ hi: "Jeevan (kharcha na pata ho)", en: "Life (spending not told)" })}: {plan.rules_used.life_income_multiple}× {t({ hi: "aamdani + loan", en: "income + loans" })}</li>
          <li>{t({ hi: "Durghatna", en: "Accident" })}: {plan.rules_used.accident_income_multiple}× {t({ hi: "aamdani", en: "income" })}</li>
          <li>{t({ hi: "Sahara jab tak sabse chhota bachcha", en: "Support until youngest child is" })} {plan.rules_used.child_independence_age} · {t({ hi: "kam se kam", en: "at least" })} {plan.rules_used.min_years} {t({ hi: "saal", en: "years" })}</li>
          <li>{t({ hi: "Term cover umar", en: "Term cover to age" })} {plan.rules_used.term_end_age[0]}–{plan.rules_used.term_end_age[1]}</li>
        </ul>
        <p className="mt-2 text-muted">{t({ hi: "Yeh DhanYukti ke niyam hain (IRDAI ke nahi), aam planning practice par. Yeh anumaan hai, salah nahi.", en: "These are DhanYukti defaults from common planning practice, not IRDAI rules. An estimate, not advice." })}</p>
      </details>
    </div>
  );
}

const KIND_L: Record<"health" | "life" | "accident", L> = { health: { hi: "Health", en: "Health" }, life: { hi: "Jeevan", en: "Life" }, accident: { hi: "Durghatna", en: "Accident" } };

function Step({ n, title, lead, children }: { n: number; title: L; lead?: L; children: React.ReactNode }) {
  const { t } = useApp();
  return (
    <div className="mx-5 lg:mx-0 rounded-[28px] bg-white p-4 shadow-soft">
      <p className="font-extrabold text-[16px]"><span className="text-clay">{n} ·</span> {t(title)}</p>
      {lead && <p className="text-[12px] text-muted mt-0.5">{t(lead)}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

