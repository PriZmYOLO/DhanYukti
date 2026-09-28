// Mirrors docs/API_CONTRACT.md. The client never recalculates money.
export type L = { hi: string; en: string };
export type Confidence = "pakka" | "andaaza" | "pata_nahi";
export type Status = "green" | "amber" | "red";
export type AvatarKind = "woman" | "man" | "girl" | "boy" | "elder_woman" | "elder_man";

export type Member = {
  id: string; name: string; role: L; earner: boolean; age?: number;
  sharing: "poora" | "sirf_total" | "private"; avatar: AvatarKind;
};

export type Metric = {
  value: number | null; unit: "inr" | "days" | "per100" | "status";
  status: Status; confidence: Confidence; label: L; sub: L; engine: string;
};

export type RiverEvent = {
  id: string; type: "salary" | "bill" | "fee" | "emi" | "rent" | "premium" | "gig";
  label: L; amount: number; movable: boolean;
  /** pakka = seen on this date in bank data (3+ months); andaaza = our estimate. Absent on scenario-only events. */
  certainty?: Confidence; basis?: L; scenario?: boolean;
  /** Set in a scenario when the user asked to move this bill: the payee has NOT agreed yet. */
  moved?: boolean; original_date?: string; needs?: L;
};
export type RiverDay = { date: string; balance: number; events: RiverEvent[] };
export type River = { floor: number; days: RiverDay[]; min_balance: number; min_date: string; gap: number };

export type Txn = { date: string; narration: string; amount: number; source: "aa" | "perfios" | "declared" };
export type Why = { saw: Txn[]; rule: L; confidence: Confidence; tag: "jaankari" | "referral" };
export type Action = {
  type: "message" | "gullak" | "protect" | "cheaper_option" | "plan" | "help";
  label: L; payload: Record<string, unknown>;
};
export type NBA = {
  id: string; tier: 1 | 2 | 3 | 4; tier_label: L; severity: Status; engine: string;
  icon: "school" | "shield" | "loan" | "jar" | "bolt" | "heart" | "grow" | "alert";
  title: L; body: L; task: L; if_not: L; second_step?: L; action: Action; why: Why; points: number;
};
export type Jar = {
  id: string; name: L; goal: number; saved: number; kind: "emergency" | "school" | "festival" | "education"; daily_suggest: number;
  remaining?: number; target_date?: string;
};
export type Badge = { id: string; name: L; desc: L; earned: boolean; icon: string };
export type Game = {
  points: number; streak: number; streak_shield: number; level: 1 | 2 | 3 | 4 | 5; level_name: L; next_level_at: number;
  badges: Badge[]; mission: { title: L; progress: number; target: number };
  leaderboard: { member_id: string; name: string; habits: number; streak: number }[];
  ledger: { date: string; what: L; amount: number; evidenced: boolean }[];
};
export type LenderCheck = {
  app: string; on_rbi_list: boolean; borrowed: number; charges: number; days: number;
  effective_annual_pct: number; verdict: L;
};
export type SpendSlice = { key: "ghar" | "khana" | "emi" | "bachat" | "baaki"; label: L; amount: number; top: Txn[] };

export type Dashboard = {
  household: {
    id: string; family_name: L; primary_user: string; city: L; income_type: "salary" | "gig" | "dual";
    /** null = not known yet (fewer than one complete month of the member's own data). */
    monthly_income: number | null; members: Member[]; literacy_mode: "aasaan" | "saathi" | "pro"; language: string;
  };
  as_of: string;
  data_source: { mode: "live" | "replay" | "fixture"; aa: string; analytics: string; fetched_at: string };
  metrics: { safe_to_spend: Metric; resilience_days: Metric; debt_load: Metric; protection: Metric };
  protection_detail: { member_id: string; name: string; life: boolean; health: boolean; note: L }[];
  river: River;
  nba: NBA[];
  jars: Jar[];
  spend: SpendSlice[];
  lender_shield: LenderCheck[];
  crosscheck: { field: L; ours: string; perfios: string; agree: boolean }[];
  game: Game;
};

export type HouseholdSummary = { id: string; family_name: L; city: L; income: number; members: number; problem: L; hero: L };

export type SimResponse = {
  id: string; kind: "move" | "cut" | "gullak" | "all"; label: L; gap_after: number; fixes: boolean;
  conditional: boolean; needs?: L; jar_id?: string;
};
export type LoanResult = {
  principal: number; complete: boolean; missing: string[]; missing_labels: L[];
  annual_rate_pct?: number; months?: number; processing_fee?: number; emi?: number; total_repay?: number;
  total_cost?: number; extra_over_price?: number; extra_per_100?: number;
  debt_per100_before?: number | null; debt_per100_after?: number | null; debt_status_after?: Status | null; first_emi?: string;
};
export type GoalImpact = {
  jar_id: string; name: L; goal: number; target_date: string; used: number; saved_before: number; saved_after: number;
  gap_before: number; gap_after: number; daily_before: number; daily_after: number;
};
export type SimResult = {
  river: River; resilience_days: number; gap_before: number; gap_after: number; message: L; scenario: true;
  // Before figures on the same baseline and horizon (optional: older backends omit them).
  resilience_before?: number; min_balance_before?: number; min_date_before?: string;
  first_deficit_date_before?: string | null; first_deficit_date?: string | null;
  /** Bills the scenario moved — each still needs the payee to agree. */
  conditional?: RiverEvent[];
  /** Present when there is a shortfall: which permitted responses close it. */
  responses?: SimResponse[]; feasible?: boolean;
  goal_impact?: GoalImpact;
  loan?: LoanResult; purchase?: { amount: number; pay: "cash" | "loan" };
};

export type ConsentArtefact = {
  handle: string; member_id: string; member_name: string; aa: string; status: string; purpose: L;
  fi_types: string[]; range_months: number; fetch: string; expiry: string; data_life: L; created_at: string;
};
export type DpdpGrant = { key: string; label: L; why: L; granted: boolean; until: L };

export type GameEventResult = { points: number; delta: number; streak: number; level: number; badge_unlocked?: Badge; jars?: Jar[] };
export type Capability = { sponsor: string; api: string; status: "live" | "replay" | "blocked" | "untested"; note: string };
