"use client";

import { Download, ReceiptText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useConsentText } from "@/components/consent/consent-text";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import { Button } from "@/components/ui/button";
import { resolveModeText, type ModeText } from "@/lib/display-mode";
import {
  downloadReceipt,
  loadDpdpState,
  setDpdpConsent,
} from "@/lib/dpdp/client";
import {
  NOTICE_PURPOSES,
  purposeById,
  type DpdpState,
  type LedgerEntry,
  type NoticePurpose,
} from "@/lib/dpdp/notice";

/** Notice wording in the current display mode. */
export function useModeText() {
  const { snapshot } = useOnboarding();
  const mode = snapshot.presentation.mode;
  return useCallback(
    (entry: ModeText | null | undefined) =>
      entry ? resolveModeText(entry, mode) : "",
    [mode],
  );
}

/** Loads the DPDP state and exposes grant/withdraw with the new receipt. */
export function useDpdp() {
  const [state, setState] = useState<DpdpState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<LedgerEntry | null>(null);

  const reload = useCallback(() => {
    loadDpdpState()
      .then((loaded) => {
        setState(loaded);
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "unavailable"),
      );
  }, []);

  useEffect(reload, [reload]);

  const act = useCallback(
    async (purpose: NoticePurpose["id"], action: "grant" | "withdraw") => {
      const result = await setDpdpConsent(purpose, action);
      setState(result.state);
      setReceipt(result.receipt);
      return result.receipt;
    },
    [],
  );

  return { state, error, receipt, act, reload };
}

export function ReceiptNote({ entry }: { entry: LedgerEntry }) {
  const { text } = useConsentText();
  const t = useModeText();
  const purpose = purposeById(entry.subject);
  return (
    <div
      role="status"
      className="bg-card space-y-1 rounded-lg border p-3 text-sm"
      data-receipt={entry.receipt_id}
    >
      <p className="flex items-center gap-2 font-semibold">
        <ReceiptText aria-hidden className="text-primary size-4" />
        {text("receiptTitle")}
      </p>
      <p className="text-muted-foreground text-xs">
        {text(`ledger_${entry.kind}`)} · {t(purpose?.title)} ·{" "}
        <DateDisplay value={entry.at} /> · {text("receiptId")}{" "}
        <span className="font-mono">{entry.receipt_id}</span>
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => downloadReceipt(entry, t(purpose?.title))}
      >
        <Download aria-hidden />
        {text("receiptDownload")}
      </Button>
    </div>
  );
}

/**
 * The itemised DPDP notice: one card per purpose with purpose, data,
 * retention, processor, honest build status and a Give/Withdraw button of
 * the same size in the same place.
 */
export function DpdpPurposeList({ compact = false }: { compact?: boolean }) {
  const dpdp = useDpdp();
  return <DpdpPurposeItems dpdp={dpdp} compact={compact} />;
}

export function DpdpPurposeItems({
  dpdp,
  compact = false,
}: {
  dpdp: ReturnType<typeof useDpdp>;
  compact?: boolean;
}) {
  const { text } = useConsentText();
  const t = useModeText();
  const { state, error, receipt, act } = dpdp;
  const [busy, setBusy] = useState<string | null>(null);

  if (error) {
    return (
      <AvailabilityState status="unavailable" title={text("dpdpUnavailable")} />
    );
  }
  if (!state) {
    return (
      <p role="status" className="text-muted-foreground">
        {text("loading")}
      </p>
    );
  }

  async function toggle(id: NoticePurpose["id"], granted: boolean) {
    setBusy(id);
    try {
      await act(id, granted ? "withdraw" : "grant");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {receipt && <ReceiptNote entry={receipt} />}
      <ul className="space-y-3">
        {NOTICE_PURPOSES.map((purpose) => {
          const current = state.purposes.find((p) => p.id === purpose.id);
          const granted = current?.status === "granted";
          return (
            <li
              key={purpose.id}
              data-purpose={purpose.id}
              data-status={current?.status ?? "never_asked"}
              className="bg-card space-y-2 rounded-xl border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold">{t(purpose.title)}</h3>
                  <p className="text-muted-foreground text-xs">
                    {text(`consentStatus_${current?.status ?? "never_asked"}`)}
                    {current?.since && (
                      <>
                        {" "}
                        {text("consentSince")}{" "}
                        <DateDisplay value={current.since} />
                      </>
                    )}
                  </p>
                </div>
                {purpose.in_build ? (
                  <Button
                    size="xl"
                    variant={granted ? "outline" : "default"}
                    disabled={busy === purpose.id}
                    onClick={() => toggle(purpose.id, granted)}
                    aria-label={`${text(granted ? "consentWithdraw" : "consentGive")}: ${t(purpose.title)}`}
                  >
                    {text(granted ? "consentWithdraw" : "consentGive")}
                  </Button>
                ) : null}
              </div>
              {!compact && (
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {text("noticePurpose")}
                    </dt>
                    <dd>{t(purpose.purpose)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {text("noticeData")}
                    </dt>
                    <dd>{t(purpose.data)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {text("noticeRetention")}
                    </dt>
                    <dd>{t(purpose.retention)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {text("noticeProcessor")}
                    </dt>
                    <dd>
                      {purpose.processor
                        ? t(purpose.processor)
                        : text("noticeNoProcessor")}
                    </dd>
                  </div>
                </dl>
              )}
              <p className="text-muted-foreground text-xs">
                {!purpose.in_build
                  ? text("noticeNotInBuild")
                  : purpose.enforced
                    ? text("noticeEnforced")
                    : text("noticeNotEnforced")}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground text-xs">
        {text("noticeVersion")}{" "}
        <span className="font-mono">{state.notice_version}</span>
      </p>
    </div>
  );
}
