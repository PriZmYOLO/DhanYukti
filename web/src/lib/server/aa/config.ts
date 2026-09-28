import "server-only";

import { parseAllowList, type FiType } from "@/lib/aa/fi-types";

/**
 * Server-only settings for the Anumati FIU module (Vercel → Settings →
 * Environment Variables). Nothing here is ever sent to the browser.
 *
 *   ANUMATI_BASE_URL       default https://fiu-module-uat.anumati.co.in
 *   ANUMATI_CLIENT_ID      X-Client-Id, provisioned by Anumati
 *   ANUMATI_CLIENT_SECRET  X-Client-Secret, provisioned by Anumati
 *   ANUMATI_KEY_ESCROW     "true" (default in UAT): the private key and nonce
 *                          come back in the get-data payload (uatKeyMaterial)
 *   ANUMATI_KEY_ENCODING   "weierstrass" (default) | "x25519", for keys we
 *                          generate for PERIODIC re-fetches
 *   KV_REST_API_URL / KV_REST_API_TOKEN, or
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 *                          shared storage so webhooks and pages see the
 *                          same state on Vercel
 */
export const aaConfig = {
  baseUrl: (
    process.env.ANUMATI_BASE_URL ?? "https://fiu-module-uat.anumati.co.in"
  ).replace(/\/+$/, ""),
  clientId: process.env.ANUMATI_CLIENT_ID ?? "",
  clientSecret: process.env.ANUMATI_CLIENT_SECRET ?? "",
  keyEscrow: (process.env.ANUMATI_KEY_ESCROW ?? "true") !== "false",
  keyEncoding:
    process.env.ANUMATI_KEY_ENCODING === "x25519"
      ? ("x25519" as const)
      : ("weierstrass" as const),
  /** True for the UAT/sandbox module: accounts are labelled as test data. */
  isSandbox: /uat|sandbox|localhost|127\.0\.0\.1/.test(
    process.env.ANUMATI_BASE_URL ?? "uat",
  ),
};

/**
 * FI types this server may request (env AA_FI_TYPES, comma-separated ReBIT
 * names). Unset → DEPOSIT only, the verified behaviour. Rollback: set
 * AA_FI_TYPES=DEPOSIT and redeploy.
 */
export function allowedFiTypes(): FiType[] {
  return parseAllowList(process.env.AA_FI_TYPES);
}

export function aaConfigured(): boolean {
  return Boolean(aaConfig.clientId && aaConfig.clientSecret);
}
