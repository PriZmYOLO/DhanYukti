/**
 * PROVISIONAL — the operations L02 screens need, as TypeScript signatures.
 *
 * This is deliberately NOT a list of HTTP routes. H01/H02/H03/H04 decide the
 * real routes, payloads and errors; an H01-backed adapter implements this
 * interface by calling them. Methods are async so that swap needs no screen
 * changes.
 */
import type { Answer } from "@/lib/onboarding/answer";
import type {
  HouseholdContextDraft,
  ManualMoneyDraft,
  OnboardingSnapshot,
  PresentationPreference,
  ProvisionalAcceptInviteResult,
  ProvisionalInviteLookup,
} from "@/lib/provisional/h01/types";

export interface OnboardingPort {
  /** "demo" until an H01/H02-backed adapter exists. */
  readonly implementation: "demo" | "h01";

  loadSnapshot(): Promise<OnboardingSnapshot>;

  /** H02: sign-in. The demo adapter only creates a labelled demo session. */
  startSession(input: {
    display_name: string | null;
  }): Promise<OnboardingSnapshot>;
  endSession(): Promise<OnboardingSnapshot>;

  /** H01/H02: household creation and membership. */
  createHousehold(input: {
    household_name: Answer<string>;
  }): Promise<OnboardingSnapshot>;

  /** H02: invite lookup and single-use acceptance. */
  lookupInvite(code: string): Promise<ProvisionalInviteLookup>;
  acceptInvite(code: string): Promise<ProvisionalAcceptInviteResult>;

  /** H01: ContextVersion. */
  saveContext(context: HouseholdContextDraft): Promise<OnboardingSnapshot>;

  /** N02 candidates → H04 acceptance. Saving here never accepts a fact. */
  saveManualMoney(draft: ManualMoneyDraft): Promise<OnboardingSnapshot>;

  /** H01: PresentationProfile. Presentation only. */
  setPresentation(
    preference: PresentationPreference,
  ): Promise<OnboardingSnapshot>;
}
