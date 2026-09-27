"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

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
import { Button } from "@/components/ui/button";
import {
  UNANSWERED,
  answerFromDraft,
  draftFromAnswer,
  type Answer,
} from "@/lib/onboarding/answer";
import type { CopyKey } from "@/lib/onboarding/copy";
import {
  goalOptions,
  incomePatternOptions,
  occupationOptions,
  roleOptions,
  toChoiceOptions,
} from "@/lib/onboarding/options";
import { parseCount } from "@/lib/onboarding/parse";
import {
  onboardingPort,
  type GoalIntent,
  type HouseholdContextDraft,
  type IncomePattern,
  type MemberRole,
  type OccupationKind,
} from "@/lib/provisional/h01";

const MAX_DEPENDENTS = 30;

function ContextForm() {
  const { snapshot, apply } = useOnboarding();
  const text = useText();
  const router = useRouter();
  const saved = snapshot.context;
  const { why, onFocus } = useFocusedWhy("whyContext");

  const [role, setRole] = useState<Answer<MemberRole>>(
    saved?.member_role ?? UNANSWERED,
  );
  const [occupation, setOccupation] = useState<Answer<OccupationKind>>(
    saved?.occupation ?? UNANSWERED,
  );
  const [incomePattern, setIncomePattern] = useState<Answer<IncomePattern>>(
    saved?.income_pattern ?? UNANSWERED,
  );
  const [dependents, setDependents] = useState(() =>
    draftFromAnswer(saved?.dependents ?? UNANSWERED, String),
  );
  const [dependentsError, setDependentsError] = useState<string | null>(null);
  const [goal, setGoal] = useState<Answer<GoalIntent>>(
    saved?.goal_intent ?? UNANSWERED,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const dependentsAnswer = answerFromDraft(dependents, (value) =>
      parseCount(value, MAX_DEPENDENTS),
    );
    if (!dependentsAnswer.ok) {
      setDependentsError(dependentsAnswer.error);
      document.getElementById("dependents")?.focus();
      return;
    }

    const context: HouseholdContextDraft = {
      member_role: role,
      occupation,
      income_pattern: incomePattern,
      dependents: dependentsAnswer.value,
      goal_intent: goal,
    };
    apply(await onboardingPort.saveContext(context));
    router.push("/setup/money");
  }

  // Live summary for the side panel: the choices as made, not yet saved.
  function choice<T extends string>(
    answer: Answer<T>,
    options: Record<T, CopyKey>,
    unanswered: CopyKey = "statusUnanswered",
    noneText = "",
  ) {
    switch (answer.state) {
      case "answered":
        return text(options[answer.value]);
      case "none":
        return noneText;
      case "dont_know":
        return (
          <span className="text-muted-foreground">
            {text("statusDontKnow")}
          </span>
        );
      default:
        return (
          <span className="text-muted-foreground">{text(unanswered)}</span>
        );
    }
  }
  const dependentsText = dependents.text.trim();
  const summary: SummaryRow[] = [
    { label: text("labelRole"), value: choice(role, roleOptions) },
    {
      label: text("labelOccupation"),
      value: choice(occupation, occupationOptions),
    },
    {
      label: text("labelIncomePattern"),
      value: choice(
        incomePattern,
        incomePatternOptions,
        "statusUnanswered",
        text("incomeNoneOwn"),
      ),
    },
    {
      label: text("labelDependents"),
      value:
        dependents.choice === "dont_know" ? (
          <span className="text-muted-foreground">
            {text("statusDontKnow")}
          </span>
        ) : dependentsText === "" ? (
          <span className="text-muted-foreground">
            {text("statusUnanswered")}
          </span>
        ) : (
          <span className="tabular-nums">{dependentsText}</span>
        ),
    },
    {
      label: text("labelGoal"),
      value: choice(goal, goalOptions, "goalNotChosen"),
    },
  ];

  return (
    <form onSubmit={submit} onFocus={onFocus} className="space-y-6" noValidate>
      <SetupPanel why={why} summary={summary} />
      <div className="bg-card space-y-6 rounded-xl border p-4 sm:p-5">
        <ChoiceField
          name="member-role"
          legend={text("roleLegend")}
          description={text("roleHint")}
          why="whyRole"
          options={toChoiceOptions(roleOptions, text)}
          value={role}
          onChange={setRole}
        />
        <ChoiceField
          name="occupation"
          legend={text("occupationLegend")}
          description={text("occupationHint")}
          why="whyOccupation"
          options={toChoiceOptions(occupationOptions, text)}
          value={occupation}
          onChange={setOccupation}
        />
        <ChoiceField
          name="income-pattern"
          legend={text("incomePatternLegend")}
          description={text("incomePatternHint")}
          why="whyIncomePattern"
          options={toChoiceOptions(incomePatternOptions, text)}
          value={incomePattern}
          onChange={setIncomePattern}
          noneLabel={text("incomeNoneOwn")}
          allowDontKnow
        />
        <AnswerField
          id="dependents"
          label={text("dependentsLabel")}
          description={text("dependentsHint")}
          why="whyDependents"
          draft={dependents}
          onChange={(draft) => {
            setDependents(draft);
            setDependentsError(null);
          }}
          error={dependentsError}
          allowDontKnow
          inputProps={{ inputMode: "numeric", maxLength: 3 }}
        />
        <ChoiceField
          name="goal-intent"
          legend={text("goalLegend")}
          description={text("goalHint")}
          why="whyGoal"
          options={toChoiceOptions(goalOptions, text)}
          value={goal}
          onChange={setGoal}
          allowDontKnow
        />
      </div>
      <Button type="submit" size="lg">
        {text("saveAndContinue")}
      </Button>
    </form>
  );
}

export function ContextScreen() {
  const text = useText();

  return (
    <SetupFrame
      step="context"
      title={text("contextHeading")}
      intro={text("contextIntro")}
    >
      <RequireSession needsHousehold>
        <ContextForm />
      </RequireSession>
    </SetupFrame>
  );
}
