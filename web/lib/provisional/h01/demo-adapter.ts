/**
 * ============================================================
 *  DEMO — NOT AUTHENTICATION, NOT AUTHORISATION
 * ============================================================
 *
 * Development stand-in for H01/H02/H03/H04 so the L02 screens can be used
 * before the backend exists. Replace it; do not extend it into a real system.
 *
 * - State lives in this browser tab's sessionStorage (dev/demo only). Each tab
 *   is a separate demo session; closing the tab ends it.
 * - No passwords, tokens, secrets or real identity data are stored.
 * - No network calls and no invented API routes.
 * - Invites: only the labelled DEMO-* fixture codes resolve. Any other code
 *   is reported as "couldn't check", never as valid or invalid.
 * - Other members are always "not_shared" (Guide §5 default deny). The real
 *   decision comes from H03.
 * - Manual money entries stay candidates; nothing is accepted or sent to Home.
 */
import type { Answer } from "@/lib/onboarding/answer";
import type { OnboardingPort } from "@/lib/provisional/h01/port";
import type {
  OnboardingSnapshot,
  ProvisionalInviteLookup,
  ProvisionalMemberAccess,
} from "@/lib/provisional/h01/types";

const STORAGE_KEY = "dhanyukti.l02-demo-session.v1";

interface StoredState {
  version: 1;
  snapshot: OnboardingSnapshot;
}

const EMPTY_SNAPSHOT: OnboardingSnapshot = {
  session: null,
  membership: null,
  members: [],
  context: null,
  money: null,
  presentation: { mode: "standard" },
};

/** Labelled fixture invites; not connected to the L01 Home fixture. */
const DEMO_INVITES: Record<
  string,
  | { status: "valid"; household_name: string }
  | { status: "expired" | "already_used" }
> = {
  "DEMO-INVITE": {
    status: "valid",
    household_name: "Demo invite household (fixture)",
  },
  "DEMO-EXPIRED": { status: "expired" },
  "DEMO-USED": { status: "already_used" },
};

const DEMO_INVITING_MEMBER: ProvisionalMemberAccess = {
  member_id: "demo-l02-inviting-member",
  display_label: "Adult who invited you (fixture)",
  access: "not_shared",
};

// Fallback when sessionStorage is unavailable (private mode, blocked storage).
let memoryState: OnboardingSnapshot = EMPTY_SNAPSHOT;

function read(): OnboardingSnapshot {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryState;
    const stored = JSON.parse(raw) as Partial<StoredState>;
    return stored.version === 1 && stored.snapshot
      ? stored.snapshot
      : EMPTY_SNAPSHOT;
  } catch {
    return memoryState;
  }
}

function write(snapshot: OnboardingSnapshot): OnboardingSnapshot {
  memoryState = snapshot;
  try {
    const stored: StoredState = { version: 1, snapshot };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage unavailable: keep the in-memory copy for this page only.
  }
  return snapshot;
}

function demoId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

function requireSession(snapshot: OnboardingSnapshot) {
  if (!snapshot.session) throw new Error("No demo session in this tab.");
  return snapshot.session;
}

function selfAccess(
  snapshot: OnboardingSnapshot,
  displayName: string | null,
): ProvisionalMemberAccess {
  return {
    member_id: requireSession(snapshot).member_id,
    display_label: displayName ?? "You",
    access: "self",
  };
}

function lookup(code: string): ProvisionalInviteLookup {
  const normalised = code.trim().toUpperCase();
  const invite = DEMO_INVITES[normalised];
  if (!invite) {
    return {
      status: "unavailable",
      code: normalised,
      reason:
        "The household service isn't connected in this build, so only the demo codes can be checked.",
    };
  }
  return invite.status === "valid"
    ? {
        status: "valid",
        code: normalised,
        household_name: invite.household_name,
        is_demo: true,
      }
    : { status: invite.status, code: normalised };
}

export const demoOnboardingAdapter: OnboardingPort = {
  implementation: "demo",

  async loadSnapshot() {
    return read();
  },

  async startSession({ display_name }) {
    const current = read();
    return write({
      ...EMPTY_SNAPSHOT,
      presentation: current.presentation,
      session: {
        member_id: demoId("demo-member"),
        display_name,
        started_at: new Date().toISOString(),
        is_demo: true,
      },
    });
  },

  async endSession() {
    const current = read();
    return write({ ...EMPTY_SNAPSHOT, presentation: current.presentation });
  },

  async createHousehold({
    household_name,
  }: {
    household_name: Answer<string>;
  }) {
    const current = read();
    const session = requireSession(current);
    if (current.membership) return current;
    return write({
      ...current,
      membership: {
        household_id: demoId("demo-household"),
        household_name,
        joined_via: "created",
        is_demo: true,
      },
      members: [selfAccess(current, session.display_name)],
    });
  },

  async lookupInvite(code) {
    return lookup(code);
  },

  async acceptInvite(code) {
    const current = read();
    const session = requireSession(current);
    const result = lookup(code);
    if (result.status !== "valid" || current.membership) {
      return { ok: false, lookup: result };
    }
    return {
      ok: true,
      snapshot: write({
        ...current,
        membership: {
          household_id: "demo-l02-invite-household",
          household_name: { state: "answered", value: result.household_name },
          joined_via: "invite",
          is_demo: true,
        },
        members: [
          selfAccess(current, session.display_name),
          DEMO_INVITING_MEMBER,
        ],
      }),
    };
  },

  async saveContext(context) {
    const current = read();
    requireSession(current);
    return write({ ...current, context });
  },

  async saveManualMoney(draft) {
    const current = read();
    requireSession(current);
    return write({
      ...current,
      money: {
        draft,
        source_kind: "declared",
        status: "demo_not_accepted",
        saved_at: new Date().toISOString(),
      },
    });
  },

  async setPresentation(presentation) {
    return write({ ...read(), presentation });
  },
};
