// Display-only formatting. No money maths happens on the client.
export const inr = (n: number | null | undefined) =>
  n == null ? "—" : `₹${Math.abs(n).toLocaleString("en-IN")}`;
export const inrSigned = (n: number) => `${n < 0 ? "−" : ""}₹${Math.abs(n).toLocaleString("en-IN")}`;

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
