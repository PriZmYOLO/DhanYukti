"use client";

import { ShieldPlus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useConsentText } from "@/components/consent/consent-text";
import { ReceiptNote } from "@/components/consent/dpdp-purposes";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { Button } from "@/components/ui/button";
import {
  KINDS_BY_LICENCE,
  MEMBER_GROUPS,
  type CoverKind,
  type DetectedPolicy,
  type ExistingCover,
  type MemberGroup,
} from "@/lib/contracts/insurance-cover";
import { setDpdpConsent } from "@/lib/dpdp/client";
import type { LedgerEntry } from "@/lib/dpdp/notice";

/**
 * Private insurance premiums found in the member's own bank data, and who
 * each policy covers as the member tells us (DPDP consent
 * "insurance_tags"). Facts and the member's statements only: no product
 * recommendation, no referral.
 */
export function ExistingCoverSection({
  linkId,
  cover,
  pmsbySeen,
  onChanged,
}: {
  linkId: string;
  cover: ExistingCover;
  pmsbySeen: boolean;
  onChanged: () => void;
}) {
  const { text } = useConsentText();
  const [receipt, setReceipt] = useState<LedgerEntry | null>(null);
  const [granting, setGranting] = useState(false);
  const { policies, summary } = cover;

  async function allow() {
    setGranting(true);
    try {
      const result = await setDpdpConsent("insurance_tags", "grant");
      setReceipt(result.receipt);
      onChanged();
    } finally {
      setGranting(false);
    }
  }

  if (policies.length === 0) {
    return (
      <p className="text-muted-foreground" data-existing-cover="none">
        {text("coverNone")}
      </p>
    );
  }

  return (
    <section
      aria-labelledby={`cover-${linkId}`}
      className="space-y-3 rounded-lg border p-3"
      data-existing-cover={policies.length}
    >
      <div className="space-y-1">
        <h5
          id={`cover-${linkId}`}
          className="flex items-center gap-2 font-semibold"
        >
          <ShieldPlus aria-hidden className="text-primary size-4" />
          {text("coverHeading")}
        </h5>
        <p className="text-muted-foreground text-xs">{text("coverLead")}</p>
        {summary.yearly_premiums_total && (
          <p>
            {text("coverTotalLead")}{" "}
            <Money
              value={summary.yearly_premiums_total}
              className="font-semibold"
            />{" "}
            {text("schemePerYear")} {text("coverAcross")}{" "}
            <span data-fact className="tabular-nums">
              {policies.length}
            </span>{" "}
            {text("coverPolicies")}
          </p>
        )}
      </div>

      {receipt && <ReceiptNote entry={receipt} />}

      {!cover.tagging_allowed && (
        <div className="bg-primary/5 border-primary/30 space-y-2 rounded-lg border p-3">
          <p className="font-semibold">{text("coverAllowTitle")}</p>
          <p className="text-xs">{text("coverAllowBody")}</p>
          <Button size="xl" onClick={allow} disabled={granting}>
            {text("coverAllow")}
          </Button>
        </div>
      )}

      <ul className="divide-y rounded-lg border px-3">
        {policies.map((policy) => (
          <PolicyRow
            key={policy.policy_key}
            linkId={linkId}
            policy={policy}
            canTag={cover.tagging_allowed}
            onSaved={onChanged}
          />
        ))}
      </ul>

      {summary.policies_tagged > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm" data-cover-summary>
          <li>
            {text("coverSummaryHealth")}{" "}
            {summary.health_groups.length
              ? summary.health_groups.map((g) => text(`member_${g}`)).join(", ")
              : text("coverNotTold")}
          </li>
          <li>
            {text(
              summary.life_for_self === "yes"
                ? "coverSummaryLifeYes"
                : "coverSummaryLifeNo",
            )}
          </li>
          {summary.motor && !pmsbySeen && (
            <li>{text("coverSummaryMotorOnly")}</li>
          )}
        </ul>
      )}
      <p className="text-muted-foreground text-xs">{text("coverNoAdvice")}</p>
    </section>
  );
}

function PolicyRow({
  linkId,
  policy,
  canTag,
  onSaved,
}: {
  linkId: string;
  policy: DetectedPolicy;
  canTag: boolean;
  onSaved: () => void;
}) {
  const { text } = useConsentText();
  const kinds = KINDS_BY_LICENCE[policy.licence];
  const [editing, setEditing] = useState(false);
  const [covers, setCovers] = useState<MemberGroup[]>(
    policy.tags?.covers ?? [],
  );
  const [kind, setKind] = useState<CoverKind>(
    policy.tags?.kind ?? (policy.licence === "life" ? "life" : "health"),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!covers.length) {
      setError(text("coverTagInvalid"));
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch(
      `/api/aa/links/${encodeURIComponent(linkId)}/policies/${encodeURIComponent(policy.policy_key)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ covers, kind }),
      },
    ).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as {
        error?: { safe_message?: string };
      } | null;
      setError(body?.error?.safe_message ?? text("coverTagInvalid"));
      return;
    }
    setEditing(false);
    onSaved();
  }

  const fieldId = `${linkId}-${policy.policy_key}`;

  return (
    <li className="space-y-2 py-3" data-policy={policy.policy_key}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{policy.insurer}</p>
        <span className="text-muted-foreground text-xs">
          {text(`licence_${policy.licence}`)}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">{text("coverLastPaid")}</dt>
          <dd>
            <Money value={policy.last_paid.amount} /> ·{" "}
            <DateDisplay value={policy.last_paid.date} format="short" /> ·{" "}
            {text(`frequency_${policy.frequency}`)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{text("coverYearly")}</dt>
          <dd>
            <Money value={policy.yearly_premium} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{text("coverWho")}</dt>
          <dd data-policy-tags={policy.tags ? "told" : "not_told"}>
            {policy.tags ? (
              <>
                {policy.tags.covers.map((g) => text(`member_${g}`)).join(", ")}{" "}
                · {text(`kind_${policy.tags.kind}`)}
              </>
            ) : (
              <span className="italic">{text("coverNotTold")}</span>
            )}
          </dd>
        </div>
      </dl>

      {canTag && !editing && (
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          {policy.tags ? text("coverEdit") : text("coverWho")}
        </Button>
      )}

      {canTag && editing && (
        <form
          onSubmit={save}
          className="space-y-2 rounded-lg border p-3"
          noValidate
        >
          <fieldset className="space-y-1">
            <legend className="text-xs font-medium">{text("coverWho")}</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {MEMBER_GROUPS.map((group) => (
                <label
                  key={group}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={covers.includes(group)}
                    onChange={(e) =>
                      setCovers((current) =>
                        e.target.checked
                          ? [...current, group]
                          : current.filter((g) => g !== group),
                      )
                    }
                  />
                  {text(`member_${group}`)}
                </label>
              ))}
            </div>
          </fieldset>
          {kinds.length > 1 && (
            <div className="space-y-1">
              <label
                htmlFor={`${fieldId}-kind`}
                className="text-xs font-medium"
              >
                {text("coverKind")}
              </label>
              <select
                id={`${fieldId}-kind`}
                value={kind}
                onChange={(e) => setKind(e.target.value as CoverKind)}
                className="bg-background block h-9 rounded-md border px-2 text-sm"
              >
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {text(`kind_${k}`)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && (
            <p role="alert" className="text-negative text-xs">
              {error}
            </p>
          )}
          <Button type="submit" size="sm" disabled={busy}>
            {text("coverSave")}
          </Button>
        </form>
      )}
    </li>
  );
}
