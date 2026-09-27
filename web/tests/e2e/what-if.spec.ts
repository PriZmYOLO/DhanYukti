import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { pageText, startDemoSession, VIEWPORTS } from "./helpers";

/**
 * What-if (L06 + L07) against the labelled h08 demo adapter. Every figure
 * asserted here is a Technical Guide §30 golden value; nothing is simulated.
 */

const RECALC_TITLE = "Your household picture will be recalculated";
const WHAT_IF = "/plan/what-if";

async function gotoWhatIf(page: Page) {
  await page.goto(WHAT_IF);
  await expect(page.locator("[data-key-figures]")).toBeVisible();
}

const result = (page: Page, preset: string) =>
  page.locator(`[data-scenario="${preset}"]`);

/** A key-figures cell: column 0 is "Plan today", 1 is "With this change". */
const cell = (page: Page, row: string, column: 0 | 1): Locator =>
  page
    .locator(`[data-key-figures] tr[data-figure="${row}"]`)
    .locator("td")
    .nth(column);

async function choose(page: Page, label: string | RegExp) {
  await page.getByRole("radio", { name: label }).check();
}

async function expectAmountOn(
  target: Locator,
  amount: string,
  date: string | null,
) {
  await expect(target.locator("data")).toHaveText(amount);
  if (date) {
    await expect(target.locator(`time[datetime="${date}"]`)).toHaveCount(1);
  }
}

async function expectBaselineColumn(page: Page) {
  await expectAmountOn(cell(page, "firstShortfall", 0), "₹3,000", "2026-09-28");
  await expectAmountOn(cell(page, "lowestPoint", 0), "−₹3,500", "2026-09-29");
  await expectAmountOn(cell(page, "belowFloorBy", 0), "₹5,500", null);
}

test("baseline and emergency match §30; no feasible option", async ({
  page,
}) => {
  await gotoWhatIf(page);
  await expect(page.locator("[data-preview-banner]")).toContainText(
    "Preview, your plan is unchanged",
  );
  // Emergency is the first choice shown.
  await expect(page.getByRole("radio", { name: /Emergency/ })).toBeChecked();
  const emergency = result(page, "emergency");
  await expect(emergency).toBeVisible();
  await expectBaselineColumn(page);

  await expectAmountOn(cell(page, "firstShortfall", 1), "₹1,500", "2026-09-27");
  await expectAmountOn(cell(page, "lowestPoint", 1), "−₹7,500", "2026-09-29");
  await expect(
    emergency.locator('[data-verdict="no_feasible_option"]'),
  ).toContainText("No feasible option in this preview");
  // The preset itself: +₹4,000 on 26 Sept.
  await expect(
    page.getByRole("radio", { name: /Emergency/ }).locator(".."),
  ).toContainText("₹4,000");
  await expect(emergency).toContainText("Emergency expense");
  await expect(
    emergency
      .locator("li")
      .filter({ hasText: "Emergency expense" })
      .locator('time[datetime="2026-09-26"]'),
  ).toHaveCount(1);

  // The day table (same horizon for both): 26 Sept drops to ₹500.
  await emergency.getByText("Day-by-day figures").click();
  const day26 = emergency.locator('tr[data-day="2026-09-26"] data');
  await expect(day26).toHaveText(["₹4,500", "₹500"]);
  await expect(emergency.locator("tr[data-day]")).toHaveCount(8);
});

test("conditional fee delay leaves ₹2,500 and is not accepted", async ({
  page,
}) => {
  await gotoWhatIf(page);
  await page
    .getByRole("checkbox", { name: /Move the school fee to salary day/ })
    .check();
  const delay = result(page, "emergency_fee_delay");
  await expect(delay).toBeVisible();
  await expect(delay.locator("[data-residual] data")).toHaveText("₹2,500");
  await expect(delay.locator("[data-residual] time")).toHaveAttribute(
    "datetime",
    "2026-09-30",
  );
  await expect(
    delay.locator('[data-verdict="no_feasible_option"]'),
  ).toContainText("The crisis is not solved.");
  const moved = delay.locator("li").filter({ hasText: "School fee" });
  await expect(moved).toContainText("Conditional, not accepted");
  await expect(moved.locator('time[datetime="2026-09-28"]')).toHaveCount(1);
  await expectBaselineColumn(page);

  // The dates list keeps 28 Sept; 30 Sept is only a conditional suggestion.
  const fee = page.locator('[data-plan-date="demo-date-school-fee"]');
  await expect(fee.locator("time").first()).toHaveAttribute(
    "datetime",
    "2026-09-28",
  );
  const suggestion = fee.locator('[data-suggestion="conditional"]');
  await expect(suggestion).toContainText("Conditional, not accepted");
  await expect(suggestion.locator("time")).toHaveAttribute(
    "datetime",
    "2026-09-30",
  );
});

test("cash purchase: minimum −₹5,500; loan shows no total cost", async ({
  page,
}) => {
  await gotoWhatIf(page);
  await choose(page, /^A purchase/);
  await expect(result(page, "cash_purchase")).toBeVisible();
  await expectAmountOn(cell(page, "lowestPoint", 1), "−₹5,500", "2026-09-29");
  await expectBaselineColumn(page);

  await choose(page, "On a loan");
  const loan = result(page, "loan_purchase");
  await expect(loan).toBeVisible();
  await expect(loan).toContainText("Total cost needs full loan terms");
  // The only amount about the loan is what is borrowed; never a total.
  await expect(loan.locator("[data-loan] data")).toHaveText(["₹2,000"]);
  await expect(loan).not.toContainText(/total( cost)?\s*(is|of|:)?\s*[−-]?₹/i);
  for (const row of ["firstShortfall", "lowestPoint", "belowFloorBy"]) {
    await expect(cell(page, row, 1)).toHaveText("Pending");
  }
  await expect(loan).toContainText("The change is not drawn");
});

test("hidden asset leaves shared cash unchanged", async ({ page }) => {
  await gotoWhatIf(page);
  await choose(page, /A locked or private asset/);
  const asset = result(page, "hidden_asset");
  await expect(asset.locator('[data-verdict="feasible"]')).toContainText(
    "Shared available cash is unchanged.",
  );
  for (const row of ["firstShortfall", "lowestPoint", "belowFloorBy"]) {
    await expect(cell(page, row, 1)).toHaveText(
      (await cell(page, row, 0).textContent()) ?? "",
    );
  }
  await expectBaselineColumn(page);
  await asset.getByText("Day-by-day figures").click();
  for (const row of await asset.locator("tr[data-day]").all()) {
    const [today, whatIf] = await row.locator("data").allTextContents();
    expect(whatIf).toBe(today);
  }
});

test("no provider result is pending, never ₹0", async ({ page }) => {
  await gotoWhatIf(page);
  await choose(page, /A source doesn.t respond/);
  const pending = result(page, "no_provider");
  await expect(pending.locator('[data-verdict="pending"]')).toContainText(
    "Result pending. It is not zero",
  );
  await expect(pending.locator('[data-verdict="pending"]')).toContainText(
    "demo-timeout-001",
  );
  for (const row of ["firstShortfall", "lowestPoint", "belowFloorBy"]) {
    await expect(cell(page, row, 1)).toHaveText("Pending");
  }
  await expect(pending.locator('data[value="0"]')).toHaveCount(0);
  await expect(pending.locator("[data-key-figures] data")).toHaveCount(3);
});

test("goal gap ₹4,000 before/after; approve opens a draft only", async ({
  page,
}) => {
  await gotoWhatIf(page);
  const goal = page.locator("section[aria-labelledby='goal-heading']");
  const before = goal.locator('[data-goal-bar="goalBefore"]');
  const after = goal.locator('[data-goal-bar="goalAfter"]');
  await expect(goal).toContainText("₹15,000");
  await expect(before.locator("[data-goal-figure] data")).toHaveText([
    "₹5,000",
    "₹10,000",
  ]);
  await expect(after.locator("[data-goal-figure] data")).toHaveText([
    "₹5,000",
    "₹6,000",
    "₹4,000",
  ]);
  await expect(after.locator('[data-goal-figure="goalGap"] data')).toHaveText(
    "₹4,000",
  );
  await expect(goal).toContainText("2 × ₹3,000");

  await goal.getByRole("button", { name: "Approve this plan" }).click();
  const draft = goal.locator("[data-goal-draft]");
  await expect(draft).toBeFocused();
  await expect(draft).toContainText("Draft: not approved yet");
  await expect(draft).toContainText("action service (L08)");
  await expect(draft.getByRole("button", { name: /Confirm/ })).toBeDisabled();
  await draft.getByRole("button", { name: "Discard draft" }).click();
  await expect(
    goal.getByRole("button", { name: "Approve this plan" }),
  ).toBeVisible();
});

test("dates show confirmed vs inferred badges", async ({ page }) => {
  await gotoWhatIf(page);
  const badge = (id: string) =>
    page.locator(`[data-plan-date="${id}"] [data-certainty]`);
  await expect(badge("demo-date-essentials")).toHaveText("Inferred");
  await expect(badge("demo-date-electricity")).toHaveText("Confirmed");
  await expect(badge("demo-date-school-fee")).toHaveText("Confirmed");
  await expect(badge("demo-date-salary")).toHaveText("Confirmed");
  await expect(
    page.locator('[data-plan-date="demo-date-salary"] data'),
  ).toHaveText("₹30,000");
});

/** Dates and amounts inside `main`, as rendered. */
async function facts(page: Page) {
  return page
    .locator("main")
    .evaluate((main) =>
      [...main.querySelectorAll("time, data")].map((el) =>
        [
          el.tagName,
          el.getAttribute("datetime") ?? el.getAttribute("value") ?? "",
          el.textContent?.trim(),
        ].join("|"),
      ),
    );
}

async function storage(page: Page) {
  return page.evaluate(() => JSON.stringify({ ...sessionStorage }));
}

test("previewing leaves the live Home unchanged", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main data").first()).toBeVisible();
  const homeBefore = await facts(page);
  const storageBefore = await storage(page);

  await page.getByRole("link", { name: /What if something changes/ }).click();
  await expect(page).toHaveURL(/\/plan\/what-if$/);
  await expect(page.locator("[data-key-figures]")).toBeVisible();
  await page.getByRole("checkbox", { name: /Move the school fee/ }).check();
  await expect(result(page, "emergency_fee_delay")).toBeVisible();
  await choose(page, /^A purchase/);
  await choose(page, "On a loan");
  await expect(result(page, "loan_purchase")).toBeVisible();
  await choose(page, /A locked or private asset/);
  await expect(result(page, "hidden_asset")).toBeVisible();
  await page.getByRole("button", { name: "Approve this plan" }).click();
  await expect(page.locator("[data-goal-draft]")).toBeVisible();
  expect(await storage(page)).toBe(storageBefore);

  await page.goto("/");
  await expect(page.locator("main data").first()).toBeVisible();
  expect(await facts(page)).toEqual(homeBefore);
});

test("Plan links to the what-if preview", async ({ page }) => {
  await page.goto("/plan");
  await page.getByRole("link", { name: /What if…\?/ }).click();
  await expect(page).toHaveURL(/\/plan\/what-if$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What if…?");
});

test("while the picture is recalculating, no figure is shown", async ({
  page,
}) => {
  await startDemoSession(page);
  await page.goto("/privacy/correct?fact=fixture-fact-electricity");
  await page.getByLabel("The amount", { exact: true }).check();
  await page.locator("#proposed-value").fill("1200");
  await page.getByLabel("Why is it wrong?").fill("The bill came in lower.");
  await page.getByRole("button", { name: "Preview what would change" }).click();
  await page.getByRole("button", { name: "Propose this correction" }).click();
  await page.getByRole("button", { name: "Simulate accept" }).click();
  await expect(
    page.locator('article[data-correction-status="accepted"]'),
  ).toHaveCount(1);

  await page.goto(WHAT_IF);
  const main = page.locator("main");
  await expect(main.getByText(RECALC_TITLE)).toBeVisible();
  await expect(main.locator("data")).toHaveCount(0);
  await expect(main.locator('time:not([datetime*="T"])')).toHaveCount(0);
  await expect(main.locator("[data-key-figures]")).toHaveCount(0);
  expect(await pageText(page)).not.toContain("₹");
  // The preview banner still says the plan is unchanged.
  await expect(page.locator("[data-preview-banner]")).toBeVisible();

  // The labelled demo reset brings the figures back.
  await page.goto("/privacy/correct");
  await page.getByRole("button", { name: "Reset demo corrections" }).click();
  await gotoWhatIf(page);
  await expect(page.getByText(RECALC_TITLE)).toHaveCount(0);
});

test("Simple words changes no amount or date", async ({ page }) => {
  await gotoWhatIf(page);
  const check = async (label: string) => {
    const before = await facts(page);
    expect(before.length, label).toBeGreaterThan(20);
    await page.getByRole("button", { name: "Simple words" }).click();
    await expect(
      page.getByRole("button", { name: "Simple words" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(await facts(page), label).toEqual(before);
    await page.getByRole("button", { name: "Standard" }).click();
    await expect(
      page.getByRole("button", { name: "Standard" }),
    ).toHaveAttribute("aria-pressed", "true");
  };

  await check("emergency");
  await page.getByRole("checkbox", { name: /Move the school fee/ }).check();
  await expect(result(page, "emergency_fee_delay")).toBeVisible();
  await check("fee delay");
  await choose(page, /^A purchase/);
  await choose(page, "On a loan");
  await expect(result(page, "loan_purchase")).toBeVisible();
  await check("loan");
});

for (const viewport of VIEWPORTS) {
  test.describe(`axe at ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
    });

    test("what-if states have no serious violations", async ({ page }) => {
      const check = async (label: string) => {
        await page.mouse.move(0, 0);
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        const serious = axe.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`);
        expect(serious, label).toEqual([]);
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow, `${label} horizontal overflow`).toBeLessThanOrEqual(0);
      };

      await gotoWhatIf(page);
      await page.getByText("Day-by-day figures").click();
      await check("emergency");

      await page.getByRole("checkbox", { name: /Move the school fee/ }).check();
      await expect(result(page, "emergency_fee_delay")).toBeVisible();
      await page.getByRole("button", { name: "Approve this plan" }).click();
      await check("fee delay + goal draft");

      await choose(page, /^A purchase/);
      await choose(page, "On a loan");
      await expect(result(page, "loan_purchase")).toBeVisible();
      await check("loan terms missing");

      await choose(page, /A source doesn.t respond/);
      await expect(result(page, "no_provider")).toBeVisible();
      await check("pending");

      await page.getByRole("button", { name: "Simple words" }).click();
      await check("simple words");

      await page.goto("/plan");
      await check("plan");
    });
  });
}
