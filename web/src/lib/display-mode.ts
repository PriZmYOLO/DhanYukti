/**
 * Display modes (Guide §4: simple and standard views). A mode only changes
 * wording. Amounts and dates are always rendered from the same data through
 * Money/DateDisplay, so switching mode can never change a financial figure.
 */
export type DisplayMode = "standard" | "simple";

/** A plain string is the same in both modes. */
export type ModeText = string | Record<DisplayMode, string>;

/** An unknown key resolves to "" rather than throwing and blanking a page. */
export function resolveModeText(
  entry: ModeText | undefined,
  mode: DisplayMode,
): string {
  if (entry === undefined) return "";
  return typeof entry === "string" ? entry : entry[mode];
}
