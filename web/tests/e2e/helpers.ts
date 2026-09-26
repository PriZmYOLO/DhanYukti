import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, type Locator, type Page } from "@playwright/test";

/** The labelled fixture scenarios Home can show (lib/fixtures/home-scenarios). */
export const SCENARIOS = [
  "baseline",
  "next-step-preview",
  "decision-unavailable",
  "picture-unavailable",
] as const;
export type Scenario = (typeof SCENARIOS)[number];

/** Scenarios where the fixture releases a priority. */
export const RELEASED: readonly Scenario[] = ["baseline", "next-step-preview"];

export const VIEWPORTS = [
  { name: "375x812", width: 375, height: 812, mobile: true },
  { name: "1280x800", width: 1280, height: 800, mobile: false },
] as const;

export const homePath = (scenario: Scenario) =>
  scenario === "baseline" ? "/" : `/?scenario=${scenario}`;

export async function gotoHome(page: Page, scenario: Scenario) {
  await page.goto(homePath(scenario));
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** Viewport height left above the fixed phone tab bar (if it is shown). */
export async function usableHeight(page: Page): Promise<number> {
  return page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>(
      'nav[aria-label="Main"].fixed',
    );
    const navHeight =
      nav && getComputedStyle(nav).display !== "none"
        ? nav.getBoundingClientRect().height
        : 0;
    return window.innerHeight - navHeight;
  });
}

/** Asserts the element is fully inside the first viewport (no scrolling). */
export async function expectInFirstViewport(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const height = await usableHeight(page);
  expect(box, "element has a layout box").not.toBeNull();
  expect(box!.y, "top is on screen").toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height, "bottom is above the fold").toBeLessThanOrEqual(
    height,
  );
}

/**
 * Page text without scripts/styles, including collapsed and sr-only text.
 * Text nodes are joined with spaces so words from neighbouring elements
 * never run together ("connected" + "Details").
 */
export async function pageText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) =>
          node.parentElement?.closest("script, style, noscript, template")
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      },
    );
    const parts: string[] = [];
    while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
    return parts.join(" ").replace(/\s+/g, " ");
  });
}

/**
 * Fragments that claim something IS connected. The text is split into
 * sentence-like fragments; a fragment mentioning "connected" is fine only if
 * it also negates or conditions it ("Not connected", "no bank connected",
 * "No source has been connected", "once it is connected"). A bare status
 * such as "Connected · updated…" or "From a connected source" is a claim.
 */
export function positiveConnectedClaims(text: string): string[] {
  const guard =
    /\b(?:not|no|none|never|without|isn['’]t|aren['’]t|hasn['’]t|haven['’]t|once|until|when|if|after)\b/i;
  return text
    .split(/[.·;!?—\n]/)
    .map((fragment) => fragment.trim())
    .filter((fragment) => /connected/i.test(fragment) && !guard.test(fragment));
}

/**
 * Every amount the fixtures release, in paise. The fixture files import
 * "server-only", so they are read as text: every amount is written as
 * `inr(<rupees>)` there.
 */
export function fixtureAmountsPaise(): Set<number> {
  const dir = path.join(process.cwd(), "lib", "fixtures");
  const source = ["home.fixture.ts", "home-scenarios.ts"]
    .map((file) => readFileSync(path.join(dir, file), "utf8"))
    .join("\n");
  const amounts = [...source.matchAll(/inr\(\s*(-?[\d_]+)\s*\)/g)].map(
    (match) => Number(match[1].replace(/_/g, "")) * 100,
  );
  return new Set(amounts);
}

/** "−₹3,500" / "₹6,000.50" → paise. */
export function rupeeTextToPaise(text: string): number {
  const negative = /^[−-]/.test(text);
  const [rupees, fraction = "0"] = text.replace(/[^\d.]/g, "").split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  return negative ? -paise : paise;
}
