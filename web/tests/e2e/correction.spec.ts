import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { pageText, startDemoSession, VIEWPORTS } from "./helpers";

/**
 * L05 fact corrections and recalculation, against the labelled h07 demo
 * adapter. Nothing here is reviewed, sent or recalculated for real.
 */

const RECALC_TITLE = "Your household picture will be recalculated";
const REJECTION_REASON =
  "Demo review (fixture): the proposed value could not be matched to a source, so the original stays in your plan.";

const correction = (page: Page, status: string) =>
  page.locator(`article[data-correction-status="${status}"]`);

/** Proposes a new amount or date for one fixture fact and submits it. */
async function propose(
  page: Page,
  factId: string,
  field: "The amount" | "The date",
  value: string,
  reason = "The bill came in lower this month.",
) {
  await page.goto(`/privacy/correct?fact=${factId}`);
  await expect(page.locator(`#fact-${factId}`)).toBeChecked();
  await page.getByLabel(field, { exact: true }).check();
  await page.locator("#proposed-value").fill(value);
  await page.getByLabel("Why is it wrong?").fill(reason);
  await page.getByRole("button", { name: "Preview what would change" }).click();
  await expect(
    page.getByRole("heading", { name: "What would change if it is accepted" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Propose this correction" }).click();
  await expect(correction(page, "proposed").first()).toBeFocused();
}

/** Home shows the recalculation notice and no figure from the old picture. */
async function expectNoStaleFigures(page: Page) {
  const main = page.locator("main");
  await expect(main.getByText(RECALC_TITLE)).toBeVisible();
  await expect(main.locator("data")).toHaveCount(0);
  // Calendar dates on Home all come from the picture; the notice's own
  // "since" is a timestamp.
  await expect(main.locator('time:not([datetime*="T"])')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Why this?" })).toHaveCount(0);
  const text = await pageText(page);
  expect(text).not.toContain("₹");
  // The demo pre-paint hold is lifted once React shows the notice.
  expect(
    await page.evaluate(() => document.documentElement.dataset.demoPicture),
  ).toBeUndefined();
}

test("a correction stays a proposal; rejected shows the reason", async ({
  page,
}) => {
  await startDemoSession(page);
  await page.goto("/privacy/correct?fact=fixture-fact-electricity");

  // Preview is text only: the only amounts are the original and proposal.
  await page.getByLabel("The amount", { exact: true }).check();
  await page.locator("#proposed-value").fill("1200");
  await page.getByLabel("Why is it wrong?").fill("The bill came in lower.");
  await page.getByRole("button", { name: "Preview what would change" }).click();
  const preview = page.locator("[data-correction-preview]");
  await expect(preview.locator("data")).toHaveText(["₹1,500", "₹1,200"]);
  const change = preview.locator("section");
  await expect(change).toContainText(
    "Your household picture would be recalculated with the new amount.",
  );
  await expect(change).toContainText("Cash runs short before salary arrives");
  await expect(change).not.toContainText("₹");
  await page.getByRole("button", { name: "Propose this correction" }).click();

  const proposed = correction(page, "proposed");
  await expect(proposed).toBeFocused();
  await expect(proposed).toContainText("Proposed — not accepted");
  // Original and proposal side by side.
  await expect(proposed.locator("data")).toHaveText(["₹1,500", "₹1,200"]);
  await expect(
    page.getByRole("status").filter({ hasText: "Correction proposed." }),
  ).toHaveCount(1);

  // Still a proposal after a reload, and Home is not recalculating.
  await page.reload();
  await expect(correction(page, "proposed")).toHaveCount(1);
  await page.goto("/");
  await expect(page.getByText(RECALC_TITLE)).toHaveCount(0);

  // The Why sheet keeps the original and shows the proposal beside it.
  await page.getByRole("button", { name: "Why this?" }).click();
  const item = page
    .getByRole("dialog")
    .getByRole("listitem")
    .filter({ has: page.getByText("Electricity bill", { exact: true }) });
  await expect(item.locator("data").first()).toHaveText("₹1,500");
  await expect(item).toContainText("Correction proposed — not accepted");
  await expect(item.locator("[data-correction-status] data")).toHaveText(
    "₹1,200",
  );
  await page.keyboard.press("Escape");

  await page.goto("/privacy/correct");
  await correction(page, "proposed")
    .getByRole("button", { name: "Simulate reject" })
    .click();
  const rejected = correction(page, "rejected");
  await expect(rejected).toContainText("Rejected");
  await expect(rejected).toContainText(REJECTION_REASON);
  await expect(rejected.locator("data")).toHaveText(["₹1,500", "₹1,200"]);

  // A rejection changes nothing on Home.
  await page.goto("/");
  await expect(page.getByText(RECALC_TITLE)).toHaveCount(0);
  await expect(page.locator("main data").first()).toBeVisible();
});

test("the flow validates and never proposes the same value", async ({
  page,
}) => {
  await startDemoSession(page);
  await page.goto("/privacy/correct");
  await page.getByRole("button", { name: "Preview what would change" }).click();
  await expect(page.getByText("Choose the fact that is wrong.")).toBeVisible();
  await expect(page.getByText("Choose what is wrong with it.")).toBeVisible();
  await expect(page.getByText("Please say why it is wrong.")).toBeVisible();
  await expect(page.locator("#fact-fixture-fact-cash")).toBeFocused();

  await page.locator("#fact-fixture-fact-cash").check();
  await page.getByLabel("The amount", { exact: true }).check();
  await page.locator("#proposed-value").fill("6,000");
  await page.getByLabel("Why is it wrong?").fill("Checked the wallet.");
  await page.getByRole("button", { name: "Preview what would change" }).click();
  await expect(
    page.getByText("This is the same as the value in your plan."),
  ).toBeVisible();
  await expect(page.locator("#proposed-value")).toBeFocused();
});

test("an accepted correction hides every stale figure on Home", async ({
  page,
}) => {
  await startDemoSession(page);
  await propose(page, "fixture-fact-school-fee", "The date", "2026-09-30");
  await correction(page, "proposed")
    .getByRole("button", { name: "Simulate accept" })
    .click();
  await expect(correction(page, "accepted")).toContainText(
    "Your household picture will be recalculated with it.",
  );
  // The original date is still shown beside the accepted proposal.
  await expect(
    correction(page, "accepted").locator("time[datetime='2026-09-28']"),
  ).toHaveCount(1);

  await page.goto("/");
  await expectNoStaleFigures(page);
  await expect(page.locator("main")).toContainText(
    "A correction you proposed was accepted.",
  );

  // Only the labelled demo reset brings the fixture picture back.
  await page.goto("/privacy/correct");
  await page.getByRole("button", { name: "Reset demo corrections" }).click();
  await expect(
    page.getByText("You haven't proposed any corrections."),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.getByText(RECALC_TITLE)).toHaveCount(0);
  await expect(page.locator("main data").first()).toBeVisible();
});

test("after revoke, no stale figure remains on Home or Why", async ({
  page,
}) => {
  await startDemoSession(page);
  await page.goto("/privacy");
  await page.getByRole("button", { name: "Show every state (demo)" }).click();
  const active = page.locator('article[data-link-state="active"]');
  await expect(active.locator("data")).toContainText(["₹18,450"]);
  await active.getByRole("button", { name: /^Revoke/ }).click();
  await page.getByRole("button", { name: "Yes, revoke" }).click();
  await expect(page.locator('article[data-link-state="active"]')).toHaveCount(
    0,
  );

  // Client-side navigation: the cached status is already invalidated.
  await page.locator('header a[href="/"]').first().click();
  await expect(page).toHaveURL(/\/$/);
  await expectNoStaleFigures(page);
  expect(await pageText(page)).not.toContain("18,450");
  await expect(page.locator("main")).toContainText(
    "You revoked access to a source.",
  );

  // A full load of Home, too.
  await page.reload();
  await expectNoStaleFigures(page);

  // A fresh tab (its own sessionStorage, no session) is unaffected.
  const other = await page.context().newPage();
  await other.goto("/");
  await expect(other.getByText(RECALC_TITLE)).toHaveCount(0);
  await expect(other.locator("main data").first()).toBeVisible();
  await other.close();
});

/** Dates and amounts on the page, as rendered. */
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

test("Simple words changes no amount or date", async ({ page }) => {
  await startDemoSession(page);
  await propose(page, "fixture-fact-salary", "The amount", "28000");
  await propose(page, "fixture-fact-cash", "The amount", "5500");
  await correction(page, "proposed")
    .first()
    .getByRole("button", { name: "Simulate reject" })
    .click();
  await expect(correction(page, "rejected")).toHaveCount(1);

  const check = async (atLeast: number) => {
    const before = await facts(page);
    expect(before.length).toBeGreaterThanOrEqual(atLeast);
    await page.getByRole("button", { name: "Simple words" }).click();
    await expect(
      page.getByRole("button", { name: "Simple words" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(await facts(page)).toEqual(before);
    await page.getByRole("button", { name: "Standard" }).click();
  };

  await check(10);
  await expect(page.getByText("Sent — not accepted yet")).toHaveCount(0);

  // Recalculation notice on Home.
  await correction(page, "proposed")
    .getByRole("button", { name: "Simulate accept" })
    .click();
  await page.goto("/");
  await expect(page.getByText(RECALC_TITLE)).toBeVisible();
  // The notice's "since" timestamp is its only date.
  await check(1);
});

for (const viewport of VIEWPORTS) {
  test.describe(`axe at ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
    });

    test("correction screens have no serious violations", async ({ page }) => {
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

      await startDemoSession(page);
      await page.goto("/privacy/correct");
      await page
        .getByRole("button", { name: "Preview what would change" })
        .click();
      await expect(page.getByText("Please say why it is wrong.")).toBeVisible();
      await check("form with errors");

      await page.locator("#fact-fixture-fact-cash").check();
      await page.getByLabel("The amount", { exact: true }).check();
      await page.locator("#proposed-value").fill("5500");
      await page.getByLabel("Why is it wrong?").fill("Counted again.");
      await page
        .getByRole("button", { name: "Preview what would change" })
        .click();
      await check("preview");

      await page
        .getByRole("button", { name: "Propose this correction" })
        .click();
      await propose(page, "fixture-fact-electricity", "The amount", "1200");
      await propose(page, "fixture-fact-salary", "The date", "2026-10-01");
      const proposals = correction(page, "proposed");
      await proposals
        .nth(0)
        .getByRole("button", { name: "Simulate reject" })
        .click();
      await expect(correction(page, "rejected")).toHaveCount(1);
      await correction(page, "proposed")
        .nth(0)
        .getByRole("button", { name: "Simulate accept" })
        .click();
      await expect(correction(page, "accepted")).toHaveCount(1);
      await check("list with all three states");

      await page.goto("/");
      await expect(page.getByText(RECALC_TITLE)).toBeVisible();
      await check("Home recalculating");
    });
  });
}
