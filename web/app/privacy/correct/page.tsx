import type { Metadata } from "next";

import { CorrectFactScreen } from "@/components/correction/correct-fact-flow";
import { buildCorrectableFacts } from "@/lib/correction/facts";
import { loadHomeView } from "@/lib/data/home";

export const metadata: Metadata = { title: "Correct a fact" };

/**
 * The facts come from the same released view as Home (read, never changed),
 * reduced on the server to the viewer's own facts and the fields shown.
 */
export default async function CorrectFactPage(
  props: PageProps<"/privacy/correct">,
) {
  const { fact } = await props.searchParams;
  const facts = buildCorrectableFacts(await loadHomeView());
  return (
    <CorrectFactScreen
      facts={facts}
      initialFactId={typeof fact === "string" ? fact : null}
    />
  );
}
