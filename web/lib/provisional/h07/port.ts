/**
 * PROVISIONAL — the operations L05 screens need from H07, as TypeScript
 * signatures.
 *
 * This is deliberately NOT a list of HTTP routes. The backend decides the
 * real routes, payloads and errors; a backend-backed adapter implements this
 * interface by calling them. The actor is always derived from the session on
 * the backend side, so no method takes a member id.
 */
import type {
  FactCorrection,
  FactCorrectionDraft,
  PictureStatus,
} from "@/lib/provisional/h07/types";

export interface CorrectionPort {
  /** "demo" until an H07-backed adapter exists. */
  readonly implementation: "demo" | "h07";

  /** This member's own corrections, newest first. */
  listCorrections(): Promise<FactCorrection[]>;

  /**
   * Records a proposal. It always comes back "proposed": nothing about the
   * fact changes until the backend accepts it.
   */
  proposeCorrection(draft: FactCorrectionDraft): Promise<FactCorrection>;

  /**
   * Whether the household picture must be recalculated after a revoke or an
   * accepted correction. While "recalculating", no figure from the old
   * picture may be shown.
   */
  getPictureStatus(): Promise<PictureStatus>;
}
