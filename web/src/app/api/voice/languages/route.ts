import { bhashiniConfigured } from "@/lib/server/voice/bhashini";
import { noStore } from "@/lib/server/aa/http";
import { VOICE_LANGUAGES } from "@/lib/voice/languages";

/** The read-out languages, and whether Bhashini is connected on this deployment. */
export async function GET() {
  return Response.json({ configured: bhashiniConfigured(), languages: VOICE_LANGUAGES }, { headers: noStore });
}
