import { expect, test } from "@playwright/test";

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
