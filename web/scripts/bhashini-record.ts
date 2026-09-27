/**
 * Pre-generates the fallback Hindi clip for a nudge through REAL Bhashini
 * (Job 2c fallback). Run once when the key works; commit the clip and the
 * manifest. The app plays it only if live Bhashini is unavailable, and
 * labels it "Recorded earlier through Bhashini on <date>".
 *
 *   BHASHINI_USER_ID=… BHASHINI_ULCA_API_KEY=… npm run voice:record -- --amount 3000 --date 2026-09-28
 *
 * Never run this against a mock and commit the result: the label would be
 * false.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { speakHindi, translateAndSpeak } from "../src/lib/server/voice/bhashini";
import {
  cashShortKey,
  cashShortText,
  numbersKept,
  validCashShort,
} from "../src/lib/voice/nudges";

const args = process.argv.slice(2);
const arg = (name: string) => args[args.indexOf(`--${name}`) + 1];
const params = validCashShort({
  amount_paise: Math.round(Number(arg("amount")) * 100),
  date: arg("date"),
});
if (!params) {
  console.error("Usage: --amount <rupees> --date YYYY-MM-DD");
  process.exit(2);
}
if (
  /localhost|127\.0\.0\.1/.test(process.env.BHASHINI_CONFIG_URL ?? "") &&
  !process.env.ALLOW_MOCK_RECORDING
) {
  console.error(
    "Refusing to record from a local mock: the clip would be labelled as Bhashini.",
  );
  process.exit(2);
}

async function main(p: NonNullable<typeof params>) {
  const { english, hindiReviewed } = cashShortText(p);
  const live = await translateAndSpeak(english);
  const kept = live.hindi !== null && numbersKept(english, live.hindi);
  const audio = kept ? live.audio : await speakHindi(hindiReviewed);
  const ext = audio.mime.split("/")[1] ?? "wav";
  const key = cashShortKey(p);
  const file = `${key}.${ext}`;
  const outDir =
    process.env.VOICE_OUT_DIR ?? path.join(process.cwd(), "public/voice");
  const manifestPath =
    process.env.VOICE_MANIFEST ??
    path.join(process.cwd(), "lib/voice/recorded.json");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, file), Buffer.from(audio.base64, "base64"));

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    key: string;
  }[];
  const entry = {
    key,
    file,
    mime: audio.mime,
    recorded_on: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(new Date()),
    english,
    hindi: kept ? live.hindi : hindiReviewed,
    translation: kept ? "bhashini" : "reviewed_template",
  };
  writeFileSync(
    manifestPath,
    JSON.stringify([...manifest.filter((m) => m.key !== key), entry], null, 2) +
      "\n",
  );
  console.log(`Saved ${file} (${entry.translation}); manifest updated.`);
}

main(params!).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
