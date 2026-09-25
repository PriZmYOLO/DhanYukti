import {
  CircleHelp,
  ClipboardCheck,
  FilePen,
  FlaskConical,
  Handshake,
  Landmark,
  PiggyBank,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import type { ActionKind } from "@/lib/contracts/decision-packet";

const icons: Record<ActionKind, LucideIcon> = {
  verify_fact: ClipboardCheck,
  reserve_in_plan: PiggyBank,
  draft_request: FilePen,
  review_debt: Landmark,
  check_protection: ShieldCheck,
  explore_referral: Handshake,
  run_scenario: FlaskConical,
};

/** Icon for an action kind; an unknown kind gets a neutral icon. */
export function ActionKindIcon({
  kind,
  className,
}: {
  kind: ActionKind;
  className?: string;
}) {
  const Icon = icons[kind] ?? CircleHelp;
  return <Icon aria-hidden className={className} />;
}
