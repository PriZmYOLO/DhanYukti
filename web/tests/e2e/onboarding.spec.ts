import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { VIEWPORTS, startDemoSession } from "./helpers";

/**
 * Onboarding smoke (L02): welcome → household → context → money → review,
 * skipping everything optional. Skipped answers must stay "not answered",
 * never become ₹0.
 */
test("welcome → setup → review, and skipped is not zero", async ({ page }) => {
  await page.goto("/welcome");
  await expect(page.getByText("DEMO SESSION").first()).toBeVisible();

  await page.locator("#demo-name").fill("Asha");
  await page.getByRole("button", { name: "Start a demo session" }).click();
  await expect(page).toHaveURL(/\/setup\/household$/);

  await page.getByRole("button", { name: "Create household" }).click();
  await expect(page).toHaveURL(/\/setup\/context$/);

  // Skip every context question.
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/setup\/money$/);

  await expect(
    page.getByText("Unknown or skipped amounts are never counted as zero."),
  ).toBeVisible();

  // Skip every money question.
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/setup\/review$/);

  const review = page.locator("main");
  await expect(review.getByText("Not answered yet").first()).toBeVisible();
  await expect(review).not.toContainText("₹0");
  await expect(review.locator("data")).toHaveCount(0);
});

const STORAGE_KEY = "dhanyukti.l02-demo-session.v1";

/** Today in India as YYYY-MM-DD, the same way the money screen computes it. */
const todayIso = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );

async function toMoneyStep(page: Page) {
  await startDemoSession(page);
  await page.getByRole("button", { name: "Create household" }).click();
  await expect(page).toHaveURL(/\/setup\/context$/);
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/setup\/money$/);
}

async function toReview(page: Page) {
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/setup\/review$/);
}

async function savedMoney(page: Page) {
  return page.evaluate((key) => {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw).snapshot.money.draft : null;
  }, STORAGE_KEY);
}

async function expectNoSeriousAxe(page: Page) {
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = axe.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`);
  expect(serious).toEqual([]);
}

/** The summary row (dt + its dd cells) with this label. */
const summaryRow = (page: Page, label: string) =>
  page.locator("main dl > div").filter({
    has: page.locator("dt", { hasText: label }),
  });

test("500000 is shown as ₹5,00,000 and never loses a digit", async ({
  page,
}) => {
  await toMoneyStep(page);

  // Typed key by key: Indian units while typing, grouped on blur.
  const cash = page.locator("#cash-amount");
  await cash.pressSequentially("500000");
  await expect(page.locator("#cash-amount-units")).toHaveText("5 lakh");
  await cash.blur();
  await expect(cash).toHaveValue("5,00,000");

  // Filled at once, with nearby amounts so no two can be confused.
  await page.locator("#income-amount").fill("50000");
  await expect(page.locator("#income-amount-units")).toHaveText("50 thousand");
  await page.locator("#bill-amount").fill("523456");
  await expect(page.locator("#bill-amount-units")).toHaveText(
    "about 5.23 lakh",
  );
  await toReview(page);

  // The stored value is the exact integer (paise), not the display text.
  const draft = await savedMoney(page);
  expect(draft.cash.amount.value.amount_paise).toBe(50_000_000);
  expect(draft.income.amount.value.amount_paise).toBe(5_000_000);
  expect(draft.bill.amount.value.amount_paise).toBe(52_345_600);

  const cashValue = summaryRow(page, "Cash available").locator("data");
  await expect(cashValue).toHaveText("₹5,00,000");
  await expect(cashValue).toHaveAttribute("value", "50000000");
  await expect(summaryRow(page, "Regular income").locator("data")).toHaveText(
    "₹50,000",
  );
  await expect(summaryRow(page, "Important bill").locator("data")).toHaveText(
    "₹5,23,456",
  );

  // Round trip through "Change": the form shows the same amount, grouped,
  // and saving it again keeps it.
  await page.getByRole("link", { name: "Change Money you entered" }).click();
  await expect(page).toHaveURL(/\/setup\/money$/);
  await expect(cash).toHaveValue("5,00,000");
  await toReview(page);
  await expect(cashValue).toHaveText("₹5,00,000");
  expect((await savedMoney(page)).cash.amount.value.amount_paise).toBe(
    50_000_000,
  );
});

test("the cash date defaults to today as an explicit date", async ({
  page,
}) => {
  await toMoneyStep(page);
  const today = todayIso();
  const dateField = page.locator('[data-why="whyCashDate"]');

  await expect(dateField.getByText("As of today,")).toBeVisible();
  await expect(dateField.locator(`time[datetime="${today}"]`)).toBeVisible();
  // No date input and no "I don't know" until an earlier date is chosen.
  await expect(page.locator("#cash-date")).toHaveCount(0);
  await expect(
    dateField.getByRole("button", { name: "I don't know" }),
  ).toHaveCount(0);

  await dateField
    .getByRole("button", { name: "It was an earlier date" })
    .click();
  await expect(page.locator("#cash-date")).toBeFocused();
  await expect(page.locator("#cash-date")).toHaveValue(today);
  await expect(
    page
      .locator('[data-why="whyCashDate"]')
      .getByRole("button", { name: "I don't know" }),
  ).toBeVisible();

  await toReview(page);
  expect((await savedMoney(page)).cash.as_of).toEqual({
    state: "answered",
    value: today,
  });
});

test("the goal shows only the person's own choice", async ({ page }) => {
  await toMoneyStep(page);
  await toReview(page);

  const goal = summaryRow(page, "Most important to you");
  await expect(goal).toContainText("Not chosen yet");
  await expect(page.locator("main")).not.toContainText("Paying off money owed");

  await page.getByRole("link", { name: "Change About you" }).click();
  await page.getByText("A safety cushion for emergencies").click();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/setup\/money$/);
  await toReview(page);
  await expect(goal).toContainText("A safety cushion for emergencies");
});

for (const viewport of VIEWPORTS) {
  test(`setup layout and axe at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await toMoneyStep(page);

    // Each description sits under its label, inside the card.
    for (const id of ["cash-amount", "income-amount", "bill-amount"]) {
      const card = (await page
        .locator("fieldset", { has: page.locator(`#${id}`) })
        .first()
        .boundingBox())!;
      const label = (await page.locator(`label[for="${id}"]`).boundingBox())!;
      const description = (await page
        .locator(`#${id}-description`)
        .boundingBox())!;
      expect(description.y).toBeGreaterThan(label.y);
      expect(Math.abs(description.x - label.x)).toBeLessThan(1);
      expect(description.x + description.width).toBeLessThanOrEqual(
        card.x + card.width,
      );
    }

    // ≥1280: the form column starts at the header container's edge and the
    // side panel follows the focused field; below that, one column.
    const why = page.getByRole("heading", { name: "Why we ask this" });
    if (viewport.width >= 1280) {
      await expect(why).toBeVisible();
      const brand = (await page
        .locator("header")
        .getByRole("link", { name: /DhanYukti/ })
        .first()
        .boundingBox())!;
      const heading = (await page.locator("main h1").boundingBox())!;
      expect(Math.abs(heading.x - brand.x)).toBeLessThan(1);
      await page.locator("#bill-amount").focus();
      await expect(
        page.getByText(
          "One important bill shows whether cash covers what must be paid.",
        ),
      ).toBeVisible();
    } else {
      await expect(why).toBeHidden();
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(viewport.width);
    await expectNoSeriousAxe(page);

    await page.locator("#cash-amount").fill("500000");
    await page.locator("#income-amount").fill("45000");
    await page.getByText("Every month").click();
    await page.locator("#income-next").fill("2026-10-01");
    await page.locator("#bill-amount").fill("2500");
    await page.locator("#bill-name").fill("School fee");
    await page.locator("#bill-due").fill("2026-09-30");
    await toReview(page);

    // One card-level source line instead of per-row chips.
    await expect(
      page.getByText(
        "Entered by you in this demo session · not yet accepted · demo only",
      ),
    ).toHaveCount(1);

    // Labels stay on one line in both wordings, with no sideways scroll.
    for (const mode of ["Simple words", "Standard"]) {
      await page.getByRole("button", { name: mode }).click();
      const heights = await page
        .locator("main dl dt")
        .evaluateAll((nodes) =>
          nodes
            .filter((node) => node.getClientRects().length > 0)
            .map((node) => node.getBoundingClientRect().height),
        );
      expect(heights.length).toBeGreaterThan(0);
      for (const height of heights) expect(height).toBeLessThan(24);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(viewport.width);
    }

    // The wording note sits beside the toggle, not in the summary card.
    await expect(
      page.getByRole("group", { name: "Wording" }).locator("xpath=.."),
    ).toContainText("Changing the wording never changes amounts or dates.");
    await expectNoSeriousAxe(page);
  });
}
