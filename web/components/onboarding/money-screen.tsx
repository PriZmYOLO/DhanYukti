"use client";

import { Landmark, PencilLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { AnswerField } from "@/components/onboarding/answer-field";
import { ChoiceField } from "@/components/onboarding/choice-field";
import {
  useOnboarding,
  useText,
} from "@/components/onboarding/onboarding-provider";
import { RequireSession } from "@/components/onboarding/require-session";
import { SetupFrame } from "@/components/onboarding/setup-frame";
import {
  SetupPanel,
  useFocusedWhy,
  type SummaryRow,
} from "@/components/onboarding/setup-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { todayIsoDate } from "@/lib/format";
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
  groupRupeeText,
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
import type { MoneyPaise } from "@/lib/contracts/common";
import { cn } from "@/lib/utils";

const identity = (value: string) => value;
const rupeeText = (value: MoneyPaise) =>
  groupRupeeText(paiseToRupeeText(value));

function MoneySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  // The legend floats so it sits inside the card's padding; the fields
  // clear it so no label is pushed beside it.
  return (
    <fieldset className="bg-card rounded-xl border p-4 sm:p-5">
      <legend className="float-left mb-4 w-full text-lg font-semibold">
        {title}
      </legend>
      <div className="clear-left space-y-6">{children}</div>
    </fieldset>
  );
}

/**
 * "As of which date?" defaults to today, shown as a sentence; the date input
 * (and "I don't know") appear only once the person says it was earlier.
 */
function CashDateField({
  today,
  earlier,
  onEarlier,
  field,
}: {
  today: string;
  earlier: boolean;
  onEarlier: () => void;
  field: {
    id: string;
    draft: FieldDraft;
    error: string | null;
    onChange: (draft: FieldDraft) => void;
  };
}) {
  const text = useText();

  if (earlier) {
    return (
      <AnswerField
        {...field}
        label={text("cashDateLabel")}
        description={text("cashDateHint")}
        why="whyCashDate"
        allowDontKnow
        inputProps={{ type: "date", max: today }}
      />
    );
  }

  return (
    <div
      role="group"
      aria-labelledby="cash-date-label"
      aria-describedby="cash-date-description"
      className="space-y-2"
      data-why="whyCashDate"
    >
      <div className="space-y-1">
        <p id="cash-date-label" className="text-sm leading-none font-medium">
          {text("cashDateLabel")}
        </p>
        <p id="cash-date-description" className="text-muted-foreground text-sm">
          {text("cashDateHint")}
        </p>
      </div>
      <p>
        {text("asOfToday")}{" "}
        <DateDisplay value={today} format="short" className="font-medium" />
      </p>
      <button
        type="button"
        onClick={onEarlier}
        className="text-primary focus-ring rounded-sm text-sm font-medium underline underline-offset-4 hover:decoration-2"
      >
        {text("earlierDate")}
      </button>
    </div>
  );
}

function MoneyForm() {
  const { snapshot, apply } = useOnboarding();
  const text = useText();
  const router = useRouter();
  const saved = snapshot.money?.draft;
  const { why, onFocus } = useFocusedWhy("whyMoney");

  const [today] = useState(() => todayIsoDate());
  const [cashAmount, setCashAmount] = useState(() =>
    draftFromAnswer(saved?.cash.amount ?? UNANSWERED, rupeeText),
  );
  // Prefilled with today: an explicit date, never "unknown". A saved answer
  // (another date, "I don't know" or a cleared date) keeps the input open.
  const [cashDate, setCashDate] = useState<FieldDraft>(() =>
    saved
      ? draftFromAnswer(saved.cash.as_of, identity)
      : { choice: "value", text: today },
  );
  const [earlierDate, setEarlierDate] = useState(
    () => !(cashDate.choice === "value" && cashDate.text === today),
  );
  const focusDateInput = useRef(false);
  const [incomeAmount, setIncomeAmount] = useState(() =>
    draftFromAnswer(saved?.income.amount ?? UNANSWERED, rupeeText),
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
    draftFromAnswer(saved?.bill.amount ?? UNANSWERED, rupeeText),
  );
  const [billDue, setBillDue] = useState(() =>
    draftFromAnswer(saved?.bill.due_on ?? UNANSWERED, identity),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (earlierDate && focusDateInput.current) {
      focusDateInput.current = false;
      document.getElementById("cash-date")?.focus();
    }
  }, [earlierDate]);

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
      if (firstError === "cash-date") setEarlierDate(true);
      setErrors(found);
      document.getElementById(firstError)?.focus();
      return;
    }

    apply(await onboardingPort.saveManualMoney(draft));
    router.push("/setup/review");
  }

  // Live summary for the side panel: the drafts as typed, not yet saved.
  function liveValue(draft: FieldDraft, parsed: ReactNode, noneText = "") {
    if (draft.choice === "dont_know") return muted(text("statusDontKnow"));
    if (draft.choice === "none") return noneText;
    if (draft.text.trim() === "") return muted(text("statusUnanswered"));
    return parsed ?? muted(text("liveNeedsFix"));
  }
  function liveMoney(draft: FieldDraft, noneText?: string) {
    const parsed = parseRupeesToPaise(draft.text.trim());
    return liveValue(
      draft,
      parsed.ok ? <Money value={parsed.value} /> : null,
      noneText,
    );
  }
  function liveDate(draft: FieldDraft) {
    const parsed = parseIsoDateInput(draft.text.trim());
    return liveValue(
      draft,
      parsed.ok ? <DateDisplay value={parsed.value} format="short" /> : null,
    );
  }
  const summary: SummaryRow[] = [
    { label: text("labelCash"), value: liveMoney(cashAmount) },
    { label: text("liveAsOf"), value: liveDate(cashDate) },
    {
      label: text("labelIncome"),
      value: liveMoney(incomeAmount, text("incomeNone")),
    },
    ...(noIncome
      ? []
      : [{ label: text("liveNextOn"), value: liveDate(incomeNext) }]),
    {
      label: text("labelBill"),
      value: liveMoney(billAmount, text("billNone")),
    },
    ...(noBill ? [] : [{ label: text("liveDueOn"), value: liveDate(billDue) }]),
  ];

  const amountInput = { inputMode: "decimal" as const, maxLength: 20 };
  const dateInput = { type: "date" };

  return (
    <form onSubmit={submit} onFocus={onFocus} className="space-y-6" noValidate>
      <SetupPanel why={why} summary={summary} />
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-destructive text-sm font-medium">
          {text("fixErrors")}
        </p>
      )}

      <MoneySection title={text("cashSection")}>
        <AnswerField
          {...field("cash-amount", cashAmount, setCashAmount)}
          label={text("cashAmountLabel")}
          description={text("cashAmountHint")}
          why="whyCashAmount"
          money
          allowDontKnow
          inputProps={amountInput}
        />
        <CashDateField
          today={today}
          earlier={earlierDate}
          onEarlier={() => {
            focusDateInput.current = true;
            setEarlierDate(true);
          }}
          field={field("cash-date", cashDate, setCashDate)}
        />
      </MoneySection>

      <MoneySection title={text("incomeSection")}>
        <AnswerField
          {...field("income-amount", incomeAmount, setIncomeAmount)}
          label={text("incomeAmountLabel")}
          description={text("incomeAmountHint")}
          why="whyIncomeAmount"
          money
          allowDontKnow
          noneLabel={text("incomeNone")}
          inputProps={amountInput}
        />
        {!noIncome && (
          <>
            <ChoiceField
              name="income-frequency"
              legend={text("frequencyLegend")}
              description={text("frequencyHint")}
              why="whyFrequency"
              options={toChoiceOptions(frequencyOptions, text)}
              value={frequency}
              onChange={setFrequency}
            />
            <AnswerField
              {...field("income-next", incomeNext, setIncomeNext)}
              label={text("nextIncomeLabel")}
              description={text("nextIncomeHint")}
              why="whyNextIncome"
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
          description={text("billAmountHint")}
          why="whyBillAmount"
          money
          allowDontKnow
          noneLabel={text("billNone")}
          inputProps={amountInput}
        />
        {!noBill && (
          <>
            <AnswerField
              {...field("bill-name", billName, setBillName)}
              label={text("billNameLabel")}
              description={text("billNameHint")}
              why="whyBillName"
              inputProps={{ maxLength: 60 }}
            />
            <AnswerField
              {...field("bill-due", billDue, setBillDue)}
              label={text("billDueLabel")}
              description={text("billDueHint")}
              why="whyBillDue"
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

function muted(value: string) {
  return <span className="text-muted-foreground">{value}</span>;
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
