"use client";

import { ArrowLeft, Eye, Hourglass, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import {
  RecalculatingNotice,
  usePictureStatus,
} from "@/components/correction/picture-status";
import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { DisplayModeToggle } from "@/components/onboarding/display-mode-toggle";
import { FixtureNotice } from "@/components/shell/fixture-notice";
import { buttonVariants } from "@/components/ui/button";
import { CashStepChart } from "@/components/what-if/cash-step-chart";
import { GoalGap } from "@/components/what-if/goal-gap";
import { KeyFigures } from "@/components/what-if/key-figures";
import { PlanDates } from "@/components/what-if/plan-dates";
import { useWhatIfText } from "@/components/what-if/what-if-text";
import {
  scenarioPort,
  type PlanDatesRelease,
  type ScenarioChange,
  type ScenarioPreset,
  type ScenarioPresetId,
  type ScenarioRelease,
} from "@/lib/provisional/h08";
import type { WhatIfCopyKey } from "@/lib/what-if/copy";
import { readableSeries, sameBasis } from "@/lib/what-if/compare";
import { cn } from "@/lib/utils";

type Choice = "emergency" | "purchase" | "asset" | "provider";
type Payment = "cash" | "loan";

/** The bounded inputs map onto exactly one preset. */
function presetFor(
  choice: Choice,
  feeDelay: boolean,
  payment: Payment,
): ScenarioPresetId {
  switch (choice) {
    case "emergency":
      return feeDelay ? "emergency_fee_delay" : "emergency";
    case "purchase":
      return payment === "cash" ? "cash_purchase" : "loan_purchase";
    case "asset":
      return "hidden_asset";
    case "provider":
      return "no_provider";
  }
}

type Loaded<T> = { status: "ready"; value: T } | { status: "failed" } | null;

/** Loads once per key; a failed load stays failed rather than guessing. */
function usePortValue<T>(key: string, load: () => Promise<T>): Loaded<T> {
  const [state, setState] = useState<{ key: string; value: Loaded<T> }>({
    key,
    value: null,
  });
  useEffect(() => {
    let cancelled = false;
    load().then(
      (value) => {
        if (!cancelled) setState({ key, value: { status: "ready", value } });
      },
      () => {
        if (!cancelled) setState({ key, value: { status: "failed" } });
      },
    );
    return () => {
      cancelled = true;
    };
    // `load` is keyed by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // Never show a result loaded for a different choice.
  return state.key === key ? state.value : null;
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

function Chip({
  name,
  checked,
  onChange,
  type = "radio",
  children,
}: {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  type?: "radio" | "checkbox";
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "bg-card relative flex min-h-11 cursor-pointer flex-col justify-center rounded-lg border px-3 py-2 text-sm transition-colors",
        "hover:border-foreground/40 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
        checked && "border-primary bg-mint-surface ring-primary ring-1",
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        // Transparent, covering the chip: the real control takes the click.
        className="absolute inset-0 size-full cursor-pointer appearance-none rounded-lg opacity-0"
      />
      {children}
    </label>
  );
}

function PresetDetail({ preset }: { preset: ScenarioPreset | undefined }) {
  const text = useWhatIfText();
  if (!preset?.amount) return null;
  return (
    <span className="text-muted-foreground text-xs">
      <Money value={preset.amount} />
      {preset.on && (
        <>
          {" "}
          {text("on")} <DateDisplay value={preset.on} format="short" />
        </>
      )}
    </span>
  );
}

function ScenarioInputs({
  presets,
  choice,
  feeDelay,
  payment,
  onChoice,
  onFeeDelay,
  onPayment,
}: {
  presets: ScenarioPreset[];
  choice: Choice;
  feeDelay: boolean;
  payment: Payment;
  onChoice: (choice: Choice) => void;
  onFeeDelay: (on: boolean) => void;
  onPayment: (payment: Payment) => void;
}) {
  const text = useWhatIfText();
  const preset = (id: ScenarioPresetId) =>
    presets.find((item) => item.preset_id === id);
  const choices: { id: Choice; label: WhatIfCopyKey; detail: ReactNode }[] = [
    {
      id: "emergency",
      label: "choice_emergency",
      detail: <PresetDetail preset={preset("emergency")} />,
    },
    {
      id: "purchase",
      label: "choice_purchase",
      detail: <PresetDetail preset={preset("cash_purchase")} />,
    },
    {
      id: "asset",
      label: "choice_asset",
      detail: (
        <span className="text-muted-foreground text-xs">
          {text("choice_asset_detail")}
        </span>
      ),
    },
    {
      id: "provider",
      label: "choice_provider",
      detail: (
        <span className="text-muted-foreground text-xs">
          {text("choice_provider_detail")}
        </span>
      ),
    },
  ];
  const feePreset = preset("emergency_fee_delay");

  return (
    <section aria-labelledby="try-heading" className="space-y-4">
      <h2 id="try-heading" className="font-heading text-2xl tracking-tight">
        {text("tryHeading")}
      </h2>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">
          {text("changeLegend")}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {choices.map((item) => (
            <Chip
              key={item.id}
              name="what-if-change"
              checked={choice === item.id}
              onChange={() => onChoice(item.id)}
            >
              <span className="font-medium">{text(item.label)}</span>
              {item.detail}
            </Chip>
          ))}
        </div>
      </fieldset>

      {choice === "emergency" && feePreset && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">
            {text("responseLegend")}
          </legend>
          <Chip
            type="checkbox"
            name="what-if-fee-delay"
            checked={feeDelay}
            onChange={onFeeDelay}
          >
            <span className="font-medium">
              {text("feeDelayOption")}
              {feePreset.on && (
                <>
                  {" "}
                  (<DateDisplay value={feePreset.on} format="short" />)
                </>
              )}
            </span>
            <span className="text-muted-foreground text-xs">
              {text("feeDelayNote")}
            </span>
          </Chip>
        </fieldset>
      )}

      {choice === "purchase" && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">
            {text("paymentLegend")}
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
            {(["cash", "loan"] as const).map((option) => (
              <Chip
                key={option}
                name="what-if-payment"
                checked={payment === option}
                onChange={() => onPayment(option)}
              >
                <span className="font-medium">
                  {text(option === "cash" ? "payCash" : "payLoan")}
                </span>
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      <p className="text-muted-foreground text-xs">{text("presetNote")}</p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Result                                                              */
/* ------------------------------------------------------------------ */

function ChangeLine({ change }: { change: ScenarioChange }) {
  const text = useWhatIfText();
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-medium">{change.label}</span>
      {change.amount && <Money value={change.amount} />}
      {change.direction === "moved" && change.moved_from ? (
        <span className="text-muted-foreground">
          {text("movedFrom")} <DateDisplay value={change.moved_from} />{" "}
          {text("movedTo")} <DateDisplay value={change.on} />
        </span>
      ) : (
        change.on && (
          <span className="text-muted-foreground">
            {text("on")} <DateDisplay value={change.on} />
          </span>
        )
      )}
      {change.certainty === "conditional" && (
        <span className="border-warning/60 bg-warning/15 text-warning-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium">
          <Hourglass aria-hidden className="size-3" />
          {text("conditionalBadge")}
        </span>
      )}
    </li>
  );
}

function Verdict({ release }: { release: ScenarioRelease }) {
  const text = useWhatIfText();

  if (release.status === "pending") {
    return (
      <div data-verdict="pending">
        <AvailabilityState
          status="pending"
          title={text(release.loan ? "loanTitle" : "pendingTitle")}
          description={release.error ? undefined : release.reason}
          error={release.error ?? undefined}
        />
      </div>
    );
  }

  if (release.status === "no_feasible_option") {
    return (
      <div
        data-verdict="no_feasible_option"
        className="border-warning/50 bg-warning/15 text-warning-foreground flex gap-3 rounded-lg border p-4 text-sm"
      >
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">{text("noFeasibleTitle")}</p>
          <p>{release.finding}</p>
          <p>{text("noFeasibleBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <p
      data-verdict="feasible"
      className="border-primary/40 text-foreground/85 border-l-2 pl-3 text-[1.0625rem] leading-relaxed"
    >
      {release.finding}
    </p>
  );
}

function ScenarioResult({
  baseline,
  release,
}: {
  baseline: ScenarioRelease;
  release: ScenarioRelease;
}) {
  const text = useWhatIfText();

  if (baseline.status === "pending" || !readableSeries(baseline.cash_flow)) {
    return (
      <AvailabilityState
        status="unavailable"
        title={text("unreadableTitle")}
        description={
          baseline.status === "pending" ? baseline.reason : undefined
        }
      />
    );
  }
  if (!sameBasis(baseline, release)) {
    return (
      <AvailabilityState
        status="unavailable"
        title={text("cantCompareTitle")}
        description={text("cantCompareBody")}
      />
    );
  }
  const scenarioCash =
    release.status === "pending"
      ? null
      : readableSeries(release.cash_flow)
        ? release.cash_flow
        : undefined;
  if (scenarioCash === undefined) {
    return (
      <AvailabilityState status="unavailable" title={text("unreadableTitle")} />
    );
  }

  return (
    <div className="space-y-6" data-scenario={release.preset_id}>
      <div aria-live="polite" className="space-y-4">
        <Verdict release={release} />

        {release.changes.length > 0 && (
          <div className="space-y-1.5 text-sm">
            <p className="text-muted-foreground text-xs">
              {text("appliedHeading")}
            </p>
            <ul className="space-y-1.5">
              {release.changes.map((change) => (
                <ChangeLine key={change.label} change={change} />
              ))}
            </ul>
          </div>
        )}

        {release.status === "pending" && release.loan && (
          <div data-loan className="space-y-2 rounded-lg border p-4 text-sm">
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">
                {text("loanBorrowed")}
              </span>
              <Money value={release.loan.borrowed} />
            </p>
            <p className="font-medium">{text("loanMissing")}</p>
            <ul className="list-disc space-y-1 pl-5">
              {release.loan.missing_terms.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">
              {text("loanNoTotal")}
            </p>
          </div>
        )}

        {release.status !== "pending" && release.residual_shortfall && (
          <p
            data-residual
            className="flex flex-wrap items-baseline gap-x-2 border-y py-3"
          >
            <span className="text-muted-foreground text-sm">
              {text("residualLabel")} (
              <DateDisplay value={release.residual_shortfall.before} />)
            </span>
            <Money
              value={release.residual_shortfall.amount}
              className="text-[1.375rem]"
            />
          </p>
        )}
      </div>

      <CashStepChart baseline={baseline.cash_flow} scenario={scenarioCash} />

      <KeyFigures
        baseline={baseline.cash_flow}
        scenario={scenarioCash ?? "pending"}
      />

      {release.status !== "pending" && release.assumptions.length > 0 && (
        <details className="text-sm">
          <summary className="focus-ring text-muted-foreground inline-flex min-h-11 cursor-pointer items-center rounded">
            {text("assumptionsHeading")}
          </summary>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5">
            {release.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Failed() {
  const text = useWhatIfText();
  return (
    <AvailabilityState
      status="failed"
      title={text("loadFailedTitle")}
      description={text("loadFailedBody")}
    />
  );
}

function Loading() {
  const text = useWhatIfText();
  return (
    <p role="status" className="text-muted-foreground">
      {text("loading")}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

function WhatIfContent() {
  const text = useWhatIfText();
  const [choice, setChoice] = useState<Choice>("emergency");
  const [feeDelay, setFeeDelay] = useState(false);
  const [payment, setPayment] = useState<Payment>("cash");
  const presetId = presetFor(choice, feeDelay, payment);

  const presets = usePortValue("presets", () => scenarioPort.listPresets());
  const baseline = usePortValue("baseline", () => scenarioPort.getBaseline());
  const release = usePortValue(presetId, () => scenarioPort.preview(presetId));
  const dates = usePortValue<PlanDatesRelease>("dates", () =>
    scenarioPort.getPlanDates(),
  );
  const goal = usePortValue("goal", () => scenarioPort.preview("goal_funding"));

  return (
    <div className="grid gap-12 xl:grid-cols-[minmax(0,680px)_minmax(0,1fr)] xl:gap-x-16">
      <div className="min-w-0 space-y-8">
        {presets?.status === "failed" ? (
          <Failed />
        ) : presets ? (
          <ScenarioInputs
            presets={presets.value}
            choice={choice}
            feeDelay={feeDelay}
            payment={payment}
            onChoice={setChoice}
            onFeeDelay={setFeeDelay}
            onPayment={setPayment}
          />
        ) : (
          <Loading />
        )}

        <section aria-labelledby="result-heading" className="space-y-4">
          <div className="space-y-1">
            <h2
              id="result-heading"
              className="font-heading text-2xl tracking-tight"
            >
              {text("resultHeading")}
            </h2>
            {baseline?.status === "ready" && (
              <p className="text-muted-foreground text-xs">
                {text("sameBasis")}{" "}
                <DateDisplay value={baseline.value.horizon.start} />{" "}
                {text("to")} <DateDisplay value={baseline.value.horizon.end} />.
              </p>
            )}
          </div>
          {baseline?.status === "failed" || release?.status === "failed" ? (
            <Failed />
          ) : baseline && release ? (
            <ScenarioResult baseline={baseline.value} release={release.value} />
          ) : (
            <Loading />
          )}
        </section>
      </div>

      <div className="min-w-0 space-y-10">
        {dates?.status === "failed" ? (
          <Failed />
        ) : dates ? (
          <PlanDates release={dates.value} />
        ) : (
          <Loading />
        )}
        {goal?.status === "failed" ? (
          <Failed />
        ) : goal ? (
          <GoalGap release={goal.value} />
        ) : (
          <Loading />
        )}
      </div>
    </div>
  );
}

/**
 * The What-if screen (Task Packs L06 + L07). Every figure is a released
 * scenario result from ScenarioPort; nothing is calculated here and nothing
 * changes the live plan. While the household picture is being recalculated
 * (L05), no figure is loaded or shown.
 */
export function WhatIfScreen() {
  const text = useWhatIfText();
  const picture = usePictureStatus();

  return (
    <div className="space-y-6">
      <div className="max-w-2xl space-y-6">
        <FixtureNotice
          label={text("demoLabel")}
          description={text("demoBody")}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/plan"
            className={cn(
              buttonVariants({ variant: "ghost", size: "xl" }),
              "-ml-3",
            )}
          >
            <ArrowLeft aria-hidden />
            {text("backToPlan")}
          </Link>
          <DisplayModeToggle />
        </div>
        <header className="space-y-2">
          <h1 className="font-heading text-3xl tracking-tight text-balance sm:text-4xl">
            {text("title")}
          </h1>
          <p className="text-muted-foreground text-pretty">{text("intro")}</p>
        </header>
        <div
          role="note"
          aria-labelledby="preview-banner-title"
          data-preview-banner
          className="border-mint-border bg-mint-surface flex gap-3 rounded-lg border p-3 text-sm"
        >
          <Eye aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
          <div className="space-y-0.5">
            <p id="preview-banner-title" className="font-semibold">
              {text("bannerTitle")}
            </p>
            <p className="text-muted-foreground">{text("bannerBody")}</p>
          </div>
        </div>
      </div>

      {picture === null ? (
        <Loading />
      ) : picture.status === "recalculating" ? (
        <div className="max-w-2xl" data-what-if-gated>
          <RecalculatingNotice />
        </div>
      ) : (
        <WhatIfContent />
      )}
    </div>
  );
}
