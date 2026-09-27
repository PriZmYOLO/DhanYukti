import "server-only";

/**
 * Tiny key-value store for AA state. Webhooks and page requests run in
 * different serverless instances on Vercel, so production needs Redis
 * (Upstash REST, added from the Vercel Marketplace). Locally, an in-process
 * Map is used instead.
 */

type Command = (string | number)[];

const url =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const token =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

export const storeKind: "redis" | "memory" = url && token ? "redis" : "memory";

/** On Vercel without Redis, state would be lost between requests. */
export function storeUsable(): boolean {
  return storeKind === "redis" || !process.env.VERCEL;
}

interface MemoryEntry {
  value: string;
  expires: number | null;
}

const globalStore = globalThis as unknown as {
  __dyAaMemory?: Map<string, MemoryEntry>;
};
const memory = (globalStore.__dyAaMemory ??= new Map<string, MemoryEntry>());

async function redis(command: Command): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Store error ${response.status}`);
  const body = (await response.json()) as { result?: unknown; error?: string };
  if (body.error) throw new Error("Store command failed");
  return body.result ?? null;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (storeKind === "redis") {
    const raw = await redis(["GET", key]);
    return typeof raw === "string" ? (JSON.parse(raw) as T) : null;
  }
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expires !== null && entry.expires < Date.now()) {
    memory.delete(key);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

export async function kvSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const json = JSON.stringify(value);
  if (storeKind === "redis") {
    await redis(["SET", key, json, "EX", ttlSeconds]);
    return;
  }
  memory.set(key, { value: json, expires: Date.now() + ttlSeconds * 1000 });
}

/** Sets only if absent; true when this caller took the key (a lock). */
export async function kvSetIfAbsent(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<boolean> {
  if (storeKind === "redis") {
    const result = await redis([
      "SET",
      key,
      JSON.stringify(value),
      "NX",
      "EX",
      ttlSeconds,
    ]);
    return result === "OK";
  }
  if ((await kvGet(key)) !== null) return false;
  await kvSet(key, value, ttlSeconds);
  return true;
}

export async function kvDel(...keys: string[]): Promise<void> {
  if (!keys.length) return;
  if (storeKind === "redis") {
    await redis(["DEL", ...keys]);
    return;
  }
  for (const key of keys) memory.delete(key);
}
