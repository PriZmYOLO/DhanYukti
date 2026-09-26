/**
 * ============================================================
 *  DEMO / FIXTURE DATA — NOT A REAL PERSON'S MONEY
 * ============================================================
 *
 * Private items for the demo member who CREATED the household. Loaded only
 * by `import()` in that member's own tab (see ../private-view-demo.ts), so
 * this chunk never reaches an invited member's browser. The nudge is a UI
 * preview written by the frontend team, not a decision-engine output.
 */
import type { OwnPrivateView } from "@/lib/provisional/h03/private-view";

const SOURCE = "Entered by you (fixture)";

export const createdMemberPrivateView: OwnPrivateView = {
  status: "released",
  is_demo: true,
  holdings: [
    {
      holding_id: "fixture-private-created-rd",
      label: "Recurring deposit in your own name",
      amount: { amount_paise: 4_825_000, currency: "INR" },
      as_of: "2026-09-15",
      source_kind: "declared",
      source_label: SOURCE,
    },
    {
      holding_id: "fixture-private-created-savings",
      label: "Savings kept aside for yourself",
      amount: { amount_paise: 1_175_000, currency: "INR" },
      as_of: "2026-09-20",
      source_kind: "declared",
      source_label: SOURCE,
    },
  ],
  nudges: [
    {
      nudge_id: "fixture-private-created-nudge-rd",
      title: "Decide whether to renew your recurring deposit",
      body: "It matures soon. Renewing, withdrawing or moving it is your decision; nobody else in the household is told.",
      due_on: "2026-10-15",
      is_ui_preview: true,
    },
  ],
};
