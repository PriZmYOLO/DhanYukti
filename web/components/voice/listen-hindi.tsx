"use client";

import { Volume2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { DateDisplay } from "@/components/finance/date-display";
import { resolveModeText } from "@/lib/display-mode";
import { setDpdpConsent } from "@/lib/dpdp/client";
import { voiceCopy, type VoiceCopyKey } from "@/lib/voice/copy";

interface VoiceResult {
  mode: "live" | "recorded";
  translation: "bhashini" | "reviewed_template";
  english: string;
  hindi: string;
  audio?: { base64: string; mime: string };
  url?: string;
  mime?: string;
  recorded_on?: string;
  sent_text: string | null;
  processor: string;
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "consent" }
  | { status: "ready"; result: VoiceResult; src: string }
  | { status: "error"; message: string };

/**
 * "Listen in Hindi" for the cash-shortfall nudge (Job 2c). Sends only the
 * typed amount and date to DhanYukti's server, which builds the sentence
 * and asks Bhashini. Shows exactly what left DhanYukti.
 */
export function ListenInHindi({
  amountPaise,
  date,
}: {
  amountPaise: number;
  date: string;
}) {
  const { snapshot } = useOnboarding();
  const mode = snapshot.presentation.mode;
  const text = useCallback(
    (k: VoiceCopyKey) => resolveModeText(voiceCopy[k], mode),
    [mode],
  );
  const [state, setState] = useState<State>({ status: "idle" });
  const [playFailed, setPlayFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(async (src: string) => {
    audioRef.current?.pause();
    const audio = new Audio(src);
    audioRef.current = audio;
    setPlayFailed(false);
    // Keep the Hindi text and "what was sent" even if the browser won't play.
    await audio.play().catch(() => setPlayFailed(true));
  }, []);

  async function request() {
    setState({ status: "loading" });
    const response = await fetch("/api/voice/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        nudge: "cash_short",
        params: { amount_paise: amountPaise, date },
      }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as
      | (VoiceResult & { error?: { code?: string; safe_message?: string } })
      | null;
    if (response?.status === 403 && body?.error?.code === "consent_required") {
      setState({ status: "consent" });
      return;
    }
    if (!response?.ok || !body) {
      setState({
        status: "error",
        message: body?.error?.safe_message ?? text("unavailable"),
      });
      return;
    }
    const src =
      body.mode === "live" && body.audio
        ? `data:${body.audio.mime};base64,${body.audio.base64}`
        : (body.url ?? "");
    setState({ status: "ready", result: body, src });
    await play(src);
  }

  async function consentAndListen() {
    await setDpdpConsent("voice", "grant");
    await request();
  }

  const buttonCls =
    "inline-flex items-center gap-2 rounded-full border border-current/40 px-3 py-1.5 text-sm font-medium hover:bg-white/10 disabled:opacity-60";

  return (
    <div className="space-y-2 text-sm" data-voice={state.status}>
      {state.status !== "ready" && (
        <button
          type="button"
          className={buttonCls}
          onClick={request}
          disabled={state.status === "loading"}
        >
          <Volume2 aria-hidden className="size-4" />
          {state.status === "loading" ? text("loading") : text("listen")}
        </button>
      )}

      {state.status === "consent" && (
        <div
          className="space-y-2 rounded-lg border border-current/30 p-3"
          data-voice-consent
        >
          <p className="font-semibold">{text("consentTitle")}</p>
          <p className="text-forest-muted">{text("consentBody")}</p>
          <button
            type="button"
            className={buttonCls}
            onClick={consentAndListen}
          >
            {text("consentGive")}
          </button>
        </div>
      )}

      {state.status === "error" && (
        <p role="status" className="text-forest-muted">
          {state.message}
        </p>
      )}

      {state.status === "ready" && (
        <div className="space-y-2" data-voice-mode={state.result.mode}>
          <button
            type="button"
            className={buttonCls}
            onClick={() => play(state.src)}
          >
            <Volume2 aria-hidden className="size-4" />
            {text("playAgain")}
          </button>
          {playFailed && (
            <p role="status" className="text-forest-muted text-xs">
              {text("failedPlay")}
            </p>
          )}
          <p lang="hi" className="text-base leading-relaxed">
            {state.result.hindi}
          </p>
          <p className="text-forest-muted text-xs">
            {state.result.mode === "live" ? (
              text("live")
            ) : (
              <>
                {text("recorded")}{" "}
                <DateDisplay value={state.result.recorded_on ?? null} />
              </>
            )}
            {" · "}
            {text(
              state.result.translation === "bhashini"
                ? "byBhashini"
                : "byReviewed",
            )}
          </p>
          <details className="text-forest-muted text-xs">
            <summary className="cursor-pointer">{text("sent")}</summary>
            <p className="mt-1" data-voice-sent>
              {state.result.sent_text
                ? `“${state.result.english}” → ${state.result.processor}`
                : text("sentNothing")}
            </p>
          </details>
        </div>
      )}
    </div>
  );
}
