import { expect, test } from "@playwright/test";

import { gotoHome } from "./helpers";

test.use({ viewport: { width: 1280, height: 800 } });

test("Why sheet is modal, traps focus and restores it", async ({ page }) => {
  await gotoHome(page, "next-step-preview");
  const trigger = page.getByRole("button", { name: "Why this?" });
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");

  // Tab repeatedly: focus never leaves the dialog.
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press("Tab");
    const inside = await dialog.evaluate((node) =>
      node.contains(document.activeElement),
    );
    expect(inside, `focus inside dialog after ${index + 1} Tab`).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("strip draw-in, button press and sheet slide are off", async ({
    page,
  }) => {
    await gotoHome(page, "next-step-preview");

    const axis = page.locator("figure ol[aria-hidden] li > span.h-px").first();
    await expect(axis).toHaveCSS("animation-name", "none");

    const sheetTransition = await page.evaluate(async () => {
      document
        .querySelector<HTMLButtonElement>('[data-slot="sheet-trigger"]')
        ?.click();
      await new Promise((resolve) => setTimeout(resolve, 400));
      const sheet = document.querySelector('[data-slot="sheet-content"]');
      return sheet ? getComputedStyle(sheet).transitionProperty : null;
    });
    expect(sheetTransition).toBe("opacity");
    await page.keyboard.press("Escape");

    // Press feedback is behind motion-safe: no scale while pressed.
    const toggle = page.getByRole("button", { name: "Simple words" });
    await toggle.hover();
    await page.mouse.down();
    await expect(toggle).toHaveCSS("scale", "none");
    await page.mouse.up();
  });
});

test.describe("normal motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the strip draws in once", async ({ page }) => {
    await gotoHome(page, "next-step-preview");
    const axis = page.locator("figure ol[aria-hidden] li > span.h-px").first();
    await expect(axis).toHaveCSS("animation-name", "strip-draw");
    await expect(axis).toHaveCSS("animation-duration", "0.4s");
  });
});
