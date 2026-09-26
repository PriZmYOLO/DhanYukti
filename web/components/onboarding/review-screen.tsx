"use client";

import { PencilLine } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { AnswerValue } from "@/components/onboarding/answer-value";
import { MembershipNote } from "@/components/onboarding/membership-note";
import {
  useOnboarding,
  useText,
} from "@/components/onboarding/onboarding-provider";
import { RequireSession } from "@/components/onboarding/require-session";
import { SetupFrame } from "@/components/onboarding/setup-frame";
import { SetupPanel } from "@/components/onboarding/setup-panel";
import { buttonVariants } from "@/components/ui/button";
import { UNANSWERED, type Answer } from "@/lib/onboarding/answer";
import type { CopyKey } from "@/lib/onboarding/copy";
import {
  frequencyOptions,
  goalOptions,
  incomePatternOptions,
  occupationOptions,
  roleOptions,
} from "@/lib/onboarding/options";
import type { OnboardingSnapshot } from "@/lib/provisional/h01";
import { cn } from "@/lib/utils";

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

/**
 * label | value | date. Rows share one column grid (subgrid), so every
 * label, value and date lines up; labels never wrap.
 */
function SummaryGrid({
  withDates = false,
  children,
}: {
  withDates?: boolean;
  children: ReactNode;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-3 sm:gap-x-4",
        withDates
          ? "grid-cols-[max-content_minmax(0,1fr)_max-content]"
          : "grid-cols-[max-content_minmax(0,1fr)]",
      )}
    >
      {children}
    </dl>
  );
}

function Row({
  label,
  date,
  children,
}: {
  label: string;
  /** Third column; omitted for grids without dates. */
  date?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="col-span-full grid grid-cols-subgrid items-baseline border-t py-2.5 first:border-t-0">
      <dt className="text-muted-foreground text-sm whitespace-nowrap">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        {children}
      </dd>
      {date !== undefined && (
        <dd className="text-muted-foreground text-right text-sm whitespace-nowrap">
          {date}
        </dd>
      )}
    </div>
  );
}

/** "as of 27 Sept" on phones, "as of 27 Sept 2026" from 640px. */
function RowDate({ prefix, value }: { prefix: string; value: string }) {
  return (
    <>
      {prefix}{" "}
      <DateDisplay value={value} format="short" className="sm:hidden" />
      <DateDisplay value={value} className="hidden sm:inline" />
    </>
  );
}

/** How many saved answers are given, "don't know" or still unanswered. */
function countAnswers(snapshot: OnboardingSnapshot) {
  const context = snapshot.context;
  const money = snapshot.money?.draft;
  const answers: Answer<unknown>[] = [
    context?.member_role ?? UNANSWERED,
    context?.occupation ?? UNANSWERED,
    context?.income_pattern ?? UNANSWERED,
    context?.dependents ?? UNANSWERED,
    context?.goal_intent ?? UNANSWERED,
    money?.cash.amount ?? UNANSWERED,
    money?.cash.as_of ?? UNANSWERED,
    money?.income.amount ?? UNANSWERED,
    money?.bill.amount ?? UNANSWERED,
  ];
  // Follow-up questions only count when their parent wasn't "none".
  if (money?.income.amount.state !== "none") {
    answers.push(
      money?.income.frequency ?? UNANSWERED,
      money?.income.next_on ?? UNANSWERED,
    );
  }
  if (money?.bill.amount.state !== "none") {
    answers.push(
      money?.bill.name ?? UNANSWERED,
      money?.bill.due_on ?? UNANSWERED,
    );
  }
  const count = (states: Answer<unknown>["state"][]) =>
    answers.filter((answer) => states.includes(answer.state)).length;
  return {
    answered: count(["answered", "none"]),
    dontKnow: count(["dont_know"]),
    unanswered: count(["unanswered"]),
  };
}

function ReviewContent() {
  const { snapshot } = useOnboarding();
  const text = useText();
  const label = (key: CopyKey) => text(key);

  const membership = snapshot.membership;
  const context = snapshot.context;
  const money = snapshot.money;
  const bill = money?.draft.bill;
  const income = money?.draft.income;
  const counts = countAnswers(snapshot);
  const goal = context?.goal_intent ?? UNANSWERED;

  return (
    <div className="space-y-4">
      <SetupPanel
        why="whyReview"
        summaryNote={false}
        summary={[
          { label: text("countAnswered"), value: counts.answered },
          { label: text("countDontKnow"), value: counts.dontKnow },
          { label: text("countUnanswered"), value: counts.unanswered },
        ]}
      />
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
        <SummaryGrid>
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
          {/* Only ever the person's own choice; never inferred. */}
          <Row label={text("labelGoal")}>
            {goal.state === "unanswered" ? (
              <span className="text-muted-foreground">
                {text("goalNotChosen")}
              </span>
            ) : (
              <AnswerValue
                answer={goal}
                render={(value) => label(goalOptions[value])}
              />
            )}
          </Row>
        </SummaryGrid>
      </ReviewSection>

      <ReviewSection title={text("reviewMoney")} editHref="/setup/money">
        {money && (
          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <PencilLine aria-hidden className="mt-px size-3.5 shrink-0" />
            {text("moneyEntryLine")}
          </p>
        )}
        <SummaryGrid withDates>
          <Row
            label={text("labelCash")}
            date={
              money?.draft.cash.as_of.state === "answered" ? (
                <RowDate
                  prefix={text("asOf")}
                  value={money.draft.cash.as_of.value}
                />
              ) : null
            }
          >
            <AnswerValue
              answer={money?.draft.cash.amount ?? UNANSWERED}
              render={(value) => <Money value={value} />}
            />
          </Row>
          <Row
            label={text("labelIncome")}
            date={
              income?.next_on.state === "answered" ? (
                <RowDate prefix={text("nextOn")} value={income.next_on.value} />
              ) : null
            }
          >
            <AnswerValue
              answer={income?.amount ?? UNANSWERED}
              render={(value) => <Money value={value} />}
              noneText={text("incomeNone")}
            />
            {income?.frequency.state === "answered" && (
              <span className="text-muted-foreground text-sm whitespace-nowrap">
                {label(frequencyOptions[income.frequency.value])}
              </span>
            )}
          </Row>
          <Row
            label={text("labelBill")}
            date={
              bill?.due_on.state === "answered" ? (
                <RowDate prefix={text("dueOn")} value={bill.due_on.value} />
              ) : null
            }
          >
            <AnswerValue
              answer={bill?.amount ?? UNANSWERED}
              render={(value) => <Money value={value} />}
              noneText={text("billNone")}
            />
            {bill?.name.state === "answered" && (
              <span className="text-muted-foreground text-sm">
                {bill.name.value}
              </span>
            )}
          </Row>
        </SummaryGrid>
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
        <MembershipNote className="xl:hidden" />
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
