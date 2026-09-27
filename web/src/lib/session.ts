/**
 * One session cookie per browser, created once, before any call that stores
 * something (/api/aa/*, /api/dpdp/*). Concurrent first calls would otherwise
 * each create their own session. See src/app/api/aa/session/route.ts.
 */
let ready: Promise<void> | null = null;

export function ensureSession(): Promise<void> {
  ready ??= fetch("/api/aa/session", { method: "POST", cache: "no-store", credentials: "same-origin" })
    .then(() => undefined)
    .catch(() => { ready = null; });
  return ready;
}
