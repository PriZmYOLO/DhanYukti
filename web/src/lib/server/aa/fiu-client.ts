import "server-only";

import { aaConfig } from "@/lib/server/aa/config";

/**
 * Calls to the Anumati FIU module (Integration Guide v1.1, §3, §5, §5a).
 * Server-only: the client secret never leaves this file's process.
 */

export interface FiuResult<T> {
  ok: boolean;
  status: number;
  body: T | null;
  /** Short provider message for server logs; never shown to users raw. */
  providerMessage: string | null;
}

async function call<T>(
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<FiuResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${aaConfig.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "X-Client-Id": aaConfig.clientId,
        "X-Client-Secret": aaConfig.clientSecret,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: null,
      providerMessage: error instanceof Error ? error.message : "network error",
    };
  }
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  const message =
    parsed && typeof parsed === "object"
      ? String(
          (parsed as Record<string, unknown>).message ??
            (parsed as Record<string, unknown>).error ??
            (parsed as Record<string, unknown>).code ??
            "",
        ) || null
      : text.slice(0, 200) || null;
  return {
    ok: response.ok,
    status: response.status,
    body: response.ok ? (parsed as T) : null,
    providerMessage: response.ok ? null : message,
  };
}

/** Timestamps in the guide's example format: 2026-01-01T00:00:00Z. */
function iso(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export interface ConsentRequestSpec {
  purposeCode: "103";
  purposeText: string;
  fiTypes: string[];
  fetchType: "ONETIME";
  historyMonths: number;
  consentMonths: number;
}

/** What DhanYukti asks for at onboarding (purpose 103 → ONETIME). */
export const ONBOARDING_CONSENT: ConsentRequestSpec = {
  purposeCode: "103",
  purposeText: "Aggregated statement",
  fiTypes: ["DEPOSIT"],
  fetchType: "ONETIME",
  historyMonths: 12,
  consentMonths: 12,
};

export interface StartConsentResponse {
  moduleReference: string;
  consentHandle: string;
  status: string;
  redirectUrl: string;
}

export function buildConsentBody(
  mobileNumber: string,
  spec: ConsentRequestSpec = ONBOARDING_CONSENT,
  now = new Date(),
) {
  const from = new Date(now);
  from.setUTCMonth(from.getUTCMonth() - spec.historyMonths);
  const expiry = new Date(now);
  expiry.setUTCMonth(expiry.getUTCMonth() + spec.consentMonths);
  return {
    customer: { mobileNumber },
    consent: {
      purposeCode: spec.purposeCode,
      purposeText: spec.purposeText,
      fiTypes: spec.fiTypes,
      fetchType: spec.fetchType,
      dataRange: { from: iso(from), to: iso(now) },
      dataLife: { unit: "MONTH", value: 12 },
      frequency: { unit: "MONTH", value: 1 },
      consentExpiry: iso(expiry),
    },
  };
}

/**
 * Starts the onboarding consent for these FI types. Only fiTypes change;
 * purpose 103, ONETIME, 12-month range, dataLife and frequency are the
 * values verified with Anumati.
 */
export function startConsent(
  mobileNumber: string,
  idempotencyKey: string,
  fiTypes: string[] = ONBOARDING_CONSENT.fiTypes,
): Promise<FiuResult<StartConsentResponse>> {
  return call<StartConsentResponse>(
    "/module/initiate/consent",
    buildConsentBody(mobileNumber, { ...ONBOARDING_CONSENT, fiTypes }),
    { "X-Idempotency-Key": idempotencyKey },
  );
}

export interface FipKeyMaterial {
  cryptoAlg?: string;
  curve?: string;
  Nonce: string;
  DHPublicKey: { KeyValue: string; expiry?: string };
}

export interface FiSession {
  fipId?: string;
  linkRefNumber?: string;
  maskedAccNumber?: string;
  encryptedFI?: string;
  fipKeyMaterial?: FipKeyMaterial;
  status?: string;
  [key: string]: unknown;
}

export interface GetDataResponse {
  moduleReference: string;
  consentHandle?: string;
  sessions: FiSession[];
  [key: string]: unknown;
}

export function getData(
  id: string,
  secret: string,
): Promise<FiuResult<GetDataResponse>> {
  return call<GetDataResponse>("/module/fi/fetch", { id, secret });
}

export function initiateFetch(
  moduleReference: string,
  keyMaterial: {
    Nonce: string;
    DHPublicKey: { expiry: string; KeyValue: string };
  },
): Promise<FiuResult<{ moduleReference: string; status: string }>> {
  return call("/module/initiate/fetch", {
    moduleReference,
    KeyMaterial: { cryptoAlg: "ECDH", curve: "Curve25519", ...keyMaterial },
  });
}
