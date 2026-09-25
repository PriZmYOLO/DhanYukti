import type { Metadata } from "next";

import { InviteScreen } from "@/components/onboarding/invite-screen";

export const metadata: Metadata = { title: "Household invite" };

export default async function InvitePage(props: PageProps<"/invite/[code]">) {
  const { code } = await props.params;
  return <InviteScreen code={code} />;
}
