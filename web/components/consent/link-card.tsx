"use client";

import { CircleCheck } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { SourceBadge } from "@/components/finance/source-badge";
import { useConsentText } from "@/components/consent/consent-text";
import { Button } from "@/components/ui/button";
import {
  LINK_STATE_INFO,
  linkState,
  type LinkState,
} from "@/lib/consent/status";
import type { ConsentCopyKey } from "@/lib/consent/copy";
import type { ImportedAccount, SourceLink } from "@/lib/provisional/h03";
import { cn } from "@/lib/utils";

/** The state line of a link: AvailabilityState, or a calm "Active" row. */
export function LinkStateNote({
  link,
  state,
  live = false,
}: {
  link: SourceLink;
  state: LinkState;
  live?: boolean;
}) {
  const { text } = useConsentText();
  const info = LINK_STATE_INFO[state];

  if (info.availability === null) {
    return (
      <div
        role={live ? "status" : undefined}
        className="border-mint-border bg-mint-surface flex gap-3 rounded-lg border p-3 text-sm"
      >
        <CircleCheck aria-hidden className="text-positive mt-0.5 size-4" />
        <div className="space-y-1">
          <p className="font-medium">{text(`state_${state}`)}</p>
          <p>{text(`state_${state}_body`)}</p>
        </div>
      </div>
    );
  }

  return (
    <AvailabilityState
      status={info.availability}
      title={text(`state_${state}`)}
      description={text(`state_${state}_body`)}
      live={live}
    >
      {state === "revoked" && link.is_demo && (
        <p className="text-xs">{text("revokeDemoNote")}</p>
      )}
    </AvailabilityState>
  );
}

function Detail({
  term,
  wide = false,
  children,
}: {
  term: string;
  /** Takes the full row on phones (long text, or a timestamp that can't wrap). */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("min-w-0 space-y-0.5", wide && "col-span-2 sm:col-span-1")}
    >
      <dt className="text-muted-foreground text-xs">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Label for the date a consent entered its current status, if shown. */
const STATUS_DATE_LABEL: Partial<Record<LinkState, ConsentCopyKey>> = {
  awaiting_approval: "detailSentForApproval",
  denied: "detailDeclinedOn",
  revoked: "detailRevokedOn",
};

/** An expiry means nothing once the consent was declined or revoked. */
const SHOWS_EXPIRY: Record<LinkState, boolean> = {
  requested: true,
  awaiting_approval: true,
  processing: true,
  active: true,
  partial: true,
  failed: true,
  denied: false,
  expired: true,
  revoked: false,
  unknown: false,
};

function ConsentDetails({
  link,
  state,
}: {
  link: SourceLink;
  state: LinkState;
}) {
  const { text, codeText } = useConsentText();
  const { consent, terms } = link;
  const statusDateLabel = STATUS_DATE_LABEL[state];

  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <Detail term={text("detailPurpose")} wide>
        {terms.purposes
          .map((purpose) => codeText("purpose", purpose))
          .join(" · ")}
      </Detail>
      <Detail term={text("detailScope")} wide>
        {codeText("data", terms.data_kind)}, {text("historyLead")}{" "}
        <span data-fact className="tabular-nums">
          {terms.history_months}
        </span>{" "}
        {text("months")}
      </Detail>
      <Detail term={text("detailFrequency")} wide>
        {codeText("frequency", terms.fetch_frequency)}
      </Detail>
      <Detail term={text("detailRequested")} wide>
        <DateDisplay value={consent.requested_at} />
      </Detail>
      {statusDateLabel && (
        <Detail term={text(statusDateLabel)} wide>
          <DateDisplay value={consent.status_changed_at} />
        </Detail>
      )}
      {consent.active_from && state !== "denied" && (
        <Detail term={text("detailActiveFrom")}>
          <DateDisplay value={consent.active_from} />
        </Detail>
      )}
      {SHOWS_EXPIRY[state] && (
        <Detail
          term={text(state === "expired" ? "detailExpired" : "detailExpires")}
        >
          <DateDisplay
            value={consent.expires_on}
            unknownLabel={text("expiryNotSet")}
          />
        </Detail>
      )}
      {LINK_STATE_INFO[state].showAccounts && (
        <Detail term={text("detailLastAttempt")} wide>
          <DateDisplay value={link.import.last_attempt_at} />
        </Detail>
      )}
    </dl>
  );
}

function AccountBalance({
  account,
  isDemo,
}: {
  account: ImportedAccount;
  isDemo: boolean;
}) {
  const { text } = useConsentText();

  // A balance is shown only when it actually arrived; otherwise its state is
  // said in words. Nothing here is ever rendered as ₹0.
  if (account.status !== "received" || account.balance === null) {
    return (
      <span className="text-muted-foreground italic">
        {account.status === "processing"
          ? text("balanceProcessing")
          : account.status === "failed"
            ? text("balanceFailed")
            : text("balanceNotKnown")}
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <Money value={account.balance} />
      {account.balance_as_of && (
        <span className="text-muted-foreground text-xs">
          as of <DateDisplay value={account.balance_as_of} />
        </span>
      )}
      {isDemo && (
        <span className="text-warning-foreground text-xs">
          ({text("balanceDemo")})
        </span>
      )}
    </span>
  );
}

function AccountRow({
  account,
  isDemo,
}: {
  account: ImportedAccount;
  isDemo: boolean;
}) {
  const { text } = useConsentText();

  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 font-medium break-words">
          {account.account_label}
        </p>
        {account.status === "received" ? (
          <SourceBadge
            kind="observed"
            sourceLabel={isDemo ? "Demo fixture, not a real bank" : null}
          />
        ) : (
          <AvailabilityState
            compact
            status={account.status === "processing" ? "pending" : "failed"}
            title={text(`account_${account.status}`)}
          />
        )}
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <Detail term={text("accountCovers")}>
          {account.data_from && account.data_to ? (
            <>
              <DateDisplay value={account.data_from} /> {text("accountTo")}{" "}
              <DateDisplay value={account.data_to} />
            </>
          ) : (
            <span className="text-muted-foreground italic">
              {text("accountCoversUnknown")}
            </span>
          )}
        </Detail>
        <Detail term={text("accountFetched")}>
          <DateDisplay value={account.fetched_at} />
        </Detail>
        <Detail term={text("accountBalance")}>
          <AccountBalance account={account} isDemo={isDemo} />
        </Detail>
      </dl>
      {account.error && (
        <p className="text-muted-foreground text-xs">
          {account.error.safe_message}{" "}
          <span className="whitespace-nowrap">
            Reference:{" "}
            <span className="font-mono">{account.error.request_id}</span>
          </span>
        </p>
      )}
    </li>
  );
}

function Accounts({ link }: { link: SourceLink }) {
  const { text } = useConsentText();
  const accounts = link.import.accounts;
  if (accounts.length === 0) return null;
  const received = accounts.filter((a) => a.status === "received").length;

  return (
    <section className="space-y-2">
      <h4 className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
        {text("accountsHeading")}
        {accounts.length > 1 && (
          <span className="text-muted-foreground font-normal">
            {text("accountsSummaryLead")}{" "}
            <span data-fact className="tabular-nums">
              {received}
            </span>{" "}
            {text("accountsSummaryOf")}{" "}
            <span data-fact className="tabular-nums">
              {accounts.length}
            </span>
          </span>
        )}
      </h4>
      <ul className="divide-y rounded-lg border px-3 py-3">
        {accounts.map((account) => (
          <AccountRow
            key={account.account_id}
            account={account}
            isDemo={link.is_demo}
          />
        ))}
      </ul>
    </section>
  );
}

function GrantsSummary({ link }: { link: SourceLink }) {
  const { text } = useConsentText();
  const onOff = (value: boolean) => text(value ? "turnedOn" : "turnedOff");

  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold">{text("grantsHeading")}</h4>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <Detail term={text("grant_household_computation")}>
          {onOff(link.grants.household_computation)}
        </Detail>
        <Detail term={text("grant_viewer")}>
          {text(`viewer_${link.grants.viewer_scope}`) || text("notStated")}
        </Detail>
        <Detail term={text("grant_alerts_and_actions")}>
          {onOff(link.grants.alerts_and_actions)}
        </Detail>
      </dl>
    </section>
  );
}

function RevokeControl({
  link,
  onRevoke,
}: {
  link: SourceLink;
  onRevoke: (linkId: string) => Promise<void>;
}) {
  const { text } = useConsentText();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const titleId = `revoke-title-${link.link_id}`;

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  function keep() {
    setConfirming(false);
    // Return focus to the control that opened the confirmation.
    requestAnimationFrame(() => openRef.current?.focus());
  }

  async function confirm() {
    setBusy(true);
    await onRevoke(link.link_id);
  }

  if (!confirming) {
    return (
      <Button
        ref={openRef}
        variant="destructive"
        size="xl"
        onClick={() => setConfirming(true)}
      >
        {text("revokeAction")}
        <span className="sr-only">: {link.source_label}</span>
      </Button>
    );
  }

  return (
    <div
      ref={confirmRef}
      tabIndex={-1}
      role="group"
      aria-labelledby={titleId}
      className="border-destructive/40 bg-destructive/5 space-y-3 rounded-lg border p-3 outline-none"
    >
      <p id={titleId} className="font-medium">
        {text("revokeConfirmTitle")}
      </p>
      <p className="text-sm">{text("revokeConfirmBody")}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          size="xl"
          onClick={confirm}
          disabled={busy}
        >
          {text("revokeConfirm")}
        </Button>
        <Button variant="outline" size="xl" onClick={keep} disabled={busy}>
          {text("revokeKeep")}
        </Button>
      </div>
    </div>
  );
}

interface LinkCardProps {
  link: SourceLink;
  onRevoke: (linkId: string) => Promise<void>;
}

/** One linked source: its consent, what was imported, and Revoke. */
export function LinkCard({ link, onRevoke }: LinkCardProps) {
  const state = linkState(link);
  const info = LINK_STATE_INFO[state];
  const headingId = `link-${link.link_id}`;
  const showGrants = !["denied", "expired", "revoked", "unknown"].includes(
    state,
  );

  return (
    <article
      aria-labelledby={headingId}
      data-link-state={state}
      className="bg-card space-y-4 rounded-xl border p-4 sm:p-5"
    >
      <h3
        id={headingId}
        tabIndex={-1}
        className="text-lg font-semibold tracking-tight break-words outline-none"
      >
        {link.source_label}
      </h3>
      <LinkStateNote link={link} state={state} />
      <ConsentDetails link={link} state={state} />
      {info.showAccounts && <Accounts link={link} />}
      {showGrants && <GrantsSummary link={link} />}
      {info.revocable && <RevokeControl link={link} onRevoke={onRevoke} />}
    </article>
  );
}
