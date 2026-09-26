"use client";

import { Landmark, PencilLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { AnswerField } from "@/components/onboarding/answer-field";
import { ChoiceField } from "@/components/onboarding/choice-field";
import {
  useOnboarding,
  useText,
} from "@/components/onboarding/onboarding-provider";
import { RequireSession } from "@/components/onboarding/require-session";
import { SetupFrame } from "@/components/onboarding/setup-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  UNANSWERED,
  answerFromDraft,
  draftFromAnswer,
  type Answer,
  type FieldDraft,
  type ParseResult,
} from "@/lib/onboarding/answer";
import { frequencyOptions, toChoiceOptions } from "@/lib/onboarding/options";
import {
  paiseToRupeeText,
  parseIsoDateInput,
  parseRupeesToPaise,
  parseShortText,
} from "@/lib/onboarding/parse";
import {
  onboardingPort,
  type IncomeFrequency,
  type ManualMoneyDraft,
} from "@/lib/provisional/h01";
import { cn } from "@/lib/utils";

const identity = (value: string) => value;

function MoneySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="bg-card space-y-4 rounded-xl border p-4 sm:p-5">
      <legend className="float-left mb-2 w-full text-lg font-semibold">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function MoneyForm() {
  const { snapshot, apply } = useOnboarding();
  const text = useText();
  const router = useRouter();
  const saved = snapshot.money?.draft;

  const [cashAmount, setCashAmount] = useState(() =>
    draftFromAnswer(saved?.cash.amount ?? UNANSWERED, paiseToRupeeText),
  );
  const [cashDate, setCashDate] = useState(() =>
    draftFromAnswer(saved?.cash.as_of ?? UNANSWERED, identity),
  );
  const [incomeAmount, setIncomeAmount] = useState(() =>
    draftFromAnswer(saved?.income.amount ?? UNANSWERED, paiseToRupeeText),
  );
  const [frequency, setFrequency] = useState<Answer<IncomeFrequency>>(
    saved?.income.frequency ?? UNANSWERED,
  );
  const [incomeNext, setIncomeNext] = useState(() =>
    draftFromAnswer(saved?.income.next_on ?? UNANSWERED, identity),
  );
  const [billName, setBillName] = useState(() =>
    draftFromAnswer(saved?.bill.name ?? UNANSWERED, identity),
  );
  const [billAmount, setBillAmount] = useState(() =>
    draftFromAnswer(saved?.bill.amount ?? UNANSWERED, paiseToRupeeText),
  );
  const [billDue, setBillDue] = useState(() =>
    draftFromAnswer(saved?.bill.due_on ?? UNANSWERED, identity),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const noIncome = incomeAmount.choice === "none";
  const noBill = billAmount.choice === "none";

  function field(
    id: string,
    draft: FieldDraft,
    setDraft: (draft: FieldDraft) => void,
  ) {
    return {
      id,
      draft,
      error: errors[id] ?? null,
      onChange: (next: FieldDraft) => {
        setDraft(next);
        setErrors((current) => {
          if (!(id in current)) return current;
          const rest = { ...current };
          delete rest[id];
          return rest;
        });
      },
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};

    function read<T>(
      id: string,
      draft: FieldDraft,
      parse: (text: string) => ParseResult<T>,
    ): Answer<T> {
      const result = answerFromDraft(draft, parse);
      if (result.ok) return result.value;
      found[id] = result.error;
      return UNANSWERED;
    }

    const draft: ManualMoneyDraft = {
      cash: {
        amount: read("cash-amount", cashAmount, parseRupeesToPaise),
        as_of: read("cash-date", cashDate, parseIsoDateInput),
      },
      income: noIncome
        ? {
            amount: { state: "none" },
            frequency: UNANSWERED,
            next_on: UNANSWERED,
          }
        : {
            amount: read("income-amount", incomeAmount, parseRupeesToPaise),
            frequency,
            next_on: read("income-next", incomeNext, parseIsoDateInput),
          },
      bill: noBill
        ? { name: UNANSWERED, amount: { state: "none" }, due_on: UNANSWERED }
        : {
            name: read("bill-name", billName, (value) =>
              parseShortText(value, 60),
            ),
            amount: read("bill-amount", billAmount, parseRupeesToPaise),
            due_on: read("bill-due", billDue, parseIsoDateInput),
          },
    };

    const firstError = Object.keys(found)[0];
    if (firstError) {
      setErrors(found);
      document.getElementById(firstError)?.focus();
      return;
    }

    apply(await onboardingPort.saveManualMoney(draft));
    router.push("/setup/review");
  }

  const amountInput = { inputMode: "decimal" as const, maxLength: 16 };
  const dateInput = { type: "date" };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-destructive text-sm font-medium">
          {text("fixErrors")}
        </p>
      )}

      <MoneySection title={text("cashSection")}>
        <AnswerField
          {...field("cash-amount", cashAmount, setCashAmount)}
          label={text("cashAmountLabel")}
          rupee
          allowDontKnow
          inputProps={amountInput}
        />
        <AnswerField
          {...field("cash-date", cashDate, setCashDate)}
          label={text("cashDateLabel")}
          allowDontKnow
          inputProps={dateInput}
        />
      </MoneySection>

      <MoneySection title={text("incomeSection")}>
        <AnswerField
          {...field("income-amount", incomeAmount, setIncomeAmount)}
          label={text("incomeAmountLabel")}
          rupee
          allowDontKnow
          noneLabel={text("incomeNone")}
          inputProps={amountInput}
        />
        {!noIncome && (
          <>
            <ChoiceField
              name="income-frequency"
              legend={text("frequencyLegend")}
              options={toChoiceOptions(frequencyOptions, text)}
              value={frequency}
              onChange={setFrequency}
            />
            <AnswerField
              {...field("income-next", incomeNext, setIncomeNext)}
              label={text("nextIncomeLabel")}
              allowDontKnow
              inputProps={dateInput}
            />
          </>
        )}
      </MoneySection>

      <MoneySection title={text("billSection")}>
        <AnswerField
          {...field("bill-amount", billAmount, setBillAmount)}
          label={text("billAmountLabel")}
          rupee
          allowDontKnow
          noneLabel={text("billNone")}
          inputProps={amountInput}
        />
        {!noBill && (
          <>
            <AnswerField
              {...field("bill-name", billName, setBillName)}
              label={text("billNameLabel")}
              hint={text("billNameHint")}
              inputProps={{ maxLength: 60 }}
            />
            <AnswerField
              {...field("bill-due", billDue, setBillDue)}
              label={text("billDueLabel")}
              allowDontKnow
              inputProps={dateInput}
            />
          </>
        )}
      </MoneySection>

      <p className="text-muted-foreground text-sm">{text("moneyDemoNote")}</p>
      <Button type="submit" size="lg">
        {text("saveAndContinue")}
      </Button>
    </form>
  );
}

export function MoneyScreen() {
  const text = useText();

  return (
    <SetupFrame
      step="money"
      title={text("moneyHeading")}
      intro={text("moneyIntro")}
    >
      <RequireSession needsHousehold>
        <div className="grid gap-3 sm:grid-cols-2">
          <section className="border-primary bg-primary/5 space-y-2 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-2">
              <PencilLine aria-hidden className="text-primary size-5" />
              <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {text("pathManualActive")}
              </span>
            </div>
            <h2 className="font-semibold">{text("pathManualTitle")}</h2>
            <p className="text-muted-foreground text-sm">
              {text("pathManualBody")}
            </p>
          </section>
          <section className="bg-card flex flex-col gap-2 rounded-xl border p-4">
            <Landmark aria-hidden className="text-muted-foreground size-5" />
            <h2 className="font-semibold">{text("pathBankTitle")}</h2>
            <p className="text-muted-foreground flex-1 text-sm">
              {text("pathBankBody")}
            </p>
            <Link
              href="/privacy/connect?from=setup"
              className={cn(
                buttonVariants({ variant: "outline", size: "xl" }),
                "self-start",
              )}
            >
              {text("pathBankAction")}
            </Link>
          </section>
        </div>
        <MoneyForm />
      </RequireSession>
    </SetupFrame>
  );
}
