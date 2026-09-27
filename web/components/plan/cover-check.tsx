"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { ReceiptNote } from "@/components/consent/dpdp-purposes";
import { AvailabilityState } from "@/components/finance/availability-state";
import { CoverPlanView } from "@/components/plan/cover-plan-view";
import { PlanFrame } from "@/components/plan/plan-frame";
import { usePlanText } from "@/components/plan/plan-text";
import { Button } from "@/components/ui/button";
import type { MoneyPaise } from "@/lib/contracts/common";
import {
  CONDITIONS,
  DEFAULT_FILTERS,
  RELATIONS,
  type CoverPlan,
  type CoverProfile,
  type DeclaredCover,
  type MemberConditions,
  type ProfileMember,
} from "@/lib/contracts/cover-engine";
import type { DetectedPolicy } from "@/lib/contracts/insurance-cover";
import { setDpdpConsent } from "@/lib/dpdp/client";
import type { LedgerEntry } from "@/lib/dpdp/notice";

type Hint = DetectedPolicy & { link_id: string };

interface Loaded {
  consents: { cover_profile: boolean; health_conditions: boolean };
  profile: CoverProfile | null;
  conditions: MemberConditions;
}

const EMPTY: CoverProfile = {
  version: 1,
  city_tier: null,
  members: [
    { id: "m1", relation: "self", age: null, earns: true, annual_income: null },
  ],
  annual_expenses: null,
  loans_outstanding: null,
  liquid_savings: null,
  existing: [],
  pmjjby_member_ids: [],
  pmsby_member_ids: [],
  vay_vandana_member_ids: [],
  filters: DEFAULT_FILTERS,
  updated_at: null,
};

const toRupees = (m: MoneyPaise | null) =>
  m ? String(Math.round(m.amount_paise / 100)) : "";
const toPaise = (value: string): MoneyPaise | null => {
  const n = Number(value.replace(/[,\s]/g, ""));
  return value.trim() && Number.isFinite(n) && n >= 0
    ? { amount_paise: Math.round(n * 100), currency: "INR" }
    : null;
};
const nextId = (prefix: "m" | "c", ids: string[]) =>
  `${prefix}${ids.reduce((max, id) => Math.max(max, Number(id.slice(1)) || 0), 0) + 1}`;

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "same-origin",
  });
  const body = (await response.json().catch(() => null)) as
    (T & { error?: { safe_message?: string } }) | null;
  if (!response.ok || !body)
    throw new Error(body?.error?.safe_message ?? "unavailable");
  return body;
}

function Field({
  label,
  children,
  id,
}: {
  label: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-muted-foreground block text-xs font-medium"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "bg-background h-10 w-full rounded-md border px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring";

/** Family cover check: consent, profile, filters, then the engine's plan. */
export function CoverCheck() {
  const text = usePlanText();
  const [loaded, setLoaded] = useState<Loaded | "error" | null>(null);
  const [profile, setProfile] = useState<CoverProfile>(EMPTY);
  const [conditions, setConditions] = useState<MemberConditions>({});
  const [hints, setHints] = useState<Hint[]>([]);
  const [receipt, setReceipt] = useState<LedgerEntry | null>(null);
  const [plan, setPlan] = useState<CoverPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await json<Loaded>("/api/engine/cover/profile");
      const prefill = await json<{
        hints: { policies: Hint[]; pmjjby: string; pmsby: string };
      }>("/api/engine/cover/prefill").catch(() => null);
      return { data, prefill };
    })()
      .then(({ data, prefill }) => {
        if (cancelled) return;
        setLoaded(data);
        setConditions(data.conditions ?? {});
        setHints(prefill?.hints.policies ?? []);
        if (data.profile) {
          setProfile(data.profile);
        } else if (prefill) {
          setProfile((p) => ({
            ...p,
            pmjjby_member_ids:
              prefill.hints.pmjjby === "seen" ? ["m1"] : p.pmjjby_member_ids,
            pmsby_member_ids:
              prefill.hints.pmsby === "seen" ? ["m1"] : p.pmsby_member_ids,
          }));
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded("error");
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  async function grant(purpose: "cover_profile" | "health_conditions") {
    const result = await setDpdpConsent(purpose, "grant");
    setReceipt(result.receipt);
    setVersion((v) => v + 1);
  }

  function setMember(id: string, change: Partial<ProfileMember>) {
    setProfile((p) => ({
      ...p,
      members: p.members.map((m) => (m.id === id ? { ...m, ...change } : m)),
    }));
  }
  function removeMember(id: string) {
    setProfile((p) => ({
      ...p,
      members: p.members.filter((m) => m.id !== id),
      existing: p.existing.map((c) => ({
        ...c,
        member_ids: c.member_ids.filter((x) => x !== id),
      })),
      pmjjby_member_ids: p.pmjjby_member_ids.filter((x) => x !== id),
      pmsby_member_ids: p.pmsby_member_ids.filter((x) => x !== id),
      vay_vandana_member_ids: p.vay_vandana_member_ids.filter((x) => x !== id),
    }));
  }
  function setCover(id: string, change: Partial<DeclaredCover>) {
    setProfile((p) => ({
      ...p,
      existing: p.existing.map((c) => (c.id === id ? { ...c, ...change } : c)),
    }));
  }
  function toggleIn(
    list: keyof Pick<
      CoverProfile,
      "pmjjby_member_ids" | "pmsby_member_ids" | "vay_vandana_member_ids"
    >,
    id: string,
    on: boolean,
  ) {
    setProfile((p) => ({
      ...p,
      [list]: on
        ? Array.from(new Set([...p[list], id]))
        : p[list].filter((x) => x !== id),
    }));
  }

  function addHint(h: Hint) {
    const kind = h.tags?.kind;
    const coverKind: DeclaredCover["kind"] =
      kind === "life"
        ? "life"
        : kind === "accident"
          ? "accident"
          : h.licence === "life"
            ? "life"
            : "health";
    const groupToRelation = {
      self: "self",
      spouse: "spouse",
      children: "child",
      parents: "parent",
      other: "other",
    } as const;
    const members = (h.tags?.covers ?? [])
      .flatMap((g) =>
        profile.members.filter((m) => m.relation === groupToRelation[g]),
      )
      .map((m) => m.id);
    setProfile((p) => ({
      ...p,
      existing: [
        ...p.existing,
        {
          id: nextId(
            "c",
            p.existing.map((c) => c.id),
          ),
          kind: coverKind,
          member_ids: members,
          sum_insured: null,
          employer: false,
          source: "aa_detected",
        },
      ],
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await json<{ profile: CoverProfile }>(
        "/api/engine/cover/profile",
        {
          method: "PUT",
          body: JSON.stringify({ profile, conditions }),
        },
      );
      setProfile(saved.profile);
      const result = await json<{ plan: CoverPlan }>("/api/engine/cover/run", {
        method: "POST",
      });
      setPlan(result.plan);
      requestAnimationFrame(() =>
        document.getElementById("cover-results")?.focus(),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : text("unavailable"));
    } finally {
      setBusy(false);
    }
  }

  if (loaded === null) {
    return (
      <PlanFrame title={text("coverTitle")} back>
        <p role="status" className="text-muted-foreground">
          {text("loading")}
        </p>
      </PlanFrame>
    );
  }
  if (loaded === "error") {
    return (
      <PlanFrame title={text("coverTitle")} back>
        <AvailabilityState status="unavailable" title={text("unavailable")} />
      </PlanFrame>
    );
  }

  if (!loaded.consents.cover_profile) {
    return (
      <PlanFrame title={text("coverTitle")} intro={text("coverIntro")} back>
        <section
          className="bg-card space-y-3 rounded-xl border p-4"
          data-cover-consent="needed"
        >
          <h2 className="font-semibold">{text("consentTitle")}</h2>
          <p className="text-sm">{text("consentBody")}</p>
          <Button size="xl" onClick={() => grant("cover_profile")}>
            {text("consentGive")}
          </Button>
        </section>
      </PlanFrame>
    );
  }

  const members = profile.members;
  const adults = members.filter((m) => m.relation !== "child");
  const label = (m: ProfileMember) =>
    `${text(`relation_${m.relation}`)}${m.age !== null ? ` (${m.age})` : ""}`;

  return (
    <PlanFrame title={text("coverTitle")} intro={text("coverIntro")} back>
      {receipt && <ReceiptNote entry={receipt} />}
      {plan ? (
        <CoverPlanView
          plan={plan}
          profile={profile}
          onEdit={() => setPlan(null)}
        />
      ) : (
        <form
          onSubmit={submit}
          className="space-y-8"
          noValidate
          data-cover-form
        >
          <fieldset className="space-y-2">
            <legend className="text-lg font-semibold">
              {text("cityHeading")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {(["metro", "tier2", "tier3"] as const).map((tier) => (
                <label
                  key={tier}
                  className="bg-card flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name="city"
                    checked={profile.city_tier === tier}
                    onChange={() =>
                      setProfile((p) => ({ ...p, city_tier: tier }))
                    }
                  />
                  {text(`city_${tier}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <section className="space-y-3" aria-labelledby="members-h">
            <div>
              <h2 id="members-h" className="text-lg font-semibold">
                {text("membersHeading")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {text("membersLead")}
              </p>
            </div>
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="bg-card grid grid-cols-2 gap-2 rounded-xl border p-3 sm:grid-cols-5"
                  data-member={m.id}
                >
                  <Field label={text("relation")} id={`${m.id}-rel`}>
                    <select
                      id={`${m.id}-rel`}
                      className={inputCls}
                      value={m.relation}
                      onChange={(e) =>
                        setMember(m.id, {
                          relation: e.target.value as ProfileMember["relation"],
                        })
                      }
                    >
                      {RELATIONS.map((r) => (
                        <option
                          key={r}
                          value={r}
                          disabled={
                            r === "self" &&
                            m.relation !== "self" &&
                            members.some((x) => x.relation === "self")
                          }
                        >
                          {text(`relation_${r}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={text("age")} id={`${m.id}-age`}>
                    <input
                      id={`${m.id}-age`}
                      className={inputCls}
                      inputMode="numeric"
                      value={m.age ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 3);
                        setMember(m.id, { age: v === "" ? null : Number(v) });
                      }}
                    />
                  </Field>
                  <label className="flex items-end gap-2 pb-2 text-sm">
                    <input
                      type="checkbox"
                      checked={m.earns}
                      onChange={(e) =>
                        setMember(m.id, {
                          earns: e.target.checked,
                          annual_income: e.target.checked
                            ? m.annual_income
                            : null,
                        })
                      }
                    />
                    {text("earns")}
                  </label>
                  <Field label={text("income")} id={`${m.id}-inc`}>
                    <input
                      id={`${m.id}-inc`}
                      className={inputCls}
                      inputMode="numeric"
                      disabled={!m.earns}
                      value={toRupees(m.annual_income)}
                      onChange={(e) =>
                        setMember(m.id, {
                          annual_income: toPaise(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <div className="flex items-end">
                    {members.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(m.id)}
                      >
                        <Trash2 aria-hidden />
                        <span className="sr-only sm:not-sr-only">
                          {text("remove")}
                        </span>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {members.length < 12 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setProfile((p) => ({
                    ...p,
                    members: [
                      ...p.members,
                      {
                        id: nextId(
                          "m",
                          p.members.map((x) => x.id),
                        ),
                        relation: "child",
                        age: null,
                        earns: false,
                        annual_income: null,
                      },
                    ],
                  }))
                }
              >
                <Plus aria-hidden />
                {text("addMember")}
              </Button>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="money-h">
            <h2 id="money-h" className="text-lg font-semibold">
              {text("moneyHeading")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["annual_expenses", "expenses"],
                  ["loans_outstanding", "loans"],
                  ["liquid_savings", "savings"],
                ] as const
              ).map(([key, copy]) => (
                <Field key={key} label={text(copy)} id={`money-${key}`}>
                  <input
                    id={`money-${key}`}
                    className={inputCls}
                    inputMode="numeric"
                    value={toRupees(profile[key])}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        [key]: toPaise(e.target.value),
                      }))
                    }
                  />
                </Field>
              ))}
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="existing-h">
            <div>
              <h2 id="existing-h" className="text-lg font-semibold">
                {text("existingHeading")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {text("existingLead")}
              </p>
            </div>
            {hints.length > 0 && (
              <div
                className="bg-primary/5 border-primary/30 space-y-2 rounded-xl border p-3"
                data-cover-hints={hints.length}
              >
                <p className="text-sm font-semibold">{text("hintsHeading")}</p>
                <p className="text-muted-foreground text-xs">
                  {text("hintsLead")}
                </p>
                <ul className="space-y-1">
                  {hints.map((h) => (
                    <li
                      key={`${h.link_id}-${h.policy_key}`}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        {h.insurer}
                        {h.tags
                          ? ` · ${text(`kind_${h.tags.kind === "life" ? "life" : h.tags.kind === "accident" ? "accident" : "health"}`)}`
                          : ""}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addHint(h)}
                      >
                        {text("hintAdd")}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ul className="space-y-2">
              {profile.existing.map((c) => (
                <li
                  key={c.id}
                  className="bg-card space-y-2 rounded-xl border p-3"
                  data-existing={c.id}
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Field label={text("kind")} id={`${c.id}-kind`}>
                      <select
                        id={`${c.id}-kind`}
                        className={inputCls}
                        value={c.kind}
                        onChange={(e) =>
                          setCover(c.id, {
                            kind: e.target.value as DeclaredCover["kind"],
                          })
                        }
                      >
                        {(["health", "life", "accident"] as const).map((k) => (
                          <option key={k} value={k}>
                            {text(`kind_${k}`)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={text("sumInsured")} id={`${c.id}-si`}>
                      <input
                        id={`${c.id}-si`}
                        className={inputCls}
                        inputMode="numeric"
                        value={toRupees(c.sum_insured)}
                        onChange={(e) =>
                          setCover(c.id, {
                            sum_insured: toPaise(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <label className="flex items-end gap-2 pb-2 text-sm">
                      <input
                        type="checkbox"
                        checked={c.employer}
                        onChange={(e) =>
                          setCover(c.id, { employer: e.target.checked })
                        }
                      />
                      {text("employer")}
                    </label>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setProfile((p) => ({
                            ...p,
                            existing: p.existing.filter((x) => x.id !== c.id),
                          }))
                        }
                      >
                        <Trash2 aria-hidden />
                        <span className="sr-only sm:not-sr-only">
                          {text("remove")}
                        </span>
                      </Button>
                    </div>
                  </div>
                  <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
                    <legend className="text-muted-foreground text-xs font-medium">
                      {text("who")}
                    </legend>
                    {members.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-1.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={c.member_ids.includes(m.id)}
                          onChange={(e) =>
                            setCover(c.id, {
                              member_ids: e.target.checked
                                ? [...c.member_ids, m.id]
                                : c.member_ids.filter((x) => x !== m.id),
                            })
                          }
                        />
                        {label(m)}
                      </label>
                    ))}
                  </fieldset>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setProfile((p) => ({
                  ...p,
                  existing: [
                    ...p.existing,
                    {
                      id: nextId(
                        "c",
                        p.existing.map((x) => x.id),
                      ),
                      kind: "health",
                      member_ids: [],
                      sum_insured: null,
                      employer: false,
                      source: "declared",
                    },
                  ],
                }))
              }
            >
              <Plus aria-hidden />
              {text("addCover")}
            </Button>
          </section>

          <section className="space-y-2" aria-labelledby="public-h">
            <h2 id="public-h" className="text-lg font-semibold">
              {text("publicHeading")}
            </h2>
            <ul className="space-y-1">
              {adults.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                >
                  <span className="min-w-28 font-medium">{label(m)}</span>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={profile.pmsby_member_ids.includes(m.id)}
                      onChange={(e) =>
                        toggleIn("pmsby_member_ids", m.id, e.target.checked)
                      }
                    />
                    {text("pays_pmsby")}
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={profile.pmjjby_member_ids.includes(m.id)}
                      onChange={(e) =>
                        toggleIn("pmjjby_member_ids", m.id, e.target.checked)
                      }
                    />
                    {text("pays_pmjjby")}
                  </label>
                  {m.age !== null && m.age >= 70 && (
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={profile.vay_vandana_member_ids.includes(m.id)}
                        onChange={(e) =>
                          toggleIn(
                            "vay_vandana_member_ids",
                            m.id,
                            e.target.checked,
                          )
                        }
                      />
                      {text("has_vay_vandana")}
                    </label>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2" aria-labelledby="cond-h">
            <h2 id="cond-h" className="text-lg font-semibold">
              {text("conditionsHeading")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {text("conditionsLead")}
            </p>
            {loaded.consents.health_conditions ? (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.id} className="space-y-1" data-conditions={m.id}>
                    <p className="text-sm font-medium">{label(m)}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {CONDITIONS.map((c) => (
                        <label
                          key={c}
                          className="flex items-center gap-1.5 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={(conditions[m.id] ?? []).includes(c)}
                            onChange={(e) =>
                              setConditions((all) => ({
                                ...all,
                                [m.id]: e.target.checked
                                  ? [...(all[m.id] ?? []), c]
                                  : (all[m.id] ?? []).filter((x) => x !== c),
                              }))
                            }
                          />
                          {text(`condition_${c}`)}
                        </label>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="bg-card space-y-2 rounded-xl border p-3">
                <p className="text-sm">{text("conditionsConsent")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => grant("health_conditions")}
                >
                  {text("conditionsGive")}
                </Button>
              </div>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="filters-h">
            <div>
              <h2 id="filters-h" className="text-lg font-semibold">
                {text("filtersHeading")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {text("filtersLead")}
              </p>
            </div>
            <div className="bg-card grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
              {(
                [
                  ["room_rent_no_cap", "f_room_rent"],
                  ["restore_benefit", "f_restore"],
                  ["maternity", "f_maternity"],
                  ["opd", "f_opd"],
                ] as const
              ).map(([key, copy]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={profile.filters[key]}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        filters: { ...p.filters, [key]: e.target.checked },
                      }))
                    }
                  />
                  {text(copy)}
                </label>
              ))}
              <Field label={text("f_copay")} id="f-copay">
                <select
                  id="f-copay"
                  className={inputCls}
                  value={profile.filters.copay_max_pct}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      filters: {
                        ...p.filters,
                        copay_max_pct: Number(e.target.value) as 0 | 10 | 20,
                      },
                    }))
                  }
                >
                  <option value={0}>{text("f_copay_0")}</option>
                  <option value={10}>10%</option>
                  <option value={20}>20%</option>
                </select>
              </Field>
              <Field label={text("f_ped")} id="f-ped">
                <select
                  id="f-ped"
                  className={inputCls}
                  value={profile.filters.ped_wait_max_months}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      filters: {
                        ...p.filters,
                        ped_wait_max_months: Number(e.target.value) as
                          12 | 24 | 36,
                      },
                    }))
                  }
                >
                  <option value={12}>{text("f_ped_12")}</option>
                  <option value={24}>{text("f_ped_24")}</option>
                  <option value={36}>{text("f_ped_36")}</option>
                </select>
              </Field>
              <fieldset className="space-y-1 sm:col-span-2">
                <legend className="text-muted-foreground text-xs font-medium">
                  {text("f_riders")}
                </legend>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {(
                    [
                      "accidental_death",
                      "critical_illness",
                      "waiver_of_premium",
                    ] as const
                  ).map((r) => (
                    <label
                      key={r}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={profile.filters.term_riders.includes(r)}
                        onChange={(e) =>
                          setProfile((p) => ({
                            ...p,
                            filters: {
                              ...p.filters,
                              term_riders: e.target.checked
                                ? [...p.filters.term_riders, r]
                                : p.filters.term_riders.filter((x) => x !== r),
                            },
                          }))
                        }
                      />
                      {text(`rider_${r}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>

          {error && (
            <p role="alert" className="text-negative text-sm">
              {error}
            </p>
          )}
          <Button type="submit" size="xl" disabled={busy}>
            {busy ? text("saving") : text("run")}
          </Button>
        </form>
      )}
    </PlanFrame>
  );
}
