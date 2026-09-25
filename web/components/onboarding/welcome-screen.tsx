"use client";

import { Home, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { MembershipNote } from "@/components/onboarding/membership-note";
import {
  useOnboarding,
  useText,
} from "@/components/onboarding/onboarding-provider";
import { SetupFrame } from "@/components/onboarding/setup-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brand } from "@/lib/brand";
import { onboardingPort } from "@/lib/provisional/h01";

interface WelcomeScreenProps {
  /** Same-origin path to return to after starting a session. */
  next: string | null;
}

export function WelcomeScreen({ next }: WelcomeScreenProps) {
  const { ready, snapshot, apply } = useOnboarding();
  const text = useText();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const displayName = name.trim().slice(0, 40) || null;
    apply(await onboardingPort.startSession({ display_name: displayName }));
    router.push(next ?? "/setup/household");
  }

  async function end() {
    apply(await onboardingPort.endSession());
  }

  const principles = [
    {
      icon: UserRound,
      title: text("principleAccountTitle"),
      body: text("principleAccountBody"),
    },
    {
      icon: Home,
      title: text("principleHouseholdTitle"),
      body: text("principleHouseholdBody"),
    },
  ];

  return (
    <SetupFrame title={brand.tagline} intro={text("welcomeIntro")}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          lang="hi"
          className="bg-primary text-primary-foreground grid size-12 place-items-center rounded-xl text-2xl font-semibold"
        >
          ध
        </span>
        <div>
          <p className="text-xl font-semibold tracking-tight">
            {brand.name}{" "}
            <span lang="hi" className="text-muted-foreground font-normal">
              {brand.nameHindi}
            </span>
          </p>
          <p className="text-muted-foreground text-sm">{brand.descriptor}</p>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {principles.map(({ icon: Icon, title, body }) => (
          <li key={title} className="bg-card flex gap-3 rounded-xl border p-4">
            <Icon aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">{title}</p>
              <p className="text-muted-foreground text-sm">{body}</p>
            </div>
          </li>
        ))}
      </ul>
      <MembershipNote />

      <section
        aria-labelledby="sign-in-heading"
        className="bg-card space-y-4 rounded-xl border p-4 sm:p-5"
      >
        <h2 id="sign-in-heading" className="text-lg font-semibold">
          {text("signInHeading")}
        </h2>
        <AvailabilityState
          status="not_connected"
          title={text("secureSignInTitle")}
          description={text("secureSignInBody")}
        />

        {!ready ? (
          <p role="status" className="text-muted-foreground">
            {text("loading")}
          </p>
        ) : snapshot.session ? (
          <div className="space-y-3">
            <p>
              {text("signedInAs")}{" "}
              <strong>
                {snapshot.session.display_name ?? text("unnamedMember")}
              </strong>
              .
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={next ?? "/setup/household"}
                className={buttonVariants({ size: "lg" })}
              >
                {text("continueSetup")}
              </Link>
              <Button variant="outline" size="lg" onClick={end}>
                {text("endDemo")}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={start} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="demo-name">{text("demoNameLabel")}</Label>
              <p id="demo-name-hint" className="text-muted-foreground text-xs">
                {text("demoNameHint")}
              </p>
              <Input
                id="demo-name"
                value={name}
                maxLength={40}
                autoComplete="nickname"
                aria-describedby="demo-name-hint"
                onChange={(event) => setName(event.target.value)}
                className="h-10"
              />
            </div>
            <Button type="submit" size="lg" disabled={busy}>
              {text("startDemo")}
            </Button>
          </form>
        )}
      </section>
    </SetupFrame>
  );
}
