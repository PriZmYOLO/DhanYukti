import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { startDemoSession, VIEWPORTS } from "./helpers";

/**
 * L04 permissions and import states, against the labelled h03 demo adapter.
 * Nothing here talks to a bank, an Account Aggregator or a backend.
 */

const STORAGE_KEY = "dhanyukti.l04-demo-consent.v1";

/** Every displayed link state and its Standard-words title. */
const STATE_TITLES = {
  requested: "Requested",
  awaiting_approval: "Awaiting your approval",
  processing: "Still processing",
  active: "Active",
  partial: "Partly received",
  failed: "Import failed",
  denied: "Declined",
  expired: "Expired",
  revoked: "Revoked",
} as const;

const REVOKED_MESSAGE =
  "Data removed from your plan; your household picture will be recalculated.";

async function loadEveryState(page: Page) {
  await page.goto("/privacy");
  await page.getByRole("button", { name: "Show every state (demo)" }).click();
  await expect(page.locator("article[data-link-state]")).toHaveCount(9);
}

const card = (page: Page, state: string) =>
  page.locator(`article[data-link-state="${state}"]`);

/** Dates, amounts and counts on the page, as rendered. */
async function facts(page: Page) {
  return page
    .locator("main")
    .evaluate((main) =>
      [...main.querySelectorAll("time, data, [data-fact]")].map((el) =>
        [
          el.tagName,
          el.getAttribute("datetime") ?? el.getAttribute("value") ?? "",
          el.textContent?.trim(),
        ].join("|"),
      ),
    );
}

test.describe("no demo session", () => {
  const routes = [
    { path: "/privacy", title: "Privacy" },
    { path: "/privacy/connect", title: "Before you link your bank" },
    {
      path: "/privacy/connect/demo-link-unknown",
      title: "Approve in the Account Aggregator app",
    },
    { path: "/privacy/correct", title: "Correct a fact" },
    { path: "/privacy/report", title: "Report a recommendation" },
    { path: "/privacy/private", title: "Only you can see this" },
  ];

  for (const { path, title } of routes) {
    test(`${path} shows its title and a way to start`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { level: 1, name: title }),
      ).toBeVisible();
      const start = page.getByRole("link", {
        name: "Start a practice session",
      });
      await expect(start).toHaveAttribute(
        "href",
        `/welcome?next=${encodeURIComponent(path)}`,
      );
    });
  }

  test("starting a session returns to the page", async ({ page }) => {
    await page.goto("/privacy/connect");
    await page.getByRole("link", { name: "Start a practice session" }).click();
    await page.locator("#demo-name").fill("Ravi");
    await page.getByRole("button", { name: "Start a demo session" }).click();
    await expect(page).toHaveURL(/\/privacy\/connect$/);
    await expect(
      page.getByRole("checkbox", { name: "Read your bank data" }),
    ).toBeVisible();
  });
});

test("joining a household grants none of the four choices", async ({
  page,
}) => {
  await startDemoSession(page, "Meera");
  await page.goto("/invite/DEMO-INVITE");
  await page.getByRole("button", { name: "Accept and join" }).click();
  await expect(page).toHaveURL(/\/setup\/context$/);

  await page.goto("/privacy");
  const grants = page.locator("li[data-grant]");
  await expect(grants).toHaveCount(4);
  for (const grant of await grants.all()) {
    await expect(grant).toContainText("Not given");
  }

  await page.goto("/privacy/connect");
  for (const name of [
    "Read your bank data",
    "Use it in the household plan",
    "Alerts and suggested actions",
  ]) {
    await expect(page.getByRole("checkbox", { name })).not.toBeChecked();
  }
  await expect(page.getByRole("radio", { name: "Only me" })).toBeChecked();
});

test("setup → explainer → simulated approval → processing, never ₹0", async ({
  page,
}) => {
  await startDemoSession(page);
  await page.getByRole("button", { name: "Create household" }).click();
  await page.goto("/setup/money");
  await page.getByRole("link", { name: "Link your bank" }).click();
  await expect(page).toHaveURL(/\/privacy\/connect\?from=setup$/);

  // The explainer names the unnamed partner honestly.
  const main = page.locator("main");
  await expect(main).toContainText("Partner not yet named");
  await expect(main).toContainText("Savings account transactions");

  // Source access is required; the other choices are not.
  await page.getByRole("button", { name: "Continue to approval" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "needs permission to read its data",
  );
  await expect(
    page.getByRole("checkbox", { name: "Read your bank data" }),
  ).toBeFocused();
  await page.getByRole("checkbox", { name: "Read your bank data" }).check();
  await page.getByRole("button", { name: "Continue to approval" }).click();

  await expect(page).toHaveURL(
    /\/privacy\/connect\/demo-link-[\w-]+\?from=setup$/,
  );
  await expect(main).toContainText(
    "You'll approve this in the Account Aggregator app (Anumati)",
  );
  await expect(
    page.getByRole("heading", {
      name: "Simulated approval, no bank contacted",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Simulate approval" }).click();
  await expect(main.getByText("Still processing").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to setup" })).toBeVisible();
  await expect(main).not.toContainText("₹0");
  await expect(main.locator("data")).toHaveCount(0);

  await page.getByRole("link", { name: "See it in Privacy" }).click();
  const processing = card(page, "processing");
  await expect(processing).toHaveCount(1);
  await expect(processing).toContainText("Still processing — not zero");
  await expect(processing.locator("data")).toHaveCount(0);
  await expect(main).not.toContainText("₹0");
  await expect(page.locator('li[data-grant="source_access"]')).toContainText(
    "Given for 1",
  );
  // Only source access was turned on.
  await expect(
    page.locator('li[data-grant="household_computation"]'),
  ).toContainText("Not given");
});

test("declining in the simulated step leaves the link denied", async ({
  page,
}) => {
  await startDemoSession(page);
  await page.goto("/privacy/connect");
  await page.getByRole("checkbox", { name: "Read your bank data" }).check();
  await page.getByRole("button", { name: "Continue to approval" }).click();
  await page.getByRole("button", { name: "Simulate decline" }).click();
  await expect(page.locator('[data-link-state="denied"]')).toContainText(
    "Declined",
  );

  await page.goto("/privacy");
  await expect(card(page, "denied")).toHaveCount(1);
  for (const grant of await page.locator("li[data-grant]").all()) {
    await expect(grant).toContainText("Not given");
  }
});

test("every import state renders with its source dates", async ({ page }) => {
  await startDemoSession(page);
  await loadEveryState(page);

  for (const [state, title] of Object.entries(STATE_TITLES)) {
    const article = card(page, state);
    await expect(article, state).toHaveCount(1);
    await expect(
      article.getByText(title, { exact: true }).first(),
      state,
    ).toBeVisible();
    expect(
      await article.locator("time").count(),
      `${state} shows at least one source date`,
    ).toBeGreaterThan(0);
  }

  // Partial: one of two banks, the missing one is not a zero.
  const partial = card(page, "partial");
  await expect(partial).toContainText("Received 1 of 2");
  await expect(partial).toContainText("Not received — not zero");
  await expect(partial.locator("data")).toHaveCount(1);

  // Processing and failed never show an amount.
  for (const state of ["processing", "failed"]) {
    await expect(card(page, state).locator("data")).toHaveCount(0);
  }
  await expect(page.locator("main")).not.toContainText("₹0");

  // Ended consents show no account data at all.
  for (const state of ["denied", "expired", "revoked"]) {
    await expect(card(page, state).locator("data")).toHaveCount(0);
    await expect(
      card(page, state).getByRole("button", { name: /Revoke/ }),
    ).toHaveCount(0);
  }
});

test("revoke asks first, then changes the state", async ({ page }) => {
  await startDemoSession(page);
  await loadEveryState(page);
  const active = card(page, "active");
  const revoke = active.getByRole("button", { name: /^Revoke/ });

  // Keeping access changes nothing and returns focus.
  await revoke.click();
  await page.getByRole("button", { name: "Keep access" }).click();
  await expect(revoke).toBeFocused();
  await expect(card(page, "active")).toHaveCount(1);

  await revoke.click();
  await expect(page.getByText("Revoke access to this source?")).toBeVisible();
  await page.getByRole("button", { name: "Yes, revoke" }).click();

  await expect(card(page, "active")).toHaveCount(0);
  await expect(card(page, "revoked")).toHaveCount(2);
  const revoked = page.locator("article", {
    hasText: "Demo Bank A · savings (fixture)",
  });
  await expect(revoked).toHaveAttribute("data-link-state", "revoked");
  await expect(revoked).toContainText(REVOKED_MESSAGE);
  await expect(revoked.getByRole("heading", { level: 3 })).toBeFocused();
  await expect(
    page.getByRole("status").filter({ hasText: "Access revoked." }),
  ).toHaveCount(1);

  // Revoked survives a reload (same tab, same demo session).
  await page.reload();
  await expect(
    page.locator("article", { hasText: "Demo Bank A · savings (fixture)" }),
  ).toHaveAttribute("data-link-state", "revoked");
});

test("Simple words changes wording, not facts", async ({ page }) => {
  await startDemoSession(page);
  await loadEveryState(page);
  const before = await facts(page);
  expect(before.length).toBeGreaterThan(20);

  await page.getByRole("button", { name: "Simple words" }).click();
  await expect(
    page.getByRole("button", { name: "Simple words" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Your bank links" }),
  ).toBeVisible();
  expect(await facts(page)).toEqual(before);

  // Same on the explainer (months requested, consent length).
  await page.getByRole("button", { name: "Standard" }).click();
  await page.goto("/privacy/connect");
  await expect(page.getByText("Partner not yet named")).toBeVisible();
  const explainerBefore = await facts(page);
  await page.getByRole("button", { name: "Simple words" }).click();
  await expect(page.getByText("Not decided yet")).toBeVisible();
  expect(await facts(page)).toEqual(explainerBefore);
});

test("demo storage holds no secrets and no typed feedback", async ({
  page,
}) => {
  await startDemoSession(page);
  await page.goto("/privacy/connect");
  await page.getByRole("checkbox", { name: "Read your bank data" }).check();
  await page.getByRole("button", { name: "Continue to approval" }).click();
  await page.getByRole("button", { name: "Simulate approval" }).click();

  await page.goto("/privacy/report");
  await page.getByRole("button", { name: "Save report" }).click();
  await expect(
    page.getByText("Please choose what the problem is."),
  ).toBeVisible();
  await page.getByLabel("It's hard to understand").check();
  await page.getByLabel("Details (optional)").fill("PRIVATE-NOTE-4821");
  await page.getByRole("button", { name: "Save report" }).click();
  await expect(page.locator("main")).toContainText("Saved as a proposal");

  const stored = await page.evaluate(
    (key) => window.sessionStorage.getItem(key) ?? "",
    STORAGE_KEY,
  );
  expect(stored).not.toBe("");
  expect(stored).not.toMatch(/token|secret|password|otp|handle/i);
  expect(stored).not.toContain("PRIVATE-NOTE-4821");
});

test("a new session does not see the previous member's links", async ({
  page,
}) => {
  await startDemoSession(page, "First");
  await loadEveryState(page);
  await page.goto("/welcome");
  await page.getByRole("button", { name: "End demo session" }).click();
  await startDemoSession(page, "Second");
  await page.goto("/privacy");
  await expect(page.locator("article[data-link-state]")).toHaveCount(0);
  await expect(page.getByText("No source linked yet")).toBeVisible();
});

for (const viewport of VIEWPORTS) {
  test.describe(`axe at ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
    });

    test("privacy screens have no serious violations", async ({ page }) => {
      const check = async (label: string) => {
        // Measure resting colours, not the hover state of whatever button
        // appeared under the last click (shared hover contrast is tracked
        // separately in web/CLAUDE.md).
        await page.mouse.move(0, 0);
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        const serious = axe.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`);
        expect(serious, label).toEqual([]);
        // No horizontal page scroll at this width.
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow, `${label} horizontal overflow`).toBeLessThanOrEqual(0);
      };

      await page.goto("/privacy");
      await expect(
        page.getByRole("link", { name: "Start a practice session" }),
      ).toBeVisible();
      await check("no session");

      await startDemoSession(page);
      await loadEveryState(page);
      await check("dashboard, every state");
      // Dates never spill out of their card (timestamps don't wrap).
      const spills = await page.evaluate(
        () =>
          [...document.querySelectorAll("article time")].filter((time) => {
            const card = time.closest("article")!.getBoundingClientRect();
            return time.getBoundingClientRect().right > card.right + 0.5;
          }).length,
      );
      expect(spills, "dates overflowing their card").toBe(0);

      await card(page, "active")
        .getByRole("button", { name: /^Revoke/ })
        .click();
      await check("revoke confirmation");

      await page.goto("/privacy/connect");
      await page.getByRole("button", { name: "Continue to approval" }).click();
      await expect(page.locator("main").getByRole("alert")).toBeVisible();
      await check("explainer with error");

      await page.getByRole("checkbox", { name: "Read your bank data" }).check();
      await page.getByRole("button", { name: "Continue to approval" }).click();
      await expect(
        page.getByRole("button", { name: "Simulate approval" }),
      ).toBeVisible();
      await check("handoff");

      await page.getByRole("button", { name: "Simulate approval" }).click();
      await expect(page.getByText("Still processing").first()).toBeVisible();
      await check("handoff result");

      await page.goto("/privacy/correct");
      await page
        .getByRole("button", { name: "Preview what would change" })
        .click();
      await check("correct with errors");

      await page.goto("/privacy/report");
      await expect(
        page.getByRole("button", { name: "Save report" }),
      ).toBeVisible();
      await check("report");
    });
  });
}
