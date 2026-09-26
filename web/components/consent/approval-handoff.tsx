"use client";

import { ExternalLink, FlaskConical } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import type { ReturnTo } from "@/lib/consent/return-to";
import { useConsentText } from "@/components/consent/consent-text";
import { LinkStateNote } from "@/components/consent/link-card";
import { PrivacyFrame } from "@/components/consent/privacy-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AA_CONNECTED } from "@/lib/capabilities";
import { linkState } from "@/lib/consent/status";
import {
  consentPort,
  demoConsentControls,
  type ApprovalHandoff,
  type SourceLink,
} from "@/lib/provisional/h03";

type Loaded =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "unavailable"; reason: string }
  | { status: "needs_details"; link: SourceLink }
  | { status: "redirect"; link: SourceLink; url: string }
  | { status: "ready"; link: SourceLink };

/** How often the live handoff asks the server for news from Anumati. */
const POLL_MS = 3000;
/** Stop polling after this long; the member can reload to check again. */
const POLL_LIMIT_MS = 15 * 60 * 1000;

function fromHandoff(handoff: ApprovalHandoff): Loaded {
  switch (handoff.mode) {
    case "simulated":
      return { status: "ready", link: handoff.link };
    case "needs_details":
      return { status: "needs_details", link: handoff.link };
    case "redirect":
      return {
        status: "redirect",
        link: handoff.link,
        url: handoff.redirect_url,
      };
    default:
      return { status: "unavailable", reason: handoff.reason };
  }
}

function MobileForm({
  onSubmit,
}: {
  onSubmit: (mobile: string) => Promise<void>;
}) {
  const { text } = useConsentText();
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const digits = value.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setBusy(true);
    await onSubmit(digits);
    setBusy(false);
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby="mobile-heading"
      className="bg-card space-y-3 rounded-xl border p-4"
    >
      <h2 id="mobile-heading" className="font-semibold">
        {text("mobileHeading")}
      </h2>
      <div className="space-y-1.5">
        <Label htmlFor="aa-mobile">{text("mobileLabel")}</Label>
        <Input
          id="aa-mobile"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={14}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "aa-mobile-error" : "aa-mobile-hint"}
          className="h-11 max-w-xs text-base"
        />
        <p id="aa-mobile-hint" className="text-muted-foreground text-sm">
          {text("mobileHint")}
        </p>
        {invalid && (
          <p id="aa-mobile-error" className="text-negative text-sm">
            {text("mobileInvalid")}
          </p>
        )}
      </div>
      <Button type="submit" size="xl" disabled={busy}>
        {text("mobileSubmit")}
      </Button>
    </form>
  );
}

function SimulatedApproval({
  onDecide,
}: {
  onDecide: (decision: "approve" | "decline") => void;
}) {
  const { text } = useConsentText();
  const [busy, setBusy] = useState(false);

  function decide(decision: "approve" | "decline") {
    setBusy(true);
    onDecide(decision);
  }

  return (
    <section
      aria-labelledby="simulated-heading"
      className="border-warning/50 bg-warning/10 space-y-3 rounded-xl border border-dashed p-4"
    >
      <h2
        id="simulated-heading"
        className="flex items-center gap-2 font-semibold"
      >
        <FlaskConical aria-hidden className="size-4 shrink-0" />
        {text("simulatedTitle")}
      </h2>
      <p className="text-sm">{text("simulatedBody")}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="xl" disabled={busy} onClick={() => decide("approve")}>
          {text("simulateApprove")}
        </Button>
        <Button
          variant="outline"
          size="xl"
          disabled={busy}
          onClick={() => decide("decline")}
        >
          {text("simulateDecline")}
        </Button>
      </div>
    </section>
  );
}

function Handoff({ linkId, returnTo }: { linkId: string; returnTo: ReturnTo }) {
  const { text } = useConsentText();
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [decided, setDecided] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const link = await consentPort.getLink(linkId);
      if (!link) {
        if (!cancelled) setLoaded({ status: "not_found" });
        return;
      }
      // Live: an awaiting request can reopen its Anumati page (idempotent).
      const reopen =
        AA_CONNECTED && link.consent.status === "awaiting_approval";
      if (link.consent.status !== "requested" && !reopen) {
        if (!cancelled) setLoaded({ status: "ready", link });
        return;
      }
      const handoff = await consentPort.startApproval(linkId);
      if (!cancelled) setLoaded(fromHandoff(handoff));
    })().catch((error: unknown) => {
      if (!cancelled) {
        setLoaded({
          status: "unavailable",
          reason:
            error instanceof Error
              ? error.message
              : text("handoffUnavailableTitle"),
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [linkId, text]);

  // Live only: follow the link while Anumati and the bank are working.
  const pollable =
    AA_CONNECTED &&
    (loaded.status === "redirect" || loaded.status === "ready") &&
    ["awaiting_approval", "processing"].includes(linkState(loaded.link));

  useEffect(() => {
    if (!pollable) return;
    const started = Date.now();
    const timer = window.setInterval(async () => {
      if (Date.now() - started > POLL_LIMIT_MS) {
        window.clearInterval(timer);
        return;
      }
      const link = await consentPort.getLink(linkId).catch(() => null);
      if (!link) return;
      setLoaded((current) => {
        if (
          current.status === "redirect" &&
          linkState(link) === "awaiting_approval"
        ) {
          return { ...current, link };
        }
        if (current.status === "redirect" || current.status === "ready") {
          if (current.status === "redirect") setDecided(true);
          return { status: "ready", link };
        }
        return current;
      });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [pollable, linkId]);

  useEffect(() => {
    if (decided) resultRef.current?.focus();
  }, [decided]);

  async function decide(decision: "approve" | "decline") {
    if (!demoConsentControls) return;
    const link = await demoConsentControls.simulateDecision(linkId, decision);
    setLoaded({ status: "ready", link });
    setDecided(true);
  }

  async function submitMobile(mobile: string) {
    const handoff = await consentPort.startApproval(linkId, {
      mobile_number: mobile,
    });
    setLoaded(fromHandoff(handoff));
  }

  if (loaded.status === "loading") {
    return (
      <p role="status" className="text-muted-foreground">
        {text("loading")}
      </p>
    );
  }

  const exits = (
    <div className="flex flex-wrap gap-2">
      <Link href="/privacy" className={buttonVariants({ size: "xl" })}>
        {text("seeInPrivacy")}
      </Link>
      {returnTo === "setup" && (
        <Link
          href="/setup/money"
          className={buttonVariants({ variant: "outline", size: "xl" })}
        >
          {text("backToSetup")}
        </Link>
      )}
    </div>
  );

  if (loaded.status === "not_found") {
    return (
      <AvailabilityState
        status="missing"
        title={text("handoffNotFoundTitle")}
        description={text("handoffNotFoundBody")}
      >
        {exits}
      </AvailabilityState>
    );
  }

  if (loaded.status === "unavailable") {
    return (
      <AvailabilityState
        status="unavailable"
        title={text("handoffUnavailableTitle")}
        description={loaded.reason}
      >
        {exits}
      </AvailabilityState>
    );
  }

  const { link } = loaded;
  const state = linkState(link);
  const awaiting = state === "awaiting_approval";

  return (
    <div className="space-y-6">
      <ol
        role="list"
        className="bg-card list-none space-y-3 rounded-xl border p-4 [counter-reset:step]"
      >
        {(["handoffStep1", "handoffStep2", "handoffStep3"] as const).map(
          (key) => (
            <li
              key={key}
              className="flex gap-3 [counter-increment:step] before:grid before:size-6 before:shrink-0 before:place-items-center before:rounded-full before:border before:text-xs before:content-[counter(step)]"
            >
              <span className="pt-0.5">{text(key)}</span>
            </li>
          ),
        )}
      </ol>
      <p className="text-muted-foreground text-sm">{text("handoffOtp")}</p>

      {loaded.status === "needs_details" ? (
        <MobileForm onSubmit={submitMobile} />
      ) : loaded.status === "redirect" && awaiting ? (
        <section
          aria-labelledby="redirect-heading"
          className="bg-card space-y-3 rounded-xl border p-4"
          data-handoff="redirect"
        >
          <h2 id="redirect-heading" className="font-semibold">
            {text("redirectTitle")}
          </h2>
          <p className="text-sm">{text("redirectBody")}</p>
          <a
            href={loaded.url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "xl" })}
          >
            {text("openAnumati")}
            <ExternalLink aria-hidden />
          </a>
          <p role="status" className="text-muted-foreground text-sm">
            {text("waitingForProvider")}
          </p>
        </section>
      ) : awaiting && !AA_CONNECTED && demoConsentControls ? (
        <SimulatedApproval onDecide={decide} />
      ) : (
        <div
          ref={resultRef}
          tabIndex={-1}
          className="space-y-4 outline-none"
          data-link-state={state}
        >
          <LinkStateNote link={link} state={state} live={AA_CONNECTED} />
          {pollable && (
            <p role="status" className="text-muted-foreground text-sm">
              {text("waitingForProvider")}
            </p>
          )}
          {exits}
        </div>
      )}
    </div>
  );
}

export function ApprovalHandoff({
  linkId,
  returnTo,
}: {
  linkId: string;
  returnTo: ReturnTo;
}) {
  const { text } = useConsentText();

  return (
    <PrivacyFrame
      title={text("handoffTitle")}
      intro={text("handoffIntro")}
      back
    >
      <Handoff linkId={linkId} returnTo={returnTo} />
    </PrivacyFrame>
  );
}
