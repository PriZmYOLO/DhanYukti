/**
 * ============================================================
 *  DEMO — NO REVIEWER, NO RECALCULATION, NO BACKEND
 * ============================================================
 *
 * Development stand-in for H07 so the L05 screens can be used before the
 * backend exists. Replace it; do not extend it into a real system.
 *
 * - State lives in this browser tab's sessionStorage, keyed to the current
 *   demo member (from the h01 demo session). A new session sees nothing
 *   from the previous one.
 * - No network calls and no invented API routes.
 * - A proposal stays "proposed" until `demoCorrectionControls.simulateReview`
 *   stands in for the reviewer. Nothing recalculates: an accepted correction
 *   (or a revoke, via `markDemoRecalculation`) only flips the picture to
 *   "recalculating", and it stays there until the session ends or the demo
 *   is reset. There is no pretend "recalculation finished".
 */
import type { IsoTimestamp } from "@/lib/contracts/common";
import { onboardingPort } from "@/lib/provisional/h01";
import { DEMO_CORRECTIONS_KEY } from "@/lib/provisional/h07/demo-keys";
import type { CorrectionPort } from "@/lib/provisional/h07/port";
import type {
  FactCorrection,
  PictureChangeCause,
  PictureStatus,
} from "@/lib/provisional/h07/types";

interface StoredState {
  version: 1;
  member_id: string;
  corrections: FactCorrection[];
  picture: PictureStatus;
}

/** Labelled stand-in for a reviewer's reason. */
export const DEMO_REJECTION_REASON =
  "Demo review (fixture): the proposed value could not be matched to a source, so the original stays in your plan.";

// Fallback when sessionStorage is unavailable (private mode, blocked storage).
let memoryState: StoredState | null = null;

async function currentMemberId(): Promise<string | null> {
  const snapshot = await onboardingPort.loadSnapshot();
  return snapshot.session?.member_id ?? null;
}

function readStored(): StoredState | null {
  try {
    const raw = window.sessionStorage.getItem(DEMO_CORRECTIONS_KEY);
    if (!raw) return memoryState;
    const stored = JSON.parse(raw) as Partial<StoredState>;
    return stored.version === 1 &&
      stored.member_id &&
      stored.corrections &&
      stored.picture
      ? (stored as StoredState)
      : null;
  } catch {
    return memoryState;
  }
}

function empty(memberId: string): StoredState {
  return {
    version: 1,
    member_id: memberId,
    corrections: [],
    picture: { status: "current" },
  };
}

/** This member's state; another member's corrections are never returned. */
async function read(): Promise<StoredState> {
  const memberId = await currentMemberId();
  if (!memberId) throw new Error("No demo session in this tab.");
  const stored = readStored();
  return stored?.member_id === memberId ? stored : empty(memberId);
}

function write(state: StoredState): StoredState {
  memoryState = state;
  try {
    window.sessionStorage.setItem(DEMO_CORRECTIONS_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: keep the in-memory copy for this page only.
  }
  return state;
}

function demoId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

const now = (): IsoTimestamp => new Date().toISOString();

function recalculating(
  picture: PictureStatus,
  cause: PictureChangeCause,
): PictureStatus {
  if (picture.status === "recalculating") {
    return picture.causes.includes(cause)
      ? picture
      : { ...picture, causes: [...picture.causes, cause] };
  }
  return { status: "recalculating", since: now(), causes: [cause] };
}

/**
 * Demo stand-in for the backend's recompute trigger. The h03 demo adapter
 * calls it when a revoke takes effect. Does nothing without a session.
 */
export async function markDemoRecalculation(
  cause: PictureChangeCause,
): Promise<void> {
  if (!(await currentMemberId())) return;
  const state = await read();
  write({ ...state, picture: recalculating(state.picture, cause) });
}

export const demoCorrectionAdapter: CorrectionPort = {
  implementation: "demo",

  async listCorrections() {
    if (!(await currentMemberId())) return [];
    return [...(await read()).corrections].reverse();
  },

  async proposeCorrection(draft) {
    const state = await read();
    const correction: FactCorrection = {
      correction_id: demoId("demo-correction"),
      fact_id: draft.fact_id,
      proposed: draft.proposed,
      reason: draft.reason,
      status: "proposed",
      proposed_at: now(),
      decided_at: null,
      rejection_reason: null,
      is_demo: true,
    };
    write({ ...state, corrections: [...state.corrections, correction] });
    return correction;
  },

  async getPictureStatus() {
    if (!(await currentMemberId())) return { status: "current" };
    return (await read()).picture;
  },
};

/* ----------------------------------------------------------------------- */
/* Demo-only controls. Not part of CorrectionPort; a real adapter has none. */
/* ----------------------------------------------------------------------- */

export const demoCorrectionControls = {
  /** Stands in for the backend reviewer. Only a proposal can be decided. */
  async simulateReview(
    correctionId: string,
    decision: "accept" | "reject",
  ): Promise<void> {
    const state = await read();
    const target = state.corrections.find(
      (correction) => correction.correction_id === correctionId,
    );
    if (!target || target.status !== "proposed") return;
    const decided: FactCorrection = {
      ...target,
      status: decision === "accept" ? "accepted" : "rejected",
      decided_at: now(),
      rejection_reason: decision === "reject" ? DEMO_REJECTION_REASON : null,
    };
    write({
      ...state,
      corrections: state.corrections.map((correction) =>
        correction.correction_id === correctionId ? decided : correction,
      ),
      picture:
        decision === "accept"
          ? recalculating(state.picture, "correction_accepted")
          : state.picture,
    });
  },

  /** Forgets every correction and restores the unchanged fixture picture. */
  async reset(): Promise<void> {
    const state = await read();
    write(empty(state.member_id));
  },
};
