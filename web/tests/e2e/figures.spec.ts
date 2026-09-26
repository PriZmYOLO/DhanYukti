import { expect, test } from "@playwright/test";

import {
  fixtureAmountsPaise,
  gotoHome,
  pageText,
  rupeeTextToPaise,
  SCENARIOS,
} from "./helpers";

/** Every ₹ amount and date shown in main, as rendered text plus its value. */
async function figuresAndDates(page: import("@playwright/test").Page) {
  return page
    .locator("main data, main time")
    .evaluateAll((nodes) =>
      nodes.map(
        (node) =>
          `${node.getAttribute("value") ?? node.getAttribute("datetime")}|${node.textContent}`,
      ),
    );
}

for (const scenario of SCENARIOS) {
  test(`${scenario}: Simple words never changes an amount or a date`, async ({
    page,
  }) => {
    await gotoHome(page, scenario);
    const standard = await figuresAndDates(page);

    await page.getByRole("button", { name: "Simple words" }).click();
    await expect(
      page.getByRole("button", { name: "Simple words" }),
    ).toHaveAttribute("aria-pressed", "true");
    const simple = await figuresAndDates(page);

    expect(simple).toEqual(standard);
  });

  test(`${scenario}: every ₹ amount comes from the fixture data`, async ({
    page,
  }) => {
    await gotoHome(page, scenario);
    const released = fixtureAmountsPaise();
    expect(released.size).toBeGreaterThan(0);

    // Structured amounts: <data value="paise">.
    const values = await page
      .locator("main data")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("value")));
    for (const value of values) {
      expect(released, `data value ${value}`).toContain(Number(value));
    }

    // And any ₹ written in text (e.g. inside released sentences).
    const main = await pageText(page);
    for (const match of main.matchAll(/[−-]?₹[\d,]+(?:\.\d{1,2})?/g)) {
      expect(released, `text "${match[0]}"`).toContain(
        rupeeTextToPaise(match[0]),
      );
    }
  });
}
