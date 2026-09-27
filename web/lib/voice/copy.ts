import type { ModeText } from "@/lib/display-mode";

/** Voice read-out wording (Job 2c). */
export const voiceCopy = {
  listen: {
    standard: "हिंदी में सुनें · Listen in Hindi",
    simple: "हिंदी में सुनें · Listen in Hindi",
  },
  loading: { standard: "Preparing Hindi audio…", simple: "Getting the audio…" },
  playAgain: { standard: "Play again", simple: "Play again" },
  consentTitle: { standard: "Hear this in Hindi?", simple: "Listen in Hindi?" },
  consentBody: {
    standard:
      "DhanYukti sends only this sentence (an amount and a date, no name or account) to Bhashini, the Government of India's language service, to translate and read it aloud. Nothing is stored. You can withdraw any time in the Consent Passport.",
    simple:
      "We send only this sentence to Bhashini (Government of India). No name, no account. Nothing is kept.",
  },
  consentGive: {
    standard: "Give consent and listen",
    simple: "Allow and listen",
  },
  live: { standard: "Live from Bhashini", simple: "From Bhashini" },
  recorded: {
    standard: "Recorded earlier through Bhashini on",
    simple: "Recorded through Bhashini on",
  },
  byBhashini: {
    standard: "Translated by Bhashini",
    simple: "Translated by Bhashini",
  },
  byReviewed: {
    standard:
      "Reviewed Hindi: the machine translation changed a number, so it wasn't used",
    simple: "Checked Hindi text used",
  },
  sent: { standard: "What was sent", simple: "What we sent" },
  sentNothing: {
    standard: "Nothing was sent: this is a saved recording.",
    simple: "Nothing sent: saved recording.",
  },
  unavailable: {
    standard: "Hindi read-out isn't connected yet. Nothing was sent.",
    simple: "Hindi audio isn't ready yet.",
  },
  failedPlay: {
    standard: "The audio couldn't play in this browser.",
    simple: "Audio didn't play.",
  },
} satisfies Record<string, ModeText>;

export type VoiceCopyKey = keyof typeof voiceCopy;
