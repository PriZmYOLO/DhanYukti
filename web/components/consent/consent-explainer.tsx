"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { useConsentText } from "@/components/consent/consent-text";
import { PrivacyFrame } from "@/components/consent/privacy-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  consentPort,
  DEFAULT_CHOICES,
  type ConsentChoices,
  type ConsentRequestTerms,
  type ViewerScope,
} from "@/lib/provisional/h03";
import { cn } from "@/lib/utils";

import type { ReturnTo } from "@/lib/consent/return-to";

const cardClass =
  "bg-card has-focus-visible:outline-ring space-y-1 rounded-xl border p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2";

function TermsList({ terms }: { terms: ConsentRequestTerms }) {
  const { text, codeText } = useConsentText();

  const rows: { term: string; value: ReactNode }[] = [
    {
      term: text("termWho"),
      value: (
        <>
          {text("termWhoValue")}
          <span className="text-muted-foreground block text-sm">
            {text("termPartner")}:{" "}
            {terms.partner_name ?? (
              <span className="italic">{text("partnerNotNamed")}</span>
            )}
          </span>
        </>
      ),
    },
    {
      term: text("termWhat"),
      value: (
        <>
          {codeText("data", terms.data_kind)}, {text("historyLead")}{" "}
          <span data-fact className="tabular-nums">
            {terms.history_months}
          </span>{" "}
          {text("months")}
        </>
      ),
    },
    {
      term: text("termWhy"),
      value: terms.purposes
        .map((purpose) => codeText("purpose", purpose))
        .join(" · "),
    },
    {
      term: text("termHowOften"),
      value: codeText("frequency", terms.fetch_frequency),
    },
    {
      term: text("termKept"),
      value: codeText("retention", terms.retention),
    },
    {
      term: text("termLasts"),
      value: (
        <>
          <span data-fact className="tabular-nums">
            {terms.consent_months}
          </span>{" "}
          {text("months")}
        </>
      ),
    },
    { term: text("termRevoke"), value: text("termRevokeBody") },
  ];

  return (
    <dl className="bg-card divide-y rounded-xl border">
      {rows.map(({ term, value }) => (
        <div
          key={term}
          className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4"
        >
          <dt className="text-muted-foreground text-sm">{term}</dt>
          <dd className="text-pretty">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface CheckChoiceProps {
  id: string;
  title: string;
  body: string;
  badge: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  invalid?: boolean;
  errorId?: string;
}

function CheckChoice({
  id,
  title,
  body,
  badge,
  checked,
  onChange,
  invalid = false,
  errorId,
}: CheckChoiceProps) {
  return (
    // The label stretches over the whole card: one hit target, no dead zones,
    // while the accessible name stays the short title.
    <div
      className={cn(
        cardClass,
        "has-checked:border-primary has-checked:bg-primary/5 relative",
        invalid && "border-destructive",
      )}
    >
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={cn(`${id}-body`, invalid && errorId) || undefined}
          aria-invalid={invalid || undefined}
          className="accent-primary relative z-10 mt-1 size-5 shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <label
              htmlFor={id}
              className="cursor-pointer font-medium after:absolute after:inset-0 after:rounded-xl"
            >
              {title}
            </label>
            <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
              {badge}
            </span>
          </div>
          <p id={`${id}-body`} className="text-muted-foreground text-sm">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

function ViewerChoice({
  value,
  onChange,
}: {
  value: ViewerScope;
  onChange: (value: ViewerScope) => void;
}) {
  const { text } = useConsentText();
  const options: ViewerScope[] = ["only_me", "household_adults"];

  return (
    <fieldset className={cardClass} aria-describedby="grant-viewer-body">
      <legend className="float-left flex w-full flex-wrap items-center gap-x-2 gap-y-1 font-medium">
        {text("grant_viewer")}
        <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-xs font-normal">
          {text("optional")}
        </span>
      </legend>
      <p id="grant-viewer-body" className="text-muted-foreground text-sm">
        {text("grant_viewer_body")}
      </p>
      <div className="grid gap-2 pt-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            htmlFor={`viewer-${option}`}
            className="has-checked:border-primary has-checked:bg-primary/5 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm"
          >
            <input
              id={`viewer-${option}`}
              type="radio"
              name="viewer-scope"
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="accent-primary size-4"
            />
            {text(`viewer_${option}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ConsentForm({ returnTo }: { returnTo: ReturnTo }) {
  const { text } = useConsentText();
  const router = useRouter();
  const [terms, setTerms] = useState<ConsentRequestTerms | null>(null);
  const [choices, setChoices] = useState<ConsentChoices>(DEFAULT_CHOICES);
  const [showError, setShowError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    consentPort.getRequestTerms().then((loaded) => {
      if (!cancelled) setTerms(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function set<K extends keyof ConsentChoices>(
    key: K,
    value: ConsentChoices[K],
  ) {
    setChoices((current) => ({ ...current, [key]: value }));
    if (key === "source_access" && value) setShowError(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!choices.source_access) {
      setShowError(true);
      document.getElementById("grant-source-access")?.focus();
      return;
    }
    setBusy(true);
    const result = await consentPort.requestConsent(choices);
    if (!result.ok) {
      setBusy(false);
      setShowError(true);
      return;
    }
    const query = returnTo ? `?from=${returnTo}` : "";
    router.push(`/privacy/connect/${result.link.link_id}${query}`);
  }

  if (!terms) {
    return (
      <p role="status" className="text-muted-foreground">
        {text("loading")}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="terms-heading" className="space-y-3">
        <h2 id="terms-heading" className="text-lg font-semibold">
          {text("termsHeading")}
        </h2>
        <TermsList terms={terms} />
        {terms.is_provisional && (
          <p className="text-muted-foreground text-sm">
            {text("termsProvisional")}
          </p>
        )}
      </section>

      <form
        onSubmit={submit}
        noValidate
        aria-labelledby="choices-heading"
        className="space-y-4"
      >
        <div className="space-y-1">
          <h2 id="choices-heading" className="text-lg font-semibold">
            {text("choicesFormHeading")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {text("choicesFormLead")}
          </p>
        </div>

        <CheckChoice
          id="grant-source-access"
          title={text("grant_source_access")}
          body={text("grant_source_access_body")}
          badge={text("required")}
          checked={choices.source_access}
          onChange={(value) => set("source_access", value)}
          invalid={showError}
          errorId="source-error"
        />
        <CheckChoice
          id="grant-household-computation"
          title={text("grant_household_computation")}
          body={text("grant_household_computation_body")}
          badge={text("optional")}
          checked={choices.household_computation}
          onChange={(value) => set("household_computation", value)}
        />
        <ViewerChoice
          value={choices.viewer_scope}
          onChange={(value) => set("viewer_scope", value)}
        />
        <CheckChoice
          id="grant-alerts-and-actions"
          title={text("grant_alerts_and_actions")}
          body={text("grant_alerts_and_actions_body")}
          badge={text("optional")}
          checked={choices.alerts_and_actions}
          onChange={(value) => set("alerts_and_actions", value)}
        />

        {showError && (
          <p
            id="source-error"
            role="alert"
            className="text-negative text-sm font-medium"
          >
            {text("sourceRequiredError")}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" size="xl" disabled={busy}>
            {text("continueToApproval")}
          </Button>
          <Link
            href={returnTo === "setup" ? "/setup/money" : "/privacy"}
            className={buttonVariants({ variant: "outline", size: "xl" })}
          >
            {text("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}

export function ConsentExplainer({ returnTo }: { returnTo: ReturnTo }) {
  const { text } = useConsentText();

  return (
    <PrivacyFrame
      title={text("connectTitle")}
      intro={text("connectIntro")}
      back
    >
      <ConsentForm returnTo={returnTo} />
    </PrivacyFrame>
  );
}
