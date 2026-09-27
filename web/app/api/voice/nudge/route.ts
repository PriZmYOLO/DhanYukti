import { hasConsent } from "@/lib/server/dpdp/ledger";
import {
  errorResponse,
  noStore,
  sessionId,
  storageGuard,
} from "@/lib/server/aa/http";
import {
  bhashiniConfigured,
  speakHindi,
  translateAndSpeak,
} from "@/lib/server/voice/bhashini";
import {
  cashShortKey,
  cashShortText,
  numbersKept,
  validCashShort,
} from "@/lib/voice/nudges";
import { RECORDED_CLIPS } from "@/lib/voice/recorded";

export const maxDuration = 30;

/**
 * Hindi voice read-out of one nudge (Job 2c). The body carries only a
 * nudge id and typed values; the sentence is built here from a fixed
 * template, so nothing personal can be sent to Bhashini. Needs DPDP
 * consent "voice". Nothing is stored: no text, no audio, no log of either.
 */
export async function POST(request: Request) {
  const guard = storageGuard();
  if (guard) return guard;
  const body = (await request.json().catch(() => null)) as {
    nudge?: unknown;
    params?: unknown;
  } | null;
  const params =
    body?.nudge === "cash_short" ? validCashShort(body.params) : null;
  if (!params) {
    return errorResponse(
      400,
      "invalid_request",
      "That read-out isn't available.",
    );
  }
  const sid = await sessionId(false);
  if (!sid || !(await hasConsent(sid, "voice"))) {
    return errorResponse(
      403,
      "consent_required",
      "Give consent for voice read-outs first.",
    );
  }

  const { english, hindiReviewed } = cashShortText(params);
  const processor = "Bhashini (Government of India)";

  if (bhashiniConfigured()) {
    try {
      const live = await translateAndSpeak(english);
      if (live.hindi && numbersKept(english, live.hindi)) {
        return Response.json(
          {
            mode: "live",
            translation: "bhashini",
            english,
            hindi: live.hindi,
            audio: live.audio,
            sent_text: english,
            processor,
          },
          { headers: noStore },
        );
      }
      // The translation changed or dropped a number: speak the reviewed Hindi.
      const audio = await speakHindi(hindiReviewed);
      return Response.json(
        {
          mode: "live",
          translation: "reviewed_template",
          english,
          hindi: hindiReviewed,
          audio,
          sent_text: live.hindi
            ? `${english} | ${hindiReviewed}`
            : hindiReviewed,
          processor,
        },
        { headers: noStore },
      );
    } catch (error) {
      console.info(
        "[voice] bhashini_failed",
        error instanceof Error ? error.message : "?",
      );
    }
  }

  const clip = RECORDED_CLIPS.find((c) => c.key === cashShortKey(params));
  if (clip) {
    return Response.json(
      {
        mode: "recorded",
        translation: clip.translation,
        english: clip.english,
        hindi: clip.hindi,
        url: `/voice/${clip.file}`,
        mime: clip.mime,
        recorded_on: clip.recorded_on,
        sent_text: null,
        processor,
      },
      { headers: noStore },
    );
  }
  return errorResponse(
    503,
    "voice_unavailable",
    "Hindi read-out isn't connected on this deployment yet. Nothing was sent.",
    true,
  );
}
