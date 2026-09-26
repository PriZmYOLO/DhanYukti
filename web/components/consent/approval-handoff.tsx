"use client";

import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import type { ReturnTo } from "@/lib/consent/return-to";
import { useConsentText } from "@/components/consent/consent-text";
import { LinkStateNote } from "@/components/consent/link-card";
import { PrivacyFrame } from "@/components/consent/privacy-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import { AA_CONNECTED } from "@/lib/capabilities";
import { linkState } from "@/lib/consent/status";
import {
  consentPort,
  demoConsentControls,
  type SourceLink,
} from "@/lib/provisional/h03";

type Loaded =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "unavailable"; reason: string }
  | { status: "ready"; link: SourceLink };

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
      if (link.consent.status !== "requested") {
        if (!cancelled) setLoaded({ status: "ready", link });
        return;
      }
      const handoff = await consentPort.startApproval(linkId);
      if (cancelled) return;
      setLoaded(
        handoff.mode === "simulated"
          ? { status: "ready", link: handoff.link }
          : { status: "unavailable", reason: handoff.reason },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [linkId]);

  useEffect(() => {
    if (decided) resultRef.current?.focus();
  }, [decided]);

  async function decide(decision: "approve" | "decline") {
    if (!demoConsentControls) return;
    const link = await demoConsentControls.simulateDecision(linkId, decision);
    setLoaded({ status: "ready", link });
    setDecided(true);
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

      {awaiting && !AA_CONNECTED && demoConsentControls ? (
        <SimulatedApproval onDecide={decide} />
      ) : (
        <div
          ref={resultRef}
          tabIndex={-1}
          className="space-y-4 outline-none"
          data-link-state={state}
        >
          <LinkStateNote link={link} state={state} />
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
