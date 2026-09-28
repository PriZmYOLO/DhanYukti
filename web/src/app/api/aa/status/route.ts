import { connection } from "next/server";

import {
  aaConfig,
  aaConfigured,
  allowedFiTypes,
} from "@/lib/server/aa/config";
import { noStore } from "@/lib/server/aa/http";
import { storeKind, storeUsable } from "@/lib/server/aa/store";

/**
 * Deployment check for the team: is the AA integration configured? Never
 * returns a secret, only yes/no and the module host.
 */
export async function GET() {
  await connection();
  return Response.json(
    {
      credentials_configured: aaConfigured(),
      module_host: new URL(aaConfig.baseUrl).host,
      sandbox: aaConfig.isSandbox,
      key_escrow: aaConfig.keyEscrow,
      storage: storeKind,
      storage_ready: storeUsable(),
      live_ui_enabled: process.env.NEXT_PUBLIC_AA_LIVE === "true",
      /** FI types this server may request (AA_FI_TYPES; default DEPOSIT). */
      fi_types_allowed: allowedFiTypes(),
      webhooks: {
        data_ready: "/api/aa/webhooks/data-ready",
        consent_lifecycle: "/api/aa/webhooks/consent",
      },
    },
    { headers: noStore },
  );
}
