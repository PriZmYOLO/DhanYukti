// Display-only formatting. No money maths happens on the client.

/**
 * Assisted mode: while someone else is helping, amounts are hidden until the
 * member chooses to show them. The app store sets this flag on every render.
 * (A global, not an exported setter: the bundler trims each page's copy of
 * this module to the exports that page uses.)
 */
const amountsHidden = () => Boolean((globalThis as { __dyHideAmounts?: boolean }).__dyHideAmounts);
const HIDDEN = "₹•••";

export const inr = (n: number | null | undefined) =>
  n == null ? "—" : amountsHidden() ? HIDDEN : `₹${Math.abs(n).toLocaleString("en-IN")}`;
export const inrSigned = (n: number) => (amountsHidden() ? HIDDEN : `${n < 0 ? "−" : ""}₹${Math.abs(n).toLocaleString("en-IN")}`);
/** A plain figure that is a rupee amount (e.g. "₹13 per ₹100"): hidden the same way. */
export const figure = (n: number | null | undefined) => (n == null ? "—" : amountsHidden() ? "•••" : String(n));

const MONTHS_HI = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const day = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS_HI[d.getMonth()]}`;
};
export const dayNum = (iso: string) => new Date(iso + "T00:00:00").getDate();

import type { Dashboard, Member } from "./types";
/** primary_user may be a member id or a name; resolve to the member. */
export const primaryMember = (d: Dashboard | null): Member | undefined =>
  d ? d.household.members.find((m) => m.id === d.household.primary_user || m.name.toLowerCase() === d.household.primary_user.toLowerCase()) ?? d.household.members[0] : undefined;
