import type { Metadata } from "next";

import { WelcomeScreen } from "@/components/onboarding/welcome-screen";

export const metadata: Metadata = { title: "Sign in" };

/** Only same-origin paths are accepted as a return destination. */
function safeNext(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : null;
}

export default async function WelcomePage(props: PageProps<"/welcome">) {
  const { next } = await props.searchParams;
  return <WelcomeScreen next={safeNext(next)} />;
}
