/**
 * PROVISIONAL wiring. L04/L05 screens depend only on `consentPort` and
 * `privateViewPort` (plus `demoConsentControls`, which only exists while the
 * port is the demo).
 *
 * When H03/N04 are delivered, implement ConsentPort against the real
 * contract, export it here instead of the demo adapter, and set
 * `demoConsentControls` to null.
 */
import {
  demoConsentAdapter,
  demoConsentControls as demoControls,
} from "@/lib/provisional/h03/demo-adapter";
import type { ConsentPort } from "@/lib/provisional/h03/port";
import type { PrivateViewPort } from "@/lib/provisional/h03/private-view";
import { demoPrivateViewAdapter } from "@/lib/provisional/h03/private-view-demo";

export const consentPort: ConsentPort = demoConsentAdapter;

/** The owner-only view (L05). Swap together with consentPort. */
export const privateViewPort: PrivateViewPort = demoPrivateViewAdapter;

/** Simulated approval and example states. null once a real port is wired. */
export const demoConsentControls: typeof demoControls | null =
  consentPort.implementation === "demo" ? demoControls : null;

export type { ConsentPort } from "@/lib/provisional/h03/port";
export type * from "@/lib/provisional/h03/private-view";
export * from "@/lib/provisional/h03/types";
