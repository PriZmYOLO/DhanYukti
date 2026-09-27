import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { startDemoSession } from "./helpers";

/**
 * Family cover check (Plan): DPDP consent gate, profile, engine result,
 * Value Ledger receipt, and withdrawal deleting the profile. Uses the
 * server's local in-memory store; no bank or Account Aggregator involved.
 */

test.use({ viewport: { width: 1280, height: 900 } });

test("consent → family → plan with receipt; withdraw deletes it", async ({
  page,
}) => {
  // Privacy screens (the Passport) sit behind the practice-session gate.
  await startDemoSession(page);
  await page.goto("/plan");
  await page.getByRole("link", { name: /Family cover check/ }).click();

  // Nothing is collected before consent.
  await expect(page.locator("[data-cover-consent]")).toBeVisible();
  await page.getByRole("button", { name: "Give consent and start" }).click();
  await expect(page.locator("[data-cover-form]")).toBeVisible();

  await page.getByLabel("Metro city").check();
  const me = page.locator('[data-member="m1"]');
  await me.getByLabel("Age").fill("30");
  await me.getByLabel("Income a year (₹)").fill("1000000");
  await page.getByRole("button", { name: "Add a family member" }).click();
  await page.locator('[data-member="m2"]').getByLabel("Age").fill("2");

  await page.getByRole("button", { name: "Save and check our cover" }).click();
  await expect(page.locator("[data-cover-plan]")).toBeVisible();

  // Metro family floater ₹10L, nothing held → gap; life needs spending
  // (not told) so it falls back to 10× income: ₹1 Cr.
  const family = page.locator('[data-unit="health-family"]');
  await expect(family).toHaveAttribute("data-status", "gap");
  await expect(family).toContainText("₹10,00,000");
  await expect(page.locator('[data-unit="life-m1"]')).toContainText(
    "₹1,00,00,000",
  );
  await expect(page.locator("[data-cover-receipt]")).toHaveText(/^rcpt_/);
  await expect(page.locator('[data-spec="family_floater"]')).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = axe.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`);
  expect(serious).toEqual([]);

  // The run is in the Value Ledger; withdrawing deletes the profile.
  await page.goto("/privacy/passport");
  await expect(page.locator('[data-ledger-kind="engine_run"]')).toHaveCount(1);
  await expect(page.locator("[data-ledger-verified]")).toHaveAttribute(
    "data-ledger-verified",
    "true",
  );
  await page
    .getByRole("button", { name: /Withdraw: Family cover check/ })
    .click();
  await expect(
    page.locator('[data-purpose="cover_profile"][data-status="withdrawn"]'),
  ).toBeVisible();
  const state = await page.evaluate(async () =>
    (await fetch("/api/engine/cover/profile")).json(),
  );
  expect(state.profile).toBeNull();
});
