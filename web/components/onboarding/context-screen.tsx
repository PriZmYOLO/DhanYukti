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
import { Button } from "@/components/ui/button";
import {
  UNANSWERED,
  answerFromDraft,
  draftFromAnswer,
  type Answer,
} from "@/lib/onboarding/answer";
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

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="bg-card space-y-6 rounded-xl border p-4 sm:p-5">
        <ChoiceField
          name="member-role"
          legend={text("roleLegend")}
          options={toChoiceOptions(roleOptions, text)}
          value={role}
          onChange={setRole}
        />
        <ChoiceField
          name="occupation"
          legend={text("occupationLegend")}
          options={toChoiceOptions(occupationOptions, text)}
          value={occupation}
          onChange={setOccupation}
        />
        <ChoiceField
          name="income-pattern"
          legend={text("incomePatternLegend")}
          options={toChoiceOptions(incomePatternOptions, text)}
          value={incomePattern}
          onChange={setIncomePattern}
          noneLabel={text("incomeNoneOwn")}
          allowDontKnow
        />
        <AnswerField
          id="dependents"
          label={text("dependentsLabel")}
          hint={text("dependentsHint")}
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
