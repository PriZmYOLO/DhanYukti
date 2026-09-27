"use client";

import type { ReactNode } from "react";

import { DateDisplay } from "@/components/finance/date-display";
import { Money } from "@/components/finance/money";
import { useWhatIfText } from "@/components/what-if/what-if-text";
import type { ScenarioCashFlow } from "@/lib/provisional/h08/types";
import type { WhatIfCopyKey } from "@/lib/what-if/copy";

type Column = ScenarioCashFlow | "pending";

function Cell({ children }: { children: ReactNode }) {
  return (
    <td className="px-2 py-3 text-right align-top sm:px-3">
      <span className="flex flex-col items-end gap-0.5">{children}</span>
    </td>
  );
}

/**
 * The released E03 findings for today's plan and the change, side by side.
 * A pending column says "Pending", never ₹0; no difference is computed here.
 */
export function KeyFigures({
  baseline,
  scenario,
}: {
  baseline: ScenarioCashFlow;
  /** null: no change chosen, so only today's plan is shown. */
  scenario: Column | null;
}) {
  const text = useWhatIfText();
  const columns: { key: string; label: WhatIfCopyKey; run: Column }[] = [
    { key: "today", label: "legendToday", run: baseline },
    ...(scenario
      ? [{ key: "what-if", label: "legendWhatIf" as const, run: scenario }]
      : []),
  ];

  const rows: {
    label: WhatIfCopyKey;
    cell: (run: ScenarioCashFlow) => ReactNode;
  }[] = [
    {
      label: "firstShortfall",
      cell: (run) =>
        run.first_deficit ? (
          <>
            <Money value={run.first_deficit.amount} className="text-lg" />
            <span className="text-muted-foreground text-xs">
              {text("on")} <DateDisplay value={run.first_deficit.on} />
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">{text("noShortfall")}</span>
        ),
    },
    {
      label: "lowestPoint",
      cell: (run) => (
        <>
          <Money value={run.minimum_cash.amount} className="text-lg" />
          <span className="text-muted-foreground text-xs">
            {text("on")} <DateDisplay value={run.minimum_cash.on} />
          </span>
        </>
      ),
    },
    {
      label: "belowFloorBy",
      cell: (run) =>
        run.gap_to_floor.amount_paise > 0 ? (
          <Money value={run.gap_to_floor} className="text-lg" />
        ) : (
          <span className="text-muted-foreground">{text("noShortfall")}</span>
        ),
    },
  ];

  return (
    <table className="w-full table-fixed text-sm" data-key-figures>
      <caption className="sr-only">{text("figuresCaption")}</caption>
      <thead>
        <tr className="border-foreground border-b-[1.5px]">
          <td className="w-[38%]" />
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              data-column={column.key}
              className="text-muted-foreground px-2 pb-2 text-right text-xs font-medium sm:px-3"
            >
              {text(column.label)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y border-b">
        {rows.map((row) => (
          <tr key={row.label} data-figure={row.label}>
            <th
              scope="row"
              className="text-muted-foreground py-3 pr-2 text-left align-top text-xs font-normal"
            >
              {text(row.label)}
            </th>
            {columns.map((column) =>
              column.run === "pending" ? (
                <Cell key={column.key}>
                  <span className="text-muted-foreground italic">
                    {text("pendingCell")}
                  </span>
                </Cell>
              ) : (
                <Cell key={column.key}>{row.cell(column.run)}</Cell>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
