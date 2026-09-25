"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { SourceBadge } from "@/components/finance/source-badge";
import { AnswerValue } from "@/components/onboarding/answer-value";
import { MembershipNote } from "@/components/onboarding/membership-note";
import {
  useOnboarding,
  useText,
} from "@/components/onboarding/onboarding-provider";
import { RequireSession } from "@/components/onboarding/require-session";
import { SetupFrame } from "@/components/onboarding/setup-frame";
import { buttonVariants } from "@/components/ui/button";
import { UNANSWERED } from "@/lib/onboarding/answer";
import type { CopyKey } from "@/lib/onboarding/copy";
import {
  frequencyOptions,
  goalOptions,
  incomePatternOptions,
  occupationOptions,
  roleOptions,
} from "@/lib/onboarding/options";

function ReviewSection({
  title,
  editHref,
  children,
}: {
  title: string;
  editHref?: string;
  children: ReactNode;
}) {
  const text = useText();
  return (
    <section className="bg-card space-y-3 rounded-xl border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {editHref && (
          <Link
            href={editHref}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {text("change")}
            <span className="sr-only"> {title}</span>
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="flex flex-wrap items-center gap-2">{children}</dd>
    </div>
  );
}

function ReviewContent() {
  const { snapshot } = useOnboarding();
  const text = useText();
  const label = (key: CopyKey) => text(key);

  const membership = snapshot.membership;
  const context = snapshot.context;
  const money = snapshot.money;
  const declared = (
    <SourceBadge kind="declared" sourceLabel={text("entrySource")} />
  );
  const candidate = (
    <span className="text-muted-foreground rounded-full border border-dashed px-2 py-0.5 text-xs">
      {text("candidateStatus")}
    </span>
  );

  return (
    <div className="space-y-4">
      {membership && (
        <ReviewSection title={text("reviewHousehold")}>
          <p className="font-medium">
            {membership.household_name.state === "answered"
              ? membership.household_name.value
              : text("householdNameUnanswered")}
          </p>
          <p className="text-muted-foreground text-sm">
            {membership.joined_via === "created"
              ? text("joinedViaCreated")
              : text("joinedViaInvite")}
          </p>
        </ReviewSection>
      )}

      <ReviewSection title={text("reviewContext")} editHref="/setup/context">
        <dl className="divide-y">
          <Row label={text("labelRole")}>
            <AnswerValue
              answer={context?.member_role ?? UNANSWERED}
              render={(value) => label(roleOptions[value])}
            />
          </Row>
          <Row label={text("labelOccupation")}>
            <AnswerValue
              answer={context?.occupation ?? UNANSWERED}
              render={(value) => label(occupationOptions[value])}
            />
          </Row>
          <Row label={text("labelIncomePattern")}>
            <AnswerValue
              answer={context?.income_pattern ?? UNANSWERED}
              render={(value) => label(incomePatternOptions[value])}
              noneText={text("incomeNoneOwn")}
            />
          </Row>
          <Row label={text("labelDependents")}>
            <AnswerValue
              answer={context?.dependents ?? UNANSWERED}
              render={(value) => (
                <span className="font-medium tabular-nums">{value}</span>
              )}
            />
          </Row>
          <Row label={text("labelGoal")}>
            <AnswerValue
              answer={context?.goal_intent ?? UNANSWERED}
              render={(value) => label(goalOptions[value])}
            />
          </Row>
        </dl>
      </ReviewSection>

      <ReviewSection title={text("reviewMoney")} editHref="/setup/money">
        <dl className="divide-y">
          <Row label={text("labelCash")}>
            <AnswerValue
              answer={money?.draft.cash.amount ?? UNANSWERED}
              render={(value) => <Money value={value} />}
            />
            {money?.draft.cash.as_of.state === "answered" && (
              <span className="text-muted-foreground text-sm">
                {text("asOf")}{" "}
                <DateDisplay value={money.draft.cash.as_of.value} />
              </span>
            )}
            {money?.draft.cash.amount.state === "answered" && (
              <>
                {declared}
                {candidate}
              </>
            )}
          </Row>
          <Row label={text("labelIncome")}>
            <AnswerValue
              answer={money?.draft.income.amount ?? UNANSWERED}
              render={(value) => <Money value={value} />}
              noneText={text("incomeNone")}
            />
            {money?.draft.income.frequency.state === "answered" && (
              <span className="text-muted-foreground text-sm">
                {label(frequencyOptions[money.draft.income.frequency.value])}
              </span>
            )}
            {money?.draft.income.next_on.state === "answered" && (
              <span className="text-muted-foreground text-sm">
                {text("nextOn")}{" "}
                <DateDisplay value={money.draft.income.next_on.value} />
              </span>
            )}
            {money?.draft.income.amount.state === "answered" && (
              <>
                {declared}
                {candidate}
              </>
            )}
          </Row>
          <Row
            label={
              money?.draft.bill.name.state === "answered"
                ? `${text("labelBill")}: ${money.draft.bill.name.value}`
                : text("labelBill")
            }
          >
            <AnswerValue
              answer={money?.draft.bill.amount ?? UNANSWERED}
              render={(value) => <Money value={value} />}
              noneText={text("billNone")}
            />
            {money?.draft.bill.due_on.state === "answered" && (
              <span className="text-muted-foreground text-sm">
                {text("dueOn")}{" "}
                <DateDisplay value={money.draft.bill.due_on.value} />
              </span>
            )}
            {money?.draft.bill.amount.state === "answered" && (
              <>
                {declared}
                {candidate}
              </>
            )}
          </Row>
        </dl>
        <p className="text-muted-foreground text-xs">{text("modeNote")}</p>
      </ReviewSection>

      <ReviewSection title={text("reviewMembers")}>
        <ul className="divide-y">
          {snapshot.members.map((member) => (
            <li
              key={member.member_id}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <span className="font-medium">
                {member.access === "self"
                  ? `${member.display_label} (${text("reviewYou")})`
                  : member.display_label}
              </span>
              {member.access === "not_shared" && (
                <AvailabilityState status="not_shared" compact />
              )}
            </li>
          ))}
        </ul>
        <MembershipNote />
      </ReviewSection>

      <AvailabilityState
        status="unavailable"
        title={text("notOnHomeTitle")}
        description={text("notOnHome")}
      />
      <Link
        href="/"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        {text("goHome")}
      </Link>
    </div>
  );
}

export function ReviewScreen() {
  const text = useText();

  return (
    <SetupFrame
      step="review"
      title={text("reviewHeading")}
      intro={text("reviewIntro")}
    >
      <RequireSession needsHousehold>
        <ReviewContent />
      </RequireSession>
    </SetupFrame>
  );
}
