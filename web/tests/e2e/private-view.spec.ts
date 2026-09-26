import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type Page,
  type Response,
} from "@playwright/test";

import { pageText, startDemoSession, VIEWPORTS } from "./helpers";

/**
 * L05 owner-only view, against the labelled h03 demo adapter. Each member's
 * private fixture must reach that member's browser only: not the other
 * member's DOM, and not any response the other member's browser received.
 */

/** Private fixture items of the member who created the household. */
const CREATOR_PRIVATE = [
  "Recurring deposit in your own name",
  "Savings kept aside for yourself",
  "Decide whether to renew your recurring deposit",
  "48,250",
  "11,750",
  "4825000",
  "4_825_000",
  "1175000",
  "1_175_000",
  // As the minifier writes them in the client chunk.
  "amount_paise:4825e3",
  "amount_paise:1175e3",
];

/** Private fixture items of the member who joined with an invite. */
const INVITED_PRIVATE = [
  "Chit fund, your share paid so far",
  "Check the date of your next chit fund draw",
  "27,300",
  "9,640",
  "2730000",
  "2_730_000",
  "964000",
  "964_000",
  "amount_paise:273e4",
  "amount_paise:964e3",
];

/** Records the text of every response this page receives. */
function recordResponses(page: Page): () => Promise<string[]> {
  const bodies: Promise<string>[] = [];
  page.on("response", (response: Response) => {
    bodies.push(response.text().catch(() => ""));
  });
  return () => Promise.all(bodies);
}

async function creator(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const responses = recordResponses(page);
  await startDemoSession(page, "Asha");
  await page.getByRole("button", { name: "Create household" }).click();
  await expect(page).toHaveURL(/\/setup\/context$/);
  return { context, page, responses };
}

async function invited(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const responses = recordResponses(page);
  await startDemoSession(page, "Ravi");
  await page.getByLabel("Invite code").fill("DEMO-INVITE");
  await page.getByRole("button", { name: "Check invite" }).click();
  await page.getByRole("button", { name: "Accept and join" }).click();
  await expect(page).toHaveURL(/\/setup\/context$/);
  return { context, page, responses };
}

/** Visits every view a relative could open and returns their text. */
async function visitViews(page: Page): Promise<string[]> {
  const texts: string[] = [];
  for (const path of [
    "/",
    "/privacy",
    "/privacy/correct",
    "/privacy/private",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    if (path === "/") {
      await page.getByRole("button", { name: "Why this?" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
    if (path === "/privacy/private") {
      await expect(page.locator("[data-private-view]")).toBeVisible();
    }
    texts.push(await pageText(page));
  }
  return texts;
}

function leaks(haystacks: string[], needles: string[]): string[] {
  return needles.filter((needle) =>
    haystacks.some((text) => text.includes(needle)),
  );
}

test("each member sees only their own private items", async ({ browser }) => {
  const a = await creator(browser);
  const b = await invited(browser);

  await a.page.goto("/privacy/private");
  const aView = a.page.locator("[data-private-view]");
  await expect(aView).toContainText("Recurring deposit in your own name");
  await expect(aView.locator("data")).toHaveText(["₹48,250", "₹11,750"]);
  await expect(aView).toContainText(
    "Decide whether to renew your recurring deposit",
  );

  await b.page.goto("/privacy/private");
  const bView = b.page.locator("[data-private-view]");
  await expect(bView.locator("data")).toHaveText(["₹27,300", "₹9,640"]);

  const aTexts = await visitViews(a.page);
  const bTexts = await visitViews(b.page);

  // Member B: none of A's facts in the DOM, or in any payload B received
  // (documents, RSC payloads, JS chunks).
  expect(leaks(bTexts, CREATOR_PRIVATE), "A's items in B's DOM").toEqual([]);
  expect(
    leaks(await b.responses(), CREATOR_PRIVATE),
    "A's items in B's network responses",
  ).toEqual([]);

  // Positive control: the check does find a member's own chunk in their
  // own responses, so an empty result above means absent, not missed.
  expect(
    leaks(await a.responses(), ["Recurring deposit in your own name"]),
  ).toHaveLength(1);

  // And the reverse.
  expect(leaks(aTexts, INVITED_PRIVATE), "B's items in A's DOM").toEqual([]);
  expect(
    leaks(await a.responses(), INVITED_PRIVATE),
    "B's items in A's network responses",
  ).toEqual([]);

  // The owner's own private amounts are in no household view (Home, Why,
  // Privacy, corrections), so no total can be subtracted to reveal them.
  const [home, privacy, correct] = aTexts;
  expect(
    leaks([home, privacy, correct], CREATOR_PRIVATE),
    "A's private items on A's shared views",
  ).toEqual([]);

  await a.context.close();
  await b.context.close();
});

test("without a household there is nothing private to show", async ({
  page,
}) => {
  await startDemoSession(page);
  await page.goto("/privacy/private");
  await expect(
    page.getByText("Create or join a household first"),
  ).toBeVisible();
  await expect(page.locator("main data")).toHaveCount(0);
});

test("Simple words changes no amount or date", async ({ browser }) => {
  const a = await creator(browser);
  await a.page.goto("/privacy/private");
  const view = a.page.locator("[data-private-view]");
  await expect(view).toBeVisible();
  const facts = () =>
    view.evaluate((root) =>
      [...root.querySelectorAll("time, data")].map((el) =>
        [
          el.getAttribute("datetime") ?? el.getAttribute("value"),
          el.textContent?.trim(),
        ].join("|"),
      ),
    );
  const before = await facts();
  expect(before.length).toBe(5);
  await a.page.getByRole("button", { name: "Simple words" }).click();
  await expect(a.page.getByText("Your private money")).toBeVisible();
  expect(await facts()).toEqual(before);
  await a.context.close();
});

for (const viewport of VIEWPORTS) {
  test(`axe at ${viewport.name}`, async ({ browser }) => {
    const a = await creator(browser);
    await a.page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await a.page.goto("/privacy/private");
    await expect(a.page.locator("[data-private-view]")).toBeVisible();
    await a.page.mouse.move(0, 0);
    const axe = await new AxeBuilder({ page: a.page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = axe.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`);
    expect(serious).toEqual([]);
    const overflow = await a.page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await a.context.close();
  });
}
