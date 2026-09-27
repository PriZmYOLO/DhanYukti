"use client";

import { useCallback, useEffect, useState } from "react";

import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { correctionPort, type FactCorrection } from "@/lib/provisional/h07";

/**
 * This member's corrections from CorrectionPort. null while loading; empty
 * without a session. A list loaded for another member is never returned.
 */
export function useCorrections(): {
  corrections: FactCorrection[] | null;
  reload: () => Promise<void>;
} {
  const { ready, snapshot } = useOnboarding();
  const memberId = snapshot.session?.member_id ?? null;
  const [loaded, setLoaded] = useState<{
    memberId: string | null;
    list: FactCorrection[];
  } | null>(null);

  const reload = useCallback(async () => {
    const list = await correctionPort.listCorrections();
    setLoaded({ memberId, list });
  }, [memberId]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    correctionPort.listCorrections().then((list) => {
      if (!cancelled) setLoaded({ memberId, list });
    });
    return () => {
      cancelled = true;
    };
  }, [ready, memberId]);

  return {
    corrections: loaded?.memberId === memberId ? loaded.list : null,
    reload,
  };
}
