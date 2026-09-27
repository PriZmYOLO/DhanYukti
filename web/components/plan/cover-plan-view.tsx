"use client";

import { Download, Printer, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { usePlanCode, usePlanText } from "@/components/plan/plan-text";
import { AvailabilityState } from "@/components/finance/availability-state";
import { Money } from "@/components/finance/money";
import { Button } from "@/components/ui/button";
import type {
  CoverPlan,
  CoverProfile,
  CoverUnit,
  ProfileMember,
} from "@/lib/contracts/cover-engine";

function Step({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {lead && <p className="text-muted-foreground text-sm">{lead}</p>}
      {children}
    </section>
  );
}

/** Shows the engine's plan. Decides nothing: every figure is from the server. */
export function CoverPlanView({
  plan,
  profile,
  onEdit,
}: {
  plan: CoverPlan;
  profile: CoverProfile;
  onEdit: () => void;
}) {
  const text = usePlanText();
  const code = usePlanCode();
  const member = (id: string) => profile.members.find((m) => m.id === id);
  const name = (m: ProfileMember | undefined) =>
    m
      ? `${text(`relation_${m.relation}`)}${m.age !== null ? ` (${m.age})` : ""}`
      : "";
  const names = (ids: string[]) => ids.map((id) => name(member(id))).join(", ");
  const coverLabel = (sourceId: string) =>
    ["pmjjby", "pmsby", "vay_vandana"].includes(sourceId)
      ? code("src", sourceId)
      : `${text("srcPolicy")} ${sourceId.replace(/^c/, "#")}`;

  function download() {
    const spec = {
      type: "dhanyukti_cover_specification",
      ruleset_version: plan.ruleset_version,
      generated_at: plan.generated_at,
      input_sha256: plan.input_hash,
      receipt_id: plan.receipt_id,
      note: "Estimate from published assumptions, not insurance advice. No insurer, product, price or commission was used.",
      public_first: plan.public_first.map((s) => ({
        ...s,
        member: name(member(s.member_id)),
      })),
      specifications: plan.specs.map((s) => ({
        ...s,
        members: names(s.member_ids),
      })),
    };
    const blob = new Blob([JSON.stringify(spec, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dhanyukti-cover-spec-${plan.input_hash.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const considered = plan.public_first.filter(
    (s) => s.status !== "not_eligible",
  );

  return (
    <div
      id="cover-results"
      tabIndex={-1}
      className="space-y-10 outline-none"
      data-cover-plan={plan.ruleset_version}
    >
      <div className="space-y-2">
        <h2 className="font-heading text-2xl">{text("resultsTitle")}</h2>
        <p className="flex items-start gap-2 text-sm">
          <ShieldCheck
            aria-hidden
            className="text-positive mt-0.5 size-4 shrink-0"
          />
          {text("firewall")}
        </p>
        <p className="text-muted-foreground text-xs">
          {text("ruleset")}{" "}
          <span className="font-mono">{plan.ruleset_version}</span>
          {plan.receipt_id && (
            <>
              {" · "}
              {text("receipt")}{" "}
              <span className="font-mono" data-cover-receipt>
                {plan.receipt_id}
              </span>
            </>
          )}
        </p>
        {plan.missing.length > 0 && (
          <AvailabilityState
            status="missing"
            title={text("missingTitle")}
            description={plan.missing
              .map((m) => code("missing", m))
              .join(" · ")}
          />
        )}
      </div>

      <Step id="step1" title={text("step1")} lead={text("step1Lead")}>
        <ul className="divide-y rounded-xl border px-3 text-sm">
          {considered.map((s) => (
            <li
              key={`${s.scheme}-${s.member_id}`}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              data-public={s.status}
            >
              <span>
                <span className="font-medium">{code("scheme", s.scheme)}</span>{" "}
                · {name(member(s.member_id))}
              </span>
              <span className="text-muted-foreground text-xs">
                {s.annual_premium && s.annual_premium.amount_paise > 0 ? (
                  <>
                    <Money value={s.annual_premium} /> {text("perYear")}
                  </>
                ) : (
                  text("free")
                )}{" "}
                → <Money value={s.cover} /> {text("cover")} ·{" "}
                <span
                  className={
                    s.status === "consider" ? "text-foreground font-medium" : ""
                  }
                >
                  {code("pstatus", s.status)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Step>

      <Step id="step2" title={text("step2")}>
        <ul className="space-y-3">
          {plan.units.map((u) => (
            <UnitRow
              key={u.unit_id}
              unit={u}
              names={names}
              coverLabel={coverLabel}
            />
          ))}
        </ul>
      </Step>

      <Step id="step3" title={text("step3")} lead={text("step3Lead")}>
        {plan.specs.length === 0 ? (
          <p className="text-sm">{text("noSpecs")}</p>
        ) : (
          <ul className="space-y-3">
            {plan.specs.map((s) => (
              <li
                key={s.unit_id}
                className="bg-card space-y-2 rounded-xl border p-4"
                data-spec={s.cover_type}
              >
                <p className="font-semibold">{code("spec", s.cover_type)}</p>
                <p className="text-sm">
                  {text("specAdd")}{" "}
                  <Money value={s.sum_insured} className="font-semibold" />
                  {s.term_until_age !== null && (
                    <>
                      {" "}
                      {text("until")}{" "}
                      <span data-fact className="tabular-nums">
                        {s.term_until_age}
                      </span>
                    </>
                  )}
                  {" · "}
                  {text("specFor")} {names(s.member_ids)}
                </p>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    {text("specMust")}
                  </p>
                  <ul className="list-disc space-y-0.5 pl-5 text-sm">
                    {s.must_have.map((f) => (
                      <li key={f}>
                        {code("feat", f)}
                        {f === "copay_max" && (
                          <>
                            :{" "}
                            <span data-fact>
                              {s.filter_values.copay_max_pct}
                            </span>
                          </>
                        )}
                        {f === "ped_wait_max" && (
                          <>
                            :{" "}
                            <span data-fact>
                              {s.filter_values.ped_wait_max_months}
                            </span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                {s.notes.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">
                      {text("notesTitle")}
                    </p>
                    <ul className="list-disc space-y-0.5 pl-5 text-sm">
                      {s.notes.map((n) => (
                        <li key={n}>{code("note", n)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button onClick={download} variant="outline" size="xl">
            <Download aria-hidden />
            {text("download")}
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="xl">
            <Printer aria-hidden />
            {text("print")}
          </Button>
          <Button onClick={onEdit} variant="ghost" size="xl">
            {text("editAgain")}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">{text("noAdvice")}</p>
      </Step>

      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">
          {text("assumptionsTitle")}
        </summary>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">
              {text("a_floater")}
            </dt>
            <dd>
              {text("city_metro")}{" "}
              <Money value={plan.rules_used.floater_base.metro} /> ·{" "}
              {text("city_tier2")}{" "}
              <Money value={plan.rules_used.floater_base.tier2} /> ·{" "}
              {text("city_tier3")}{" "}
              <Money value={plan.rules_used.floater_base.tier3} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">
              {text("a_senior")}
            </dt>
            <dd>
              {text("city_metro")}{" "}
              <Money value={plan.rules_used.senior_base.metro} /> ·{" "}
              {text("city_tier2")}{" "}
              <Money value={plan.rules_used.senior_base.tier2} /> ·{" "}
              {text("city_tier3")}{" "}
              <Money value={plan.rules_used.senior_base.tier3} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">{text("a_extra")}</dt>
            <dd>
              <Money value={plan.rules_used.extra_per_member_over_4} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">{text("a_years")}</dt>
            <dd>
              <span data-fact>{plan.rules_used.child_independence_age}</span>,{" "}
              {text("a_years_min")}{" "}
              <span data-fact>{plan.rules_used.min_years}</span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">{text("a_life")}</dt>
            <dd>
              <span data-fact>{plan.rules_used.life_income_multiple}</span>{" "}
              {text("a_life_suffix")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">
              {text("a_accident")}
            </dt>
            <dd>
              <span data-fact>{plan.rules_used.accident_income_multiple}</span>{" "}
              {text("a_accident_suffix")}
            </dd>
          </div>
        </dl>
      </details>
    </div>
  );
}

function UnitRow({
  unit,
  names,
  coverLabel,
}: {
  unit: CoverUnit;
  names: (ids: string[]) => string;
  coverLabel: (id: string) => string;
}) {
  const text = usePlanText();
  const code = usePlanCode();
  const statusClass =
    unit.status === "gap"
      ? "text-negative font-semibold"
      : unit.status === "covered"
        ? "text-positive font-semibold"
        : "text-muted-foreground";
  return (
    <li
      className="bg-card space-y-2 rounded-xl border p-4"
      data-unit={unit.unit_id}
      data-status={unit.status}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">
          {unit.priority !== null && (
            <span
              className="bg-primary text-primary-foreground mr-2 inline-grid size-6 place-items-center rounded-full text-xs"
              aria-label={`${text("priority")} ${unit.priority}`}
            >
              {unit.priority}
            </span>
          )}
          {code("unit", `${unit.kind}_${unit.label}`)}
        </p>
        <span className={`text-sm ${statusClass}`}>
          {code("status", unit.status)}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">{names(unit.member_ids)}</p>
      {unit.status !== "not_needed" && (
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">{text("need")}</dt>
            <dd>
              <Money
                value={unit.need}
                unknownLabel={code("status", "unknown")}
              />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">{text("have")}</dt>
            <dd>
              <Money value={unit.have} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">{text("gap")}</dt>
            <dd className={unit.status === "gap" ? "font-semibold" : ""}>
              <Money
                value={unit.gap}
                unknownLabel={code("status", "unknown")}
              />
            </dd>
          </div>
        </dl>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-medium">
          {text("why")}
        </summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
          {unit.rule_ids.map((r) => (
            <li key={r}>{code("rule", r)}</li>
          ))}
          {unit.have_items.map((h) => (
            <li key={h.source_id}>
              {coverLabel(h.source_id)}: <Money value={h.amount} /> ·{" "}
              {code("note", h.note)}
            </li>
          ))}
          {unit.missing.map((m) => (
            <li key={m}>
              {text("missingTitle")}: {code("missing", m)}
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}
