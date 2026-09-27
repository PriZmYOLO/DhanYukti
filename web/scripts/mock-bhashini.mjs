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
const DEV = "०१२३४५६७८९";

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
    return json(res, 200, {
      pipelineResponseConfig: [
        {
          taskType: "translation",
          config: [
            {
              serviceId: "mock/indictrans-en-hi",
              language: { sourceLanguage: "en", targetLanguage: "hi" },
            },
          ],
        },
        {
          taskType: "tts",
          config: [
            {
              serviceId: "mock/indic-tts-hi",
              language: { sourceLanguage: "hi" },
              supportedVoices: ["male", "female"],
            },
          ],
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
        // Digits come back in Devanagari, like some real models do.
        let target = `[मॉक अनुवाद] ${source.replace(/\d/g, (d) => DEV[Number(d)])}`;
        if (process.env.MOCK_DROP_NUMBERS)
          target = target.replace(/[०-९,]+/, "");
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
