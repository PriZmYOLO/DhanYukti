import type { Dashboard, NBA } from "@/lib/types";

/** When the engines find nothing urgent (a healthy household), channels still have a friendly "task". */
export function topTask(d: Dashboard): NBA {
  return d.nba[0] ?? {
    id: "all_good", tier: 4, tier_label: { hi: "Sab theek", en: "All good" }, severity: "green", engine: "E14", icon: "jar",
    title: { hi: "Aaj koi zaroori kaam nahi", en: "Nothing urgent today" },
    body: { hi: "Agle 30 din mein paisa kam nahi padta dikh raha.", en: "No shortfall in the next 30 days." },
    task: { hi: "Gullak mein thoda daalein", en: "Put a little in the Gullak" },
    if_not: { hi: "Kuch nahi bigadta", en: "Nothing goes wrong" },
    action: { type: "gullak", label: { hi: "Gullak", en: "Gullak" }, payload: {} },
    why: { saw: [], rule: { hi: "Agle 30 din ka hisaab dekha", en: "Checked the next 30 days" }, confidence: "andaaza", tag: "jaankari" },
    points: 5,
  };
}

/** Next salary date in the cash river, e.g. "30 Sep"; null if none is due. */
export function nextSalary(d: Dashboard): string | null {
  const day = d.river.days.find((x) => x.events.some((e) => e.type === "salary"));
  if (!day) return null;
  const dt = new Date(day.date + "T00:00:00");
  return `${dt.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dt.getMonth()]}`;
}
