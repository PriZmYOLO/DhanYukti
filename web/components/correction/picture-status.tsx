"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useCorrectionText } from "@/components/correction/correction-text";
import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { buttonVariants } from "@/components/ui/button";
import { correctionPort, type PictureStatus } from "@/lib/provisional/h07";

/**
 * Client cache of each member's picture status (from CorrectionPort). It is
 * the only client-held state derived from the household picture, so
 * "invalidating" Home/Why for a member means refreshing this entry and the
 * router's cached payload.
 */
const cache = new Map<string, PictureStatus>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function loadStatus(memberId: string): Promise<void> {
  const status = await correctionPort.getPictureStatus();
  cache.set(memberId, status);
  listeners.forEach((listener) => listener());
}

/**
 * This member's picture status. null while it is still being read; a tab
 * without a session has no member-specific picture, so it is "current".
 */
export function usePictureStatus(): PictureStatus | null {
  const { ready, snapshot } = useOnboarding();
  const memberId = snapshot.session?.member_id ?? null;
  const cached = useSyncExternalStore(
    subscribe,
    () => (memberId ? (cache.get(memberId) ?? null) : null),
    () => null,
  );

  useEffect(() => {
    if (memberId) void loadStatus(memberId);
  }, [memberId]);

  const status: PictureStatus | null = !ready
    ? null
    : memberId
      ? cached
      : { status: "current" };

  // Once React shows the right thing, lift the demo pre-paint hold (see
  // PicturePrepaint).
  const settled = status !== null;
  useEffect(() => {
    if (settled) delete document.documentElement.dataset.demoPicture;
  }, [settled]);

  return status;
}

/**
 * Call after a revoke or a decided correction: re-reads the picture status
 * and drops the router's cached payloads, so no stale figure is reused.
 */
export function useInvalidateHouseholdView(): () => Promise<void> {
  const router = useRouter();
  const { snapshot } = useOnboarding();
  const memberId = snapshot.session?.member_id ?? null;
  return useCallback(async () => {
    if (memberId) await loadStatus(memberId);
    router.refresh();
  }, [memberId, router]);
}

/**
 * Renders its children only while the picture is current (or still being
 * read — the server already sent them). While recalculating it renders
 * `replacement` instead, so no stale figure stays in the DOM. No wrapper
 * element, so layout is unchanged.
 */
export function PictureGate({
  children,
  replacement = null,
}: {
  children: ReactNode;
  replacement?: ReactNode;
}) {
  const status = usePictureStatus();
  return <>{status?.status === "recalculating" ? replacement : children}</>;
}

/** "Your household picture will be recalculated", with cause and date. */
export function RecalculatingNotice() {
  const status = usePictureStatus();
  const text = useCorrectionText();
  if (status?.status !== "recalculating") return null;

  return (
    <section aria-labelledby="recalc-heading" data-picture="recalculating">
      <AvailabilityState
        status="pending"
        // AvailabilityState puts its title in a <p>, so name it a heading.
        title={
          <span id="recalc-heading" role="heading" aria-level={2}>
            {text("recalcTitle")}
          </span>
        }
        description={text("recalcBody")}
        className="p-4 text-base sm:p-6"
      >
        <ul className="list-disc space-y-1 pl-5">
          {status.causes.map((cause) => (
            <li key={cause}>{text(`cause_${cause}`)}</li>
          ))}
        </ul>
        <p className="text-sm">
          {text("recalcSince")} <DateDisplay value={status.since} />
        </p>
        <p className="text-xs">{text("recalcDemo")}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href="/privacy/correct"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {text("recalcOpenCorrections")}
          </Link>
          <Link
            href="/privacy"
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            {text("recalcOpenPrivacy")}
          </Link>
        </div>
      </AvailabilityState>
    </section>
  );
}
