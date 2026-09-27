/**
 * PROVISIONAL — the owner-only private view (Guide §5 viewer scope "only
 * me"), as the L05 screens consume it. NOT the backend contract.
 *
 * The backend releases a member's private facts to that member's own
 * session only. They are absent from every other member's payload — not
 * hidden by the UI — and they are never part of a household figure, so no
 * relative can work them out by subtracting one total from another.
 */
import type { IsoDate, MoneyPaise, SourceKind } from "@/lib/contracts/common";

export interface PrivateHolding {
  holding_id: string;
  label: string;
  /** null = not known, never zero. */
  amount: MoneyPaise | null;
  as_of: IsoDate | null;
  source_kind: SourceKind;
  source_label: string | null;
}

/** A reminder or suggestion released to the owner only. */
export interface PrivateNudge {
  nudge_id: string;
  title: string;
  body: string;
  due_on: IsoDate | null;
  /** true when written by the frontend team, not the decision engine. */
  is_ui_preview: boolean;
}

export type OwnPrivateView =
  | {
      status: "released";
      holdings: PrivateHolding[];
      nudges: PrivateNudge[];
      is_demo: boolean;
    }
  /** The member has not created or joined a household yet. */
  | { status: "no_household" }
  | { status: "unavailable"; reason: string };

export interface PrivateViewPort {
  readonly implementation: "demo" | "h03";
  /** The signed-in member's own private items. Never another member's. */
  getOwnPrivateView(): Promise<OwnPrivateView>;
}
