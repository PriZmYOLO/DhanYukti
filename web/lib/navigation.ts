import {
  CalendarRange,
  House,
  ListChecks,
  MessageCircle,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { brand } from "@/lib/brand";

/** The six app areas from Technical Guide §26. */
export type AppAreaId =
  "home" | "family" | "plan" | "ask" | "activity" | "privacy";

export interface AppArea {
  id: AppAreaId;
  href: string;
  /** Short label used in navigation. */
  label: string;
  /** Page heading. */
  title: string;
  /** Plain-language description of what the area will hold. */
  summary: string;
  icon: LucideIcon;
}

export const appAreas: readonly AppArea[] = [
  {
    id: "home",
    href: "/",
    label: "Home",
    title: "Home",
    summary:
      "Your next step, what you can safely spend and upcoming dates, with the reasons behind them.",
    icon: House,
  },
  {
    id: "family",
    href: "/family",
    label: "Family",
    title: "Family",
    summary:
      "Household members, what each person has chosen to share, and the money rules your household agrees on.",
    icon: Users,
  },
  {
    id: "plan",
    href: "/plan",
    label: "Plan",
    title: "Plan",
    summary:
      "Your money calendar, goals, “can we afford this?” checks and what-if scenarios.",
    icon: CalendarRange,
  },
  {
    id: "ask",
    href: "/ask",
    label: "Ask",
    title: brand.askLabel,
    summary:
      "Ask why a step was suggested, or what would change if something in your plan changed.",
    icon: MessageCircle,
  },
  {
    id: "activity",
    href: "/activity",
    label: "Activity",
    title: "Activity",
    summary: "Reminders, the steps you have taken and what came of them.",
    icon: ListChecks,
  },
  {
    id: "privacy",
    href: "/privacy",
    label: "Privacy",
    title: "Privacy",
    summary:
      "What you share, with whom and for what purpose. Revoke access, correct a fact or raise a concern.",
    icon: ShieldCheck,
  },
];

export function getAppArea(id: AppAreaId): AppArea {
  const area = appAreas.find((candidate) => candidate.id === id);
  if (!area) throw new Error(`Unknown app area: ${id}`);
  return area;
}

export function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
