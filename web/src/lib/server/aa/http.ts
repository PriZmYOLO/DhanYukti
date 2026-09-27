import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import type { ErrorEnvelope } from "@/lib/contracts/common";
import { storeUsable } from "@/lib/server/aa/store";

/**
 * The AA session is a random, httpOnly cookie. It is not authentication:
 * it only keeps one browser's links apart from another's until H01's real
 * sign-in exists. It never holds a consent handle or provider data.
 */
const COOKIE = "dy_aa_session";

export async function sessionId(create: boolean): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing;
  if (!create) return null;
  const sid = randomUUID();
  jar.set(COOKIE, sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return sid;
}

export function errorResponse(
  status: number,
  code: string,
  safe_message: string,
  retryable = false,
) {
  const error: ErrorEnvelope = {
    request_id: randomUUID(),
    code,
    safe_message,
    retryable,
  };
  return Response.json({ error }, { status, headers: noStore });
}

export const noStore = { "Cache-Control": "no-store" };

/** On Vercel without Redis the flow can't work; say so instead of failing. */
export function storageGuard(): Response | null {
  return storeUsable()
    ? null
    : errorResponse(
        503,
        "storage_not_configured",
        "Bank linking isn't available on this deployment yet (storage not set up).",
        false,
      );
}
