import { hasConsent } from "@/lib/server/dpdp/ledger";
import { errorResponse, noStore, sessionId, storageGuard } from "@/lib/server/aa/http";
import { bhashiniConfigured, translateAndSpeakTo } from "@/lib/server/voice/bhashini";
import { VOICE_CODES, voiceLanguage } from "@/lib/voice/languages";
import { numbersKept } from "@/lib/voice/nudges";

export const maxDuration = 30;

/**
 * Read-out of the text on a card the person tapped, in any language Bhashini
 * offers (English → that language → speech). Needs DPDP consent "voice".
 *
 * Privacy by construction:
 * - the browser removes family members' names before sending;
 * - the server refuses anything that looks like an account or phone
 *   number, an email or a link, and caps the length;
 * - numbers are never left to a model: if the translation changes or
 *   drops one, nothing is spoken and the app says so;
 * - nothing is stored or logged: not the text, not the audio.
 */
const MAX = 400;

export async function POST(request: Request) {
  const guard = storageGuard();
  if (guard) return guard;
  const body = (await request.json().catch(() => null)) as { text?: unknown; lang?: unknown } | null;
  const lang = typeof body?.lang === "string" && VOICE_CODES.has(body.lang) ? body.lang : "hi";
  const text = typeof body?.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";
  if (!text || text.length > MAX || /\d[\d\s-]{6,}\d/.test(text.replace(/[₹,]/g, "")) || /@|https?:|www\./i.test(text)) {
    return errorResponse(400, "invalid_request", "That text can't be read out.");
  }
  const sid = await sessionId(false);
  if (!sid || !(await hasConsent(sid, "voice"))) {
    return errorResponse(403, "consent_required", "Give consent for voice read-outs first.");
  }
  if (!bhashiniConfigured()) {
    return errorResponse(503, "voice_unavailable", "Bhashini isn't connected on this deployment yet. Nothing was sent.", true);
  }
  try {
    const live = await translateAndSpeakTo(text, lang);
    if (!live.text || !numbersKept(text, live.text)) {
      return errorResponse(422, "numbers_changed", "The translation changed a number, so it wasn't played.", false);
    }
    return Response.json(
      { mode: "live", processor: "Bhashini (Government of India)", lang, language: voiceLanguage(lang)?.en ?? lang, sent_text: text, text: live.text, hindi: lang === "hi" ? live.text : null, audio: live.audio },
      { headers: noStore },
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "?";
    console.info("[voice] bhashini_failed", lang, reason);
    if (reason === "language_unavailable") {
      return errorResponse(422, "language_unavailable", `Bhashini has no voice for ${voiceLanguage(lang)?.en ?? lang} right now.`, false);
    }
    return errorResponse(502, "voice_failed", "Bhashini didn't answer. Try again in a moment.", true);
  }
}
