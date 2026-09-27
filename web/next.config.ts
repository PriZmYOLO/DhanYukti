import type { NextConfig } from "next";

// The browser only ever talks to /api on our own origin.
//
// Next.js serves its own route handlers first: the live Anumati Account
// Aggregator flow (/api/aa/*, incl. the registered webhooks), the DPDP ledger
// (/api/dpdp/*), the cover engine (/api/engine/*) and Bhashini voice
// (/api/voice/*). Everything else under /api falls through to FastAPI.
//
// `fallback` (not the default afterFiles) matters: afterFiles rewrites run
// before dynamic routes, so /api/aa/links/[linkId] would be sent to FastAPI.
// Sponsor keys for FastAPI live only in its own env, never here.
// On Vercel with no API_ORIGIN there is no FastAPI to proxy to: skip the
// rewrite, so /api/* misses get a plain 404 and the screens use demo data.
const API_ORIGIN =
  process.env.API_ORIGIN ?? (process.env.VERCEL ? null : "http://127.0.0.1:8000");

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: API_ORIGIN
        ? [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }]
        : [],
    };
  },
};

export default nextConfig;
