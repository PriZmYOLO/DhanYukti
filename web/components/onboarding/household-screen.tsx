"use client";

import { Link2, PlusCircle, Ticket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { AnswerField } from "@/components/onboarding/answer-field";
import { MembershipNote } from "@/components/onboarding/membership-note";
import {
  useOnboarding,
  useText,
} from "@/components/onboarding/onboarding-provider";
import { RequireSession } from "@/components/onboarding/require-session";
import { SetupFrame } from "@/components/onboarding/setup-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMPTY_DRAFT, answerFromDraft } from "@/lib/onboarding/answer";
import { parseShortText } from "@/lib/onboarding/parse";
import { onboardingPort } from "@/lib/provisional/h01";

function OptionCard({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: typeof PlusCircle;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <section className="bg-card space-y-4 rounded-xl border p-4 sm:p-5">
      <div className="flex gap-3">
        <Icon aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-muted-foreground text-sm">{body}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function HouseholdChoices() {
  const { snapshot, apply } = useOnboarding();
  const text = useText();
  const router = useRouter();
  const [nameDraft, setNameDraft] = useState(EMPTY_DRAFT);
  const [nameError, setNameError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  if (snapshot.membership) {
    const name = snapshot.membership.household_name;
    return (
      <section className="bg-card space-y-3 rounded-xl border p-4 sm:p-5">
        <h2 className="font-semibold">{text("alreadyMemberTitle")}</h2>
        <p>
          {name.state === "answered"
            ? name.value
            : text("householdNameUnanswered")}
        </p>
        <p className="text-muted-foreground text-sm">
          {snapshot.membership.joined_via === "created"
            ? text("joinedViaCreated")
            : text("joinedViaInvite")}
        </p>
        <Link href="/setup/context" className={buttonVariants({ size: "lg" })}>
          {text("continueSetup")}
        </Link>
      </section>
    );
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const result = answerFromDraft(nameDraft, (value) =>
      parseShortText(value, 60),
    );
    if (!result.ok) {
      setNameError(result.error);
      return;
    }
    apply(
      await onboardingPort.createHousehold({ household_name: result.value }),
    );
    router.push("/setup/context");
  }

  function join(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (trimmed === "") {
      setCodeError(text("inviteCodeRequired"));
      return;
    }
    router.push(`/invite/${encodeURIComponent(trimmed.toUpperCase())}`);
  }

  return (
    <div className="space-y-4">
      <OptionCard
        icon={PlusCircle}
        title={text("createTitle")}
        body={text("createBody")}
      >
        <form onSubmit={create} className="space-y-3">
          <AnswerField
            id="household-name"
            label={text("householdNameLabel")}
            hint={text("householdNameHint")}
            draft={nameDraft}
            onChange={(draft) => {
              setNameDraft(draft);
              setNameError(null);
            }}
            error={nameError}
            inputProps={{ maxLength: 60 }}
          />
          <Button type="submit" size="lg">
            {text("createAction")}
          </Button>
        </form>
      </OptionCard>

      <OptionCard
        icon={Ticket}
        title={text("joinTitle")}
        body={text("joinBody")}
      >
        <form onSubmit={join} className="space-y-3" noValidate>
          <div className="space-y-2">
            <Label htmlFor="invite-code">{text("inviteCodeLabel")}</Label>
            <Input
              id="invite-code"
              value={code}
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={40}
              aria-invalid={codeError ? true : undefined}
              aria-describedby={
                codeError ? "invite-code-error" : "invite-code-hint"
              }
              onChange={(event) => {
                setCode(event.target.value);
                setCodeError(null);
              }}
              className="h-10"
            />
            {codeError ? (
              <p id="invite-code-error" className="text-destructive text-sm">
                {codeError}
              </p>
            ) : (
              <p
                id="invite-code-hint"
                className="text-muted-foreground text-xs"
              >
                {text("demoCodesHint")}
              </p>
            )}
          </div>
          <Button type="submit" size="lg" variant="outline">
            {text("joinAction")}
          </Button>
        </form>
      </OptionCard>

      <OptionCard
        icon={Link2}
        title={text("linkTitle")}
        body={text("linkBody")}
      />
    </div>
  );
}

export function HouseholdScreen() {
  const text = useText();

  return (
    <SetupFrame
      step="household"
      title={text("householdHeading")}
      intro={text("householdIntro")}
    >
      <RequireSession>
        <HouseholdChoices />
        <MembershipNote />
      </RequireSession>
    </SetupFrame>
  );
}
