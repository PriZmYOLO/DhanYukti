/**
 * ============================================================
 *  DEMO / FIXTURE DATA — NOT A REAL PERSON'S MONEY
 * ============================================================
 *
 * Private items for the demo member who JOINED with an invite. Loaded only
 * by `import()` in that member's own tab (see ../private-view-demo.ts), so
 * this chunk never reaches the creating member's browser. The nudge is a UI
 * preview written by the frontend team, not a decision-engine output.
 */
import type { OwnPrivateView } from "@/lib/provisional/h03/private-view";

const SOURCE = "Entered by you (fixture)";

export const invitedMemberPrivateView: OwnPrivateView = {
  status: "released",
  is_demo: true,
  holdings: [
    {
      holding_id: "fixture-private-invited-chit",
      label: "Chit fund, your share paid so far",
      amount: { amount_paise: 2_730_000, currency: "INR" },
      as_of: "2026-09-01",
      source_kind: "declared",
      source_label: SOURCE,
    },
    {
      holding_id: "fixture-private-invited-savings",
      label: "Personal savings",
      amount: { amount_paise: 964_000, currency: "INR" },
      as_of: "2026-09-18",
      source_kind: "declared",
      source_label: SOURCE,
    },
  ],
  nudges: [
    {
      nudge_id: "fixture-private-invited-nudge-chit",
      title: "Check the date of your next chit fund draw",
      body: "Knowing the date helps you plan your own money. It is shown only to you.",
      due_on: "2026-10-05",
      is_ui_preview: true,
    },
  ],
};
