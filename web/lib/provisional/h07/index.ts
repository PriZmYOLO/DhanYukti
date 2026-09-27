/**
 * PROVISIONAL wiring. L05 screens depend only on `correctionPort` (plus
 * `demoCorrectionControls`, which only exists while the port is the demo).
 *
 * When H07 is delivered, implement CorrectionPort against the real
 * contract, export it here instead of the demo adapter, and set
 * `demoCorrectionControls` to null.
 */
import {
  demoCorrectionAdapter,
  demoCorrectionControls as demoControls,
} from "@/lib/provisional/h07/demo-adapter";
import type { CorrectionPort } from "@/lib/provisional/h07/port";

export const correctionPort: CorrectionPort = demoCorrectionAdapter;

/** Simulated review and reset. null once a real port is wired. */
export const demoCorrectionControls: typeof demoControls | null =
  correctionPort.implementation === "demo" ? demoControls : null;

export type { CorrectionPort } from "@/lib/provisional/h07/port";
export * from "@/lib/provisional/h07/types";
