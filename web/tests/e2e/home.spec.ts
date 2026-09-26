import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  expectInFirstViewport,
  gotoHome,
  pageText,
  positiveConnectedClaims,
  RELEASED,
  SCENARIOS,
  VIEWPORTS,
} from "./helpers";

for (const viewport of VIEWPORTS) {
  test.describe(`Home at ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
    });

    for (const scenario of SCENARIOS) {
      test(`${scenario}: priority first, labelled, honest, accessible`, async ({
        page,
      }) => {
        await gotoHome(page, scenario);
        const priority = page.locator(
          'section[aria-labelledby="priority-heading"]',
        );

        // Priority first: the title and consequence (or the "can't show"
        // state) are in the first viewport, and so is the next-step heading.
        if (RELEASED.includes(scenario)) {
          await expectInFirstViewport(page, priority.locator("h3").first());
          await expectInFirstViewport(
            page,
            priority.locator(".surface-forest"),
          );
          await expectInFirstViewport(
            page,
            priority.getByRole("heading", { level: 3, name: /next step/i }),
          );
        } else {
          await expectInFirstViewport(
            page,
            priority.getByText(
              "Your priority and next step aren't available right now",
            ),
          );
        }

        // Demo data is always labelled.
        await expect(
          page.getByText("Demo household · not real money · no bank connected"),
        ).toBeVisible();

        // No positive "connected" claim anywhere (negations are fine).
        expect(positiveConnectedClaims(await pageText(page))).toEqual([]);

        // Any confirm button is disabled, and says nothing is sent.
        const confirm = page.getByRole("button", { name: /confirm/i });
        const confirmCount = await confirm.count();
        for (let index = 0; index < confirmCount; index++) {
          await expect(confirm.nth(index)).toBeDisabled();
        }
        if (confirmCount > 0) {
          await expect(page.getByText("Nothing is sent.")).toBeVisible();
        }
        if (scenario === "next-step-preview") {
          expect(confirmCount).toBe(1);
        }

        // Headings: the tagline is the h1, and levels never skip.
        const levels = await page
          .locator("main :is(h1, h2, h3, h4, h5, h6)")
          .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName[1])));
        expect(levels[0]).toBe(1);
        await expect(page.locator("main h1")).toHaveText(
          "Plan your money. Know your next step.",
        );
        for (let index = 1; index < levels.length; index++) {
          expect(levels[index]).toBeLessThanOrEqual(levels[index - 1] + 1);
        }

        // axe: no serious or critical violations.
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        const serious = axe.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`);
        expect(serious).toEqual([]);

        await expect(page).toHaveScreenshot(
          `home-${scenario}-${viewport.name}.png`,
          { fullPage: true },
        );
      });
    }
  });
}
