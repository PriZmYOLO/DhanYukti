/**
 * Clips pre-generated through Bhashini (scripts/bhashini-record.ts), used
 * only when live Bhashini is unavailable, and always labelled "recorded".
 * A clip is played only for exactly the same nudge and values.
 */
import recorded from "@/lib/voice/recorded.json";

export interface RecordedClip {
  key: string;
  file: string;
  mime: string;
  recorded_on: string;
  english: string;
  hindi: string;
  translation: "bhashini" | "reviewed_template";
}

export const RECORDED_CLIPS = recorded as RecordedClip[];
