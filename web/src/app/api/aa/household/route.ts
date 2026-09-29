import { listJoinedLinks, listLinks } from "@/lib/server/aa/links";
import { noStore, sessionId, storageGuard } from "@/lib/server/aa/http";

/**
 * Whose bank accounts feed this household, and how each shows. Link ids, the
 * member tag and status only: never another member's data.
 */
export async function GET() {
  const guard = storageGuard();
  if (guard) return guard;
  const sid = await sessionId(false);
  if (!sid) return Response.json({ accounts: [], joined_elsewhere: [] }, { headers: noStore });
  const [own, joined] = await Promise.all([listLinks(sid), listJoinedLinks(sid)]);
  const pick = (l: Awaited<ReturnType<typeof listLinks>>[number], from: "this_phone" | "their_phone") => ({
    link_id: l.link_id,
    member: l.member ?? null,
    consent_status: l.consent.status,
    import_status: l.import.status,
    from,
  });
  return Response.json(
    {
      accounts: [
        ...own.filter((l) => !l.is_demo && l.household !== "joined").map((l) => pick(l, "this_phone")),
        ...joined.map((l) => pick(l, "their_phone")),
      ],
      // Links THIS phone made into another family's household (from their invite).
      joined_elsewhere: own.filter((l) => l.household === "joined").map((l) => pick(l, "this_phone")),
    },
    { headers: noStore },
  );
}
