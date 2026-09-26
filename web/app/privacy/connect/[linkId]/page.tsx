import type { Metadata } from "next";

import { ApprovalHandoff } from "@/components/consent/approval-handoff";
import { parseReturnTo } from "@/lib/consent/return-to";

export const metadata: Metadata = { title: "Approve linking" };

export default async function ApprovalPage(
  props: PageProps<"/privacy/connect/[linkId]">,
) {
  const [{ linkId }, { from }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  return <ApprovalHandoff linkId={linkId} returnTo={parseReturnTo(from)} />;
}
