"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useText } from "@/components/onboarding/onboarding-provider";
import { onboardingCopy, type CopyKey } from "@/lib/onboarding/copy";

/**
 * The wide-screen side panel of a setup step (≥1280px). The frame owns the
 * panel and its slots; each form portals its "Why we ask this" text and live
 * summary into them, so nothing has to be synced between the two.
 */
export interface PanelSlots {
  why: HTMLElement | null;
  summary: HTMLElement | null;
}

export const PanelSlotsContext = createContext<PanelSlots | null>(null);

function isCopyKey(value: string): value is CopyKey {
  return Object.hasOwn(onboardingCopy, value);
}

/**
 * Tracks which field last had focus, via the nearest `data-why` ancestor.
 * Spread `onFocus` on an element that contains the fields.
 */
export function useFocusedWhy(fallback: CopyKey) {
  const [focused, setFocused] = useState<CopyKey | null>(null);
  const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    const key = event.target.closest<HTMLElement>("[data-why]")?.dataset.why;
    if (key && isCopyKey(key)) setFocused(key);
  }, []);
  return { why: focused ?? fallback, onFocus };
}

export interface SummaryRow {
  label: string;
  value: ReactNode;
}

/** Fills the side panel's slots. Renders nothing below 1280px. */
export function SetupPanel({
  why,
  summary,
  summaryNote = true,
}: {
  why: CopyKey;
  summary?: SummaryRow[];
  /** Show "Not saved until you press Save and continue". */
  summaryNote?: boolean;
}) {
  const slots = useContext(PanelSlotsContext);
  const text = useText();
  if (!slots) return null;

  return (
    <>
      {slots.why &&
        createPortal(
          <p className="text-muted-foreground text-sm">{text(why)}</p>,
          slots.why,
        )}
      {summary &&
        slots.summary &&
        createPortal(
          <section className="bg-card space-y-2 rounded-xl border p-4">
            <h2 className="text-sm font-semibold">
              {text("liveSummaryHeading")}
            </h2>
            <dl className="divide-y text-sm">
              {summary.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-3 py-1.5"
                >
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="min-w-0 text-right">{row.value}</dd>
                </div>
              ))}
            </dl>
            {summaryNote && (
              <p className="text-muted-foreground text-xs">
                {text("liveSummaryNote")}
              </p>
            )}
          </section>,
          slots.summary,
        )}
    </>
  );
}

/** Frame-side: the panel element's slots, set through callback refs. */
export function usePanelSlots() {
  const [why, setWhy] = useState<HTMLElement | null>(null);
  const [summary, setSummary] = useState<HTMLElement | null>(null);
  const slots = useMemo(() => ({ why, summary }), [why, summary]);
  return { slots, whyRef: setWhy, summaryRef: setSummary };
}
