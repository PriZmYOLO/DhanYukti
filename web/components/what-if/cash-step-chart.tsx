"use client";

import { ArrowUp } from "lucide-react";

import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { useWhatIfText } from "@/components/what-if/what-if-text";
import type { ScenarioCashFlow } from "@/lib/provisional/h08/types";
import { cn } from "@/lib/utils";

/** Vertical padding inside the plot, in % of its height. */
const PAD = 8;

/** "2026-09-28" → "28": a label, not date arithmetic. */
const dayNumber = (iso: string) => String(Number(iso.slice(8, 10)));

/**
 * Released daily closing cash as a step chart: "Plan today" (dashed) and,
 * when released, "With this change" (solid), on the same horizon, with the
 * agreed floor and zero lines. Every value drawn is a released figure; the
 * only arithmetic here is placing them on screen.
 *
 * The plot is scaled to the starting cash and floor so the days before
 * payday stay readable; a day above that (salary) is drawn at the top edge
 * with an arrow and its released value. Screen readers get the day-by-day
 * table instead of the drawing.
 */
export function CashStepChart({
  baseline,
  scenario,
}: {
  baseline: ScenarioCashFlow;
  /** null when the change's result is pending: only today's plan is drawn. */
  scenario: ScenarioCashFlow | null;
}) {
  const text = useWhatIfText();
  const days = baseline.daily;
  const count = days.length;
  const series = [baseline, ...(scenario ? [scenario] : [])];
  const values = series.flatMap((run) =>
    run.daily.map((day) => day.closing_cash.amount_paise),
  );
  const floor = baseline.floor.amount_paise;
  const top = Math.max(
    floor,
    ...series.map((run) => run.daily[0].closing_cash.amount_paise),
  );
  const bottom = Math.min(0, ...values);
  const span = top - bottom || 1;

  /** Paise → % from the top of the plot; values above `top` sit on the edge. */
  const y = (paise: number) =>
    PAD + ((top - Math.min(paise, top)) / span) * (100 - 2 * PAD);
  const x = (index: number) => (index / count) * 100;

  const stepPath = (run: ScenarioCashFlow) =>
    run.daily
      .map((day, index) => {
        const level = y(day.closing_cash.amount_paise).toFixed(2);
        return `${index === 0 ? "M" : "V"}${index === 0 ? `0 ${level}` : level} H${x(index + 1).toFixed(2)}`;
      })
      .join(" ");

  const lowest = (scenario ?? baseline).minimum_cash;
  const lowestIndex = days.findIndex((day) => day.date === lowest.on);
  const clipped = days
    .map((day, index) => ({ day, index }))
    .filter(({ index }) =>
      series.some((run) => run.daily[index].closing_cash.amount_paise > top),
    );

  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <span className="font-medium">
          {text("chartCaption")},{" "}
          <DateDisplay value={baseline.horizon.start} format="short" />{" "}
          {text("to")} <DateDisplay value={baseline.horizon.end} />
        </span>
        <span className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="border-muted-foreground w-5 border-t-2 border-dashed"
            />
            {text("legendToday")}
          </span>
          {scenario && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="border-primary w-5 border-t-2" />
              {text("legendWhatIf")}
            </span>
          )}
        </span>
      </figcaption>

      <div aria-hidden className="relative h-56 sm:h-64">
        {/* Shortfall zone: below zero. */}
        <div
          className="bg-negative/[0.07] absolute inset-x-0 bottom-0"
          style={{ top: `${y(0)}%` }}
        />
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          {days.slice(1).map((day, index) => (
            <line
              key={day.date}
              x1={x(index + 1)}
              x2={x(index + 1)}
              y1={0}
              y2={100}
              className="stroke-border"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line
            x1={0}
            x2={100}
            y1={y(0)}
            y2={y(0)}
            className="stroke-foreground/40"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            x2={100}
            y1={y(floor)}
            y2={y(floor)}
            className="stroke-warning-foreground/70"
            strokeWidth={1.5}
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={stepPath(baseline)}
            fill="none"
            className="stroke-muted-foreground"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {scenario && (
            <path
              d={stepPath(scenario)}
              fill="none"
              className="stroke-primary"
              strokeWidth={2.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Line labels sit on the left edge, above their line. */}
        <span
          className="text-warning-foreground bg-background/80 absolute left-1 -translate-y-full rounded px-1 text-[0.7rem] leading-tight"
          style={{ top: `${y(floor)}%` }}
        >
          {text("floorLine")} <Money value={baseline.floor} />
        </span>
        <span
          className="text-muted-foreground bg-background/80 absolute left-1 -translate-y-full rounded px-1 text-[0.7rem] leading-tight"
          style={{ top: `${y(0)}%` }}
        >
          {text("zeroLine")}
        </span>

        {/* The lowest point of the drawn change (or of today's plan). */}
        {lowestIndex >= 0 && (
          <span
            // Anchored at the dot's centre; the label sits above it, since
            // the lowest point is always at the bottom of the plot.
            className="absolute flex -translate-x-1/2 translate-y-[calc(-100%+6px)] flex-col items-center"
            style={{
              left: `${x(lowestIndex) + 50 / count}%`,
              top: `${y(lowest.amount.amount_paise)}%`,
            }}
          >
            <span className="bg-background/90 mb-0.5 rounded px-1 text-center text-[0.7rem] leading-tight whitespace-nowrap">
              {text("lowest")}
              <br />
              <Money value={lowest.amount} />
            </span>
            <span
              className={cn(
                "border-background size-3 rounded-full border-2",
                scenario ? "bg-primary" : "bg-muted-foreground",
              )}
            />
          </span>
        )}

        {/* Days above the plot, e.g. salary day. */}
        {clipped.map(({ day, index }) => (
          <span
            key={day.date}
            className="absolute top-0 flex flex-col items-end gap-0.5 pr-1 text-[0.7rem] leading-tight"
            style={{ right: `${100 - x(index + 1)}%` }}
          >
            <ArrowUp className="size-3" />
            {series.map((run, runIndex) => (
              <Money
                key={runIndex}
                value={run.daily[index].closing_cash}
                className={cn(
                  "bg-background/80 rounded px-0.5",
                  runIndex === 0 ? "text-muted-foreground" : "text-primary",
                )}
              />
            ))}
          </span>
        ))}
      </div>

      <ol
        aria-hidden
        className="text-muted-foreground grid text-center text-[0.7rem] font-semibold tabular-nums"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {days.map((day) => (
          <li key={day.date}>{dayNumber(day.date)}</li>
        ))}
      </ol>

      {!scenario && (
        <p className="text-muted-foreground text-xs">
          {text("whatIfNotDrawn")}
        </p>
      )}

      <details className="group rounded-lg border">
        <summary className="focus-ring flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm font-medium">
          {text("dayTableSummary")}
        </summary>
        <div className="overflow-x-auto border-t">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  {text("dayColumn")}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {text("legendToday")}
                </th>
                {scenario && (
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    {text("legendWhatIf")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {days.map((day, index) => (
                <tr key={day.date} data-day={day.date}>
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    <DateDisplay value={day.date} format="short" />
                  </th>
                  <td className="px-3 py-1.5 text-right">
                    <Money value={day.closing_cash} />
                  </td>
                  {scenario && (
                    <td className="px-3 py-1.5 text-right">
                      <Money value={scenario.daily[index].closing_cash} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
