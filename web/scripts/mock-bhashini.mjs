#!/usr/bin/env node
/**
 * LOCAL MOCK of Bhashini (ULCA config + Dhruva compute) for development.
 * Not Bhashini: never demo it as Bhashini, never record clips from it.
 *
 *   node scripts/mock-bhashini.mjs            # port 4020
 *   MOCK_DROP_NUMBERS=1 node scripts/mock-bhashini.mjs   # translation loses a number
 *
 * App env: BHASHINI_CONFIG_URL=http://localhost:4020/config
 *          BHASHINI_USER_ID=mock-user BHASHINI_ULCA_API_KEY=mock-key
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 4020);
// Zero digit per language script, so the number guard is exercised for each.
const ZERO = { hi: 0x966, mr: 0x966, ne: 0x966, mai: 0x966, gom: 0x966, doi: 0x966, brx: 0x966, sa: 0x966,
  bn: 0x9e6, as: 0x9e6, pa: 0xa66, gu: 0xae6, or: 0xb66, ta: 0xbe6, te: 0xc66, kn: 0xce6, ml: 0xd66,
  ur: 0x6f0, sd: 0x660, ks: 0x6f0, sat: 0x1c50, mni: 0xabf0 };
// Languages the mock pretends have no voice, to rehearse "language_unavailable".
const NO_TTS = new Set((process.env.MOCK_NO_TTS ?? "ks").split(",").filter(Boolean));

function wavTone(seconds = 0.8, rate = 22050) {
  const n = Math.floor(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++)
    buf.writeInt16LE(
      Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 8000),
      44 + i * 2,
    );
  return buf.toString("base64");
}

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
const json = (res, status, obj) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
};

createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/config") {
    if (
      req.headers.userid !== "mock-user" ||
      req.headers.ulcaapikey !== "mock-key"
    )
      return json(res, 401, { message: "bad key" });
    const cfg = await body(req);
    const tasks = cfg.pipelineTasks ?? [];
    const target = tasks.find((t) => t.taskType === "translation")?.config?.language?.targetLanguage ?? "hi";
    const ttsLang = tasks.find((t) => t.taskType === "tts")?.config?.language?.sourceLanguage ?? target;
    return json(res, 200, {
      pipelineResponseConfig: [
        {
          taskType: "translation",
          config: [{ serviceId: `mock/indictrans-en-${target}`, language: { sourceLanguage: "en", targetLanguage: target } }],
        },
        {
          taskType: "tts",
          config: NO_TTS.has(ttsLang) ? [] : [{ serviceId: `mock/indic-tts-${ttsLang}`, language: { sourceLanguage: ttsLang }, supportedVoices: ["male", "female"] }],
        },
      ],
      pipelineInferenceAPIEndPoint: {
        callbackUrl: `http://localhost:${PORT}/compute`,
        inferenceApiKey: { name: "Authorization", value: "mock-inference" },
      },
    });
  }
  if (req.method === "POST" && req.url === "/compute") {
    if (req.headers.authorization !== "mock-inference")
      return json(res, 401, { message: "bad inference key" });
    const b = await body(req);
    const source = b.inputData?.input?.[0]?.source ?? "";
    const out = [];
    let text = source;
    for (const task of b.pipelineTasks ?? []) {
      if (task.taskType === "translation") {
        // Digits come back in the target script, like some real models do.
        const lang = task.config?.language?.targetLanguage ?? "hi";
        const zero = ZERO[lang] ?? 0x966;
        let target = `[mock ${lang}] ${source.replace(/\d/g, (d) => String.fromCodePoint(zero + Number(d)))}`;
        if (process.env.MOCK_DROP_NUMBERS)
          target = target.replace(/[^\s\]]*\p{Nd}[\p{Nd},]*/u, "");
        out.push({
          taskType: "translation",
          config: null,
          output: [{ source, target }],
        });
        text = target;
      }
      if (task.taskType === "tts") {
        out.push({
          taskType: "tts",
          config: {
            language: { sourceLanguage: "hi" },
            audioFormat: "wav",
            encoding: "base64",
            samplingRate: 22050,
          },
          audio: [{ audioContent: wavTone(), audioUri: null }],
        });
        console.log(`[mock-bhashini] tts ${text.length} chars`);
      }
    }
    return json(res, 200, { pipelineResponse: out });
  }
  json(res, 404, {});
}).listen(PORT, () =>
  console.log(
    `[mock-bhashini] on http://localhost:${PORT} (LOCAL MOCK, not Bhashini)`,
  ),
);
