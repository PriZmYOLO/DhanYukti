"use client";

import { Landmark, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { useConsentText } from "@/components/consent/consent-text";
import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { SourceBadge } from "@/components/finance/source-badge";
import { ExistingCoverSection } from "@/components/consent/existing-cover";
import type {
  SchemeCheckResult,
  SchemeFinding,
} from "@/lib/contracts/scheme-check";

type Ready = Extract<SchemeCheckResult, { status: "ready" }>;

/**
 * Job 2a: government insurance (PMJJBY + PMSBY) check on a live link's
 * Account Aggregator data. The server decides; this only displays. Shown
 * before any private insurance idea, and DhanYukti earns nothing from it.
 */
export function SchemeCheckCard({
  linkId,
  isSandbox,
}: {
  linkId: string;
  isSandbox: boolean;
}) {
  const { text } = useConsentText();
  const [result, setResult] = useState<SchemeCheckResult | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/aa/links/${encodeURIComponent(linkId)}/scheme-check`, {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as {
          check?: SchemeCheckResult;
        } | null;
        if (cancelled) return;
        setResult(
          response.ok && body?.check
            ? body.check
            : {
                status: "unavailable",
                safe_message: text("schemeUnavailable"),
              },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setResult({
            status: "unavailable",
            safe_message: text("schemeUnavailable"),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [linkId, text, version]);

  if (!result || result.status === "no_data") return null;

  return (
    <section
      aria-labelledby={`scheme-${linkId}`}
      data-scheme-check={result.status}
      className="space-y-3 rounded-lg border p-3 sm:p-4"
    >
      <h4
        id={`scheme-${linkId}`}
        className="flex items-center gap-2 text-sm font-semibold"
      >
        <Landmark aria-hidden className="text-primary size-4" />
        {text("schemeHeading")}
      </h4>
      {result.status === "not_allowed" ? (
        <AvailabilityState
          status="not_shared"
          title={text("schemeNotAllowedTitle")}
          description={text("schemeNotAllowedBody")}
        />
      ) : result.status === "unavailable" ? (
        <AvailabilityState status="unavailable" title={result.safe_message} />
      ) : (
        <ReadyView
          result={result}
          isSandbox={isSandbox}
          linkId={linkId}
          onChanged={() => setVersion((v) => v + 1)}
        />
      )}
    </section>
  );
}

function ReadyView({
  result,
  isSandbox,
  linkId,
  onChanged,
}: {
  result: Ready;
  isSandbox: boolean;
  linkId: string;
  onChanged: () => void;
}) {
  const { text } = useConsentText();
  const hasPrivate = (result.existing_cover?.policies.length ?? 0) > 0;
  const seen = result.findings.filter((f) => f.status === "premium_seen");
  const allUnknown = result.findings.every((f) => f.status === "unknown");

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">{text("schemeLead")}</p>

      {result.existing_cover && (
        <ExistingCoverSection
          linkId={linkId}
          cover={result.existing_cover}
          pmsbySeen={result.findings.some(
            (f) => f.scheme === "pmsby" && f.status === "premium_seen",
          )}
          onChanged={onChanged}
        />
      )}

      {result.suggest.length > 0 && (
        <div className="bg-primary/5 border-primary/30 space-y-2 rounded-lg border p-3">
          <p className="font-semibold">
            {text(hasPrivate ? "schemeTopUpTitle" : "schemeSuggestTitle")}
          </p>
          <p>
            {text("schemeSuggestTotalLead")}{" "}
            <Money
              value={result.suggest_total_premium}
              className="font-semibold"
            />{" "}
            {text("schemePerYear")} {text("schemeSuggestFor")}{" "}
            <Money
              value={result.suggest_total_cover}
              className="font-semibold"
            />{" "}
            {text("schemeSuggestCover")}
          </p>
          <p>{text("schemeSuggestHow")}</p>
          <p className="text-muted-foreground text-xs">
            {text("schemeOtherAccount")}
          </p>
          {result.holder_age === null && (
            <p className="text-muted-foreground text-xs">
              {text("schemeAgeUnknown")}
            </p>
          )}
        </div>
      )}

      {seen.length > 0 && (
        <div className="space-y-1 rounded-lg border p-3">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck aria-hidden className="text-positive size-4" />
            {text("schemeRenewalTitle")}
          </p>
          <p>
            {text("schemeRenewalLead")}{" "}
            <Money
              value={{
                amount_paise: seen.reduce(
                  (sum, f) => sum + f.annual_premium.amount_paise,
                  0,
                ),
                currency: "INR",
              }}
              className="font-semibold"
            />{" "}
            {text("schemeRenewalBy")}{" "}
            <DateDisplay value={result.next_renewal_by} />.
          </p>
          <p className="text-muted-foreground text-xs">
            {text("schemeRenewalWhy")}
          </p>
        </div>
      )}

      {allUnknown && (
        <AvailabilityState
          status="missing"
          title={text("schemeStatus_unknown")}
          description={text("schemeUnknownBody")}
        />
      )}

      <ul className="divide-y rounded-lg border px-3">
        {result.findings.map((finding) => (
          <FindingRow key={finding.scheme} finding={finding} />
        ))}
      </ul>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <SourceBadge
          kind="observed"
          sourceLabel={text(
            isSandbox ? "sourceAnumatiSandbox" : "sourceAnumati",
          )}
        />
        {result.data_from && result.data_to && (
          <span>
            {text("schemeChecked")} <DateDisplay value={result.data_from} />{" "}
            {text("accountTo")} <DateDisplay value={result.data_to} />
            {result.renewal_window_checked && (
              <>
                , {text("schemeWindow")}{" "}
                <DateDisplay
                  value={result.renewal_window_checked.from}
                  format="short"
                />
                –
                <DateDisplay value={result.renewal_window_checked.to} />
              </>
            )}
            .
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-xs">{text("schemeOfficial")}</p>
    </div>
  );
}

function FindingRow({ finding }: { finding: SchemeFinding }) {
  const { text } = useConsentText();
  return (
    <li className="space-y-1.5 py-3" data-scheme={finding.scheme}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{text(`scheme_${finding.scheme}`)}</p>
        <span
          className={
            finding.status === "premium_seen"
              ? "text-positive text-xs font-medium"
              : "text-muted-foreground text-xs"
          }
        >
          {text(`schemeStatus_${finding.status}`)}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{text("schemeCover")}</dt>
          <dd>
            <Money value={finding.cover} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{text("schemePremium")}</dt>
          <dd>
            <Money value={finding.annual_premium} /> {text("schemePerYear")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{text("schemeJoinAge")}</dt>
          <dd className="tabular-nums" data-fact>
            {finding.join_age[0]}–{finding.join_age[1]}
          </dd>
        </div>
        {finding.evidence && (
          <div>
            <dt className="text-muted-foreground">{text("schemeSeenOn")}</dt>
            <dd>
              <DateDisplay value={finding.evidence.date} />
              {" · "}
              <Money value={finding.evidence.amount} />
            </dd>
          </div>
        )}
      </dl>
    </li>
  );
}
