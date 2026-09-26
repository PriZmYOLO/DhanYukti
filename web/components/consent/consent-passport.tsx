"use client";

import { CircleCheck, CircleX, Landmark, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { useConsentText } from "@/components/consent/consent-text";
import {
  DpdpPurposeItems,
  useDpdp,
  useModeText,
} from "@/components/consent/dpdp-purposes";
import { PrivacyFrame } from "@/components/consent/privacy-frame";
import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Button, buttonVariants } from "@/components/ui/button";
import { LINK_STATE_INFO, linkState } from "@/lib/consent/status";
import { purposeById, type LedgerEntry } from "@/lib/dpdp/notice";
import { consentPort, type SourceLink } from "@/lib/provisional/h03";

function Section({
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

/** Bank links (AA consent) with one-tap revoke. */
function AaConsents() {
  const { text } = useConsentText();
  const [links, setLinks] = useState<SourceLink[] | null | "error">(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    let cancelled = false;
    consentPort
      .listLinks()
      .then((loaded) => !cancelled && setLinks(loaded))
      .catch(() => !cancelled && setLinks("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (links === null) {
    return (
      <p role="status" className="text-muted-foreground">
        {text("loading")}
      </p>
    );
  }
  if (links === "error") {
    return (
      <AvailabilityState status="unavailable" title={text("dpdpUnavailable")} />
    );
  }
  if (links.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{text("passportAaEmpty")}</p>
    );
  }

  async function revoke(linkId: string) {
    setBusy(linkId);
    try {
      const updated = await consentPort.revoke(linkId);
      setLinks((current) =>
        Array.isArray(current)
          ? current.map((l) => (l.link_id === linkId ? updated : l))
          : current,
      );
      setAnnouncement(text("passportRevoked"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <ul className="space-y-2">
        {links.map((link) => {
          const state = linkState(link);
          const info = LINK_STATE_INFO[state];
          return (
            <li
              key={link.link_id}
              data-passport-aa={state}
              className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold break-words">{link.source_label}</p>
                <p className="text-muted-foreground text-xs">
                  {text(`state_${state}`)} ·{" "}
                  <DateDisplay value={link.consent.status_changed_at} />
                  {link.consent.expires_on && info.consentActive && (
                    <>
                      {" · "}
                      {text("detailExpires")}{" "}
                      <DateDisplay value={link.consent.expires_on} />
                    </>
                  )}
                </p>
              </div>
              {info.revocable && (
                <Button
                  variant="destructive"
                  size="xl"
                  disabled={busy === link.link_id}
                  onClick={() => revoke(link.link_id)}
                  aria-label={`${text("passportRevoke")}: ${link.source_label}`}
                >
                  {text("passportRevoke")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function LedgerList({
  entries,
  verified,
}: {
  entries: LedgerEntry[];
  verified: boolean;
}) {
  const { text } = useConsentText();
  const t = useModeText();
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{text("ledgerEmpty")}</p>
    );
  }
  return (
    <div className="space-y-2">
      <p
        className={
          verified
            ? "text-positive flex items-center gap-1.5 text-sm font-medium"
            : "text-negative flex items-center gap-1.5 text-sm font-medium"
        }
        data-ledger-verified={verified}
      >
        {verified ? (
          <CircleCheck aria-hidden className="size-4" />
        ) : (
          <CircleX aria-hidden className="size-4" />
        )}
        {text(verified ? "ledgerVerified" : "ledgerBroken")}
      </p>
      <ol className="divide-y rounded-xl border px-3 text-sm">
        {[...entries].reverse().map((entry) => {
          const purpose = purposeById(entry.subject);
          return (
            <li
              key={entry.seq}
              className="space-y-0.5 py-2.5"
              data-ledger-kind={entry.kind}
            >
              <p>
                <span className="text-muted-foreground tabular-nums">
                  #{entry.seq}
                </span>{" "}
                {text(`ledger_${entry.kind}`)} ·{" "}
                {purpose
                  ? t(purpose.title)
                  : `${text("ledgerBankLink")} …${entry.subject.replace(/^aa:/, "")}`}
              </p>
              <p className="text-muted-foreground text-xs">
                <DateDisplay value={entry.at} /> · {text("receiptId")}{" "}
                <span className="font-mono">{entry.receipt_id}</span> · sha256{" "}
                <span className="font-mono">{entry.hash.slice(0, 12)}…</span>
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Job 2b: every consent (AA, DPDP, Perfios) in one place, each ended with
 * one tap, plus the hash-chained Value Ledger of receipts.
 */
export function ConsentPassport() {
  const { text } = useConsentText();
  const dpdp = useDpdp();

  return (
    <PrivacyFrame
      title={text("passportTitle")}
      intro={text("passportIntro")}
      back
    >
      <div className="space-y-10">
        <Section id="passport-aa" title={text("passportAaHeading")}>
          <AaConsents />
        </Section>

        <Section id="passport-dpdp" title={text("passportDpdpHeading")}>
          <DpdpPurposeItems dpdp={dpdp} compact />
          <Link
            href="/privacy/notice"
            className={buttonVariants({ variant: "outline", size: "xl" })}
          >
            {text("passportOpenNotice")}
          </Link>
        </Section>

        <Section id="passport-perfios" title={text("passportPerfiosHeading")}>
          <div className="bg-card flex gap-3 rounded-xl border p-4 text-sm">
            <Landmark
              aria-hidden
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
            />
            <p>{text("passportPerfiosBody")}</p>
          </div>
        </Section>

        <Section
          id="passport-ledger"
          title={text("ledgerHeading")}
          lead={text("ledgerLead")}
        >
          {dpdp.state ? (
            <LedgerList
              entries={dpdp.state.ledger}
              verified={dpdp.state.ledger_verified}
            />
          ) : dpdp.error ? null : (
            <p role="status" className="text-muted-foreground">
              {text("loading")}
            </p>
          )}
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ShieldCheck aria-hidden className="size-3.5" />
            {text("noticeVersion")}{" "}
            <span className="font-mono">
              {dpdp.state?.notice_version ?? "…"}
            </span>
          </p>
        </Section>
      </div>
    </PrivacyFrame>
  );
}
