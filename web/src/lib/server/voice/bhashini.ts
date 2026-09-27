import "server-only";

/**
 * Bhashini (Government of India) client: pipeline config call on ULCA, then
 * the compute call on Dhruva. Server-only: the ULCA key and the inference
 * key never reach the browser. Only template-built nudge text is sent.
 *
 *   BHASHINI_USER_ID        ULCA "userID"            (My Profile)
 *   BHASHINI_ULCA_API_KEY   ULCA "ulcaApiKey"        (My Profile → Generate)
 *   BHASHINI_INFERENCE_KEY  optional: skip if config returns one
 *   BHASHINI_PIPELINE_ID    default 64392f96daac500b55c543cd (MeitY)
 *   BHASHINI_CONFIG_URL     default ULCA getModelsPipeline (overridable for a local mock)
 */

const CONFIG_URL =
  process.env.BHASHINI_CONFIG_URL ??
  "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline";
const PIPELINE_ID =
  process.env.BHASHINI_PIPELINE_ID ?? "64392f96daac500b55c543cd";

export function bhashiniConfigured(): boolean {
  return Boolean(
    process.env.BHASHINI_USER_ID && process.env.BHASHINI_ULCA_API_KEY,
  );
}

interface Pipeline {
  callbackUrl: string;
  authName: string;
  authValue: string;
  nmtServiceId: string | null;
  ttsServiceId: string | null;
  fetchedAt: number;
}

/** One pipeline config per target language (service ids differ by language). */
const cached = new Map<string, Pipeline>();
const CACHE_MS = 30 * 60 * 1000;

function safeUrl(url: string): boolean {
  if (url.startsWith("https://")) return true;
  // A local mock over http is allowed outside production only.
  return (
    process.env.NODE_ENV !== "production" &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)
  );
}

async function post(
  url: string,
  headers: Record<string, string>,
  body: unknown,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Bhashini HTTP ${response.status}`);
  return (await response.json()) as Record<string, unknown>;
}

async function pipeline(lang = "hi"): Promise<Pipeline> {
  const hit = cached.get(lang);
  if (hit && Date.now() - hit.fetchedAt < CACHE_MS) return hit;
  const body = await post(
    CONFIG_URL,
    {
      userID: process.env.BHASHINI_USER_ID ?? "",
      ulcaApiKey: process.env.BHASHINI_ULCA_API_KEY ?? "",
    },
    {
      pipelineTasks: [
        ...(lang === "en"
          ? []
          : [
              {
                taskType: "translation",
                config: { language: { sourceLanguage: "en", targetLanguage: lang } },
              },
            ]),
        { taskType: "tts", config: { language: { sourceLanguage: lang } } },
      ],
      pipelineRequestConfig: { pipelineId: PIPELINE_ID },
    },
  );
  const configs = (body.pipelineResponseConfig ?? []) as {
    taskType?: string;
    config?: {
      serviceId?: string;
      language?: { sourceLanguage?: string; targetLanguage?: string };
    }[];
  }[];
  const pick = (
    task: string,
    match: (l: { sourceLanguage?: string; targetLanguage?: string }) => boolean,
  ) =>
    configs
      .find((c) => c.taskType === task)
      ?.config?.find((c) => c.language && match(c.language))?.serviceId ?? null;
  const endpoint = (body.pipelineInferenceAPIEndPoint ?? {}) as {
    callbackUrl?: string;
    inferenceApiKey?: { name?: string; value?: string };
  };
  const callbackUrl =
    endpoint.callbackUrl ??
    "https://dhruva-api.bhashini.gov.in/services/inference/pipeline";
  if (!safeUrl(callbackUrl))
    throw new Error("Bhashini returned an unsafe endpoint");
  const authValue =
    process.env.BHASHINI_INFERENCE_KEY ?? endpoint.inferenceApiKey?.value ?? "";
  if (!authValue) throw new Error("No Bhashini inference key");
  const fresh: Pipeline = {
    callbackUrl,
    authName: endpoint.inferenceApiKey?.name ?? "Authorization",
    authValue,
    nmtServiceId: pick(
      "translation",
      (l) => l.sourceLanguage === "en" && l.targetLanguage === lang,
    ),
    ttsServiceId: pick("tts", (l) => l.sourceLanguage === lang),
    fetchedAt: Date.now(),
  };
  cached.set(lang, fresh);
  return fresh;
}

interface TaskOutput {
  taskType?: string;
  output?: { source?: string; target?: string }[];
  audio?: { audioContent?: string | null }[];
  config?: { audioFormat?: string; samplingRate?: number } | null;
}

async function compute(tasks: unknown[], source: string, lang = "hi") {
  const p = await pipeline(lang);
  const body = await post(
    p.callbackUrl,
    { [p.authName]: p.authValue },
    {
      pipelineTasks: tasks,
      inputData: { input: [{ source }] },
    },
  );
  return (body.pipelineResponse ?? []) as TaskOutput[];
}

function audioOf(outputs: TaskOutput[]) {
  const tts = outputs.find((o) => o.taskType === "tts");
  const content = tts?.audio?.[0]?.audioContent;
  if (!content) throw new Error("Bhashini returned no audio");
  const format = (tts?.config?.audioFormat ?? "wav").toLowerCase();
  return {
    base64: content,
    mime: format === "mp3" ? "audio/mpeg" : `audio/${format}`,
  };
}

function ttsTask(p: Pipeline, lang = "hi") {
  return {
    taskType: "tts",
    config: {
      language: { sourceLanguage: lang },
      ...(p.ttsServiceId ? { serviceId: p.ttsServiceId } : {}),
      gender: "female",
    },
  };
}

/** English → Hindi translation, then Hindi speech, in one chained call. */
export async function translateAndSpeak(english: string) {
  const p = await pipeline();
  const outputs = await compute(
    [
      {
        taskType: "translation",
        config: {
          language: { sourceLanguage: "en", targetLanguage: "hi" },
          ...(p.nmtServiceId ? { serviceId: p.nmtServiceId } : {}),
        },
      },
      ttsTask(p),
    ],
    english,
  );
  const hindi =
    outputs.find((o) => o.taskType === "translation")?.output?.[0]?.target ??
    null;
  return { hindi, audio: audioOf(outputs) };
}

/** Hindi speech only, for a reviewed Hindi text. */
export async function speakHindi(hindi: string) {
  const p = await pipeline();
  return audioOf(await compute([ttsTask(p)], hindi));
}

/**
 * Any Bhashini language: English → target translation, then speech in that
 * language, in one chained call. English is spoken without translation.
 * Throws "language_unavailable" when Bhashini's pipeline has no speech (or
 * translation) service for the language, so the caller can say so.
 */
export async function translateAndSpeakTo(english: string, lang: string) {
  const p = await pipeline(lang);
  if (!p.ttsServiceId || (lang !== "en" && !p.nmtServiceId)) {
    throw new Error("language_unavailable");
  }
  const tasks =
    lang === "en"
      ? [ttsTask(p, lang)]
      : [
          {
            taskType: "translation",
            config: {
              language: { sourceLanguage: "en", targetLanguage: lang },
              serviceId: p.nmtServiceId,
            },
          },
          ttsTask(p, lang),
        ];
  const outputs = await compute(tasks, english, lang);
  const text =
    lang === "en"
      ? english
      : (outputs.find((o) => o.taskType === "translation")?.output?.[0]
          ?.target ?? null);
  return { text, audio: audioOf(outputs) };
}
