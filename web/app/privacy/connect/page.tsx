import type { Metadata } from "next";

import { ConsentExplainer } from "@/components/consent/consent-explainer";
import { parseReturnTo } from "@/lib/consent/return-to";

export const metadata: Metadata = { title: "Link your bank" };

export default async function ConnectPage(
  props: PageProps<"/privacy/connect">,
) {
  const { from } = await props.searchParams;
  return <ConsentExplainer returnTo={parseReturnTo(from)} />;
}
