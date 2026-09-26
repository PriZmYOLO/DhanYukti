"use client";

import {
  BookUser,
  ChevronRight,
  FileText,
  FileUp,
  Flag,
  FlaskConical,
  Landmark,
  LockKeyhole,
  PencilLine,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { useConsentText } from "@/components/consent/consent-text";
import { LinkCard } from "@/components/consent/link-card";
import { PrivacyFrame } from "@/components/consent/privacy-frame";
import { useInvalidateHouseholdView } from "@/components/correction/picture-status";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { STATEMENT_UPLOAD_CONNECTED } from "@/lib/capabilities";
import { GRANT_KEYS, grantCounts } from "@/lib/consent/status";
import {
  consentPort,
  demoConsentControls,
  type SourceLink,
} from "@/lib/provisional/h03";

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
      <div className="space-y-1">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        {lead && <p className="text-muted-foreground text-sm">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

function GrantOverview({ links }: { links: SourceLink[] }) {
  const { text } = useConsentText();
  const counts = grantCounts(links);

  return (
    <ul className="bg-card divide-y rounded-xl border">
      {GRANT_KEYS.map((key) => (
        <li
          key={key}
          data-grant={key}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
        >
          <span className="font-medium">{text(`grant_${key}`)}</span>
          {counts[key] > 0 ? (
            <span className="text-sm">
              {text("grantGiven")}{" "}
              <span data-fact className="tabular-nums">
                {counts[key]}
              </span>{" "}
              {text("grantSources")}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">
              {text("grantNotGiven")}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** A card whose heading is a link that covers the whole card. */
function EntryCard({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <li className="bg-card hover:border-primary/60 has-focus-visible:outline-ring relative flex gap-3 rounded-xl border p-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2">
      <Icon aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="font-semibold">
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0 after:rounded-xl"
          >
            {title}
          </Link>
        </h3>
        <p className="text-muted-foreground text-sm">{body}</p>
      </div>
      <ChevronRight
        aria-hidden
        className="text-muted-foreground mt-0.5 size-5 shrink-0"
      />
    </li>
  );
}

function DemoStatesPanel({
  onChange,
}: {
  onChange: (links: SourceLink[]) => void;
}) {
  const { text } = useConsentText();
  const [busy, setBusy] = useState(false);
  if (!demoConsentControls) return null;
  const controls = demoConsentControls;

  async function run(action: () => Promise<SourceLink[]>) {
    setBusy(true);
    onChange(await action());
    setBusy(false);
  }

  return (
    <section
      aria-labelledby="demo-states-heading"
      className="border-warning/50 bg-warning/10 space-y-3 rounded-xl border border-dashed p-4"
    >
      <h2
        id="demo-states-heading"
        className="flex items-center gap-2 font-semibold"
      >
        <FlaskConical aria-hidden className="size-4" />
        {text("demoStatesTitle")}
      </h2>
      <p className="text-sm">{text("demoStatesBody")}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="xl"
          disabled={busy}
          onClick={() => run(controls.loadEveryState)}
        >
          {text("demoStatesLoad")}
        </Button>
        <Button
          variant="ghost"
          size="xl"
          disabled={busy}
          onClick={() => run(controls.clear)}
        >
          {text("demoStatesClear")}
        </Button>
      </div>
    </section>
  );
}

function Dashboard() {
  const { text } = useConsentText();
  const { snapshot } = useOnboarding();
  const memberId = snapshot.session?.member_id ?? null;
  const [links, setLinks] = useState<SourceLink[] | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const invalidateHouseholdView = useInvalidateHouseholdView();

  useEffect(() => {
    let cancelled = false;
    consentPort.listLinks().then((loaded) => {
      if (!cancelled) setLinks(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  async function revoke(linkId: string) {
    const updated = await consentPort.revoke(linkId);
    setLinks((current) =>
      (current ?? []).map((link) => (link.link_id === linkId ? updated : link)),
    );
    // Home and Why must not reuse figures built with the revoked data.
    await invalidateHouseholdView();
    setAnnouncement(
      `${text("revokedAnnouncement")} ${text("state_revoked_body")}`,
    );
    // The confirmation is gone; move focus to the card it belonged to.
    requestAnimationFrame(() =>
      document.getElementById(`link-${linkId}`)?.focus(),
    );
  }

  if (links === null) {
    return (
      <p role="status" className="text-muted-foreground">
        {text("loading")}
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <p role="status" className="sr-only">
        {announcement}
      </p>

      <Section
        id="choices-heading"
        title={text("choicesHeading")}
        lead={text("choicesLead")}
      >
        <GrantOverview links={links} />
      </Section>

      <Section id="passport-heading" title={text("passportTitle")}>
        <ul className="grid gap-3 sm:grid-cols-2">
          <EntryCard
            href="/privacy/passport"
            icon={BookUser}
            title={text("privacyPassportTitle")}
            body={text("privacyPassportBody")}
          />
          <EntryCard
            href="/privacy/notice"
            icon={FileText}
            title={text("privacyNoticeTitle")}
            body={text("privacyNoticeBody")}
          />
        </ul>
      </Section>

      <Section id="links-heading" title={text("linksHeading")}>
        {links.length === 0 ? (
          <AvailabilityState
            status="not_connected"
            title={text("linksEmptyTitle")}
            description={text("linksEmptyBody")}
          />
        ) : (
          <div className="space-y-4">
            {links.map((link) => (
              <LinkCard key={link.link_id} link={link} onRevoke={revoke} />
            ))}
          </div>
        )}
      </Section>

      <Section id="add-heading" title={text("addHeading")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="bg-card flex flex-col gap-3 rounded-xl border p-4">
            <Landmark aria-hidden className="text-primary size-5" />
            <h3 className="font-semibold">{text("linkBankTitle")}</h3>
            <p className="text-muted-foreground flex-1 text-sm">
              {text("linkBankBody")}
            </p>
            <Link
              href="/privacy/connect"
              className={buttonVariants({ size: "xl" })}
            >
              {text("linkBankAction")}
            </Link>
          </div>
          <div className="bg-card flex flex-col gap-3 rounded-xl border p-4">
            <FileUp aria-hidden className="text-muted-foreground size-5" />
            <h3 className="font-semibold">{text("uploadTitle")}</h3>
            {/* No file input exists until an upload service does. */}
            {!STATEMENT_UPLOAD_CONNECTED && (
              <AvailabilityState
                status="unavailable"
                title={text("uploadUnavailable")}
                description={text("uploadBody")}
              />
            )}
          </div>
        </div>
      </Section>

      <Section id="private-heading" title={text("privateHeading")}>
        <ul className="grid gap-3 sm:grid-cols-2">
          <EntryCard
            href="/privacy/private"
            icon={LockKeyhole}
            title={text("privateCardTitle")}
            body={text("privateCardBody")}
          />
        </ul>
      </Section>

      <Section id="feedback-heading" title={text("feedbackHeading")}>
        <ul className="grid gap-3 sm:grid-cols-2">
          <EntryCard
            href="/privacy/correct"
            icon={PencilLine}
            title={text("correctTitle")}
            body={text("correctBody")}
          />
          <EntryCard
            href="/privacy/report"
            icon={Flag}
            title={text("reportTitle")}
            body={text("reportBody")}
          />
        </ul>
      </Section>

      <DemoStatesPanel onChange={setLinks} />
    </div>
  );
}

export function PrivacyDashboard() {
  const { text } = useConsentText();

  return (
    <PrivacyFrame title={text("privacyTitle")} intro={text("privacyIntro")}>
      <Dashboard />
    </PrivacyFrame>
  );
}
