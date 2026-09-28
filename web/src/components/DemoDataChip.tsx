"use client";
import { FlaskConical } from "lucide-react";
import { demoHouseholdName } from "@/lib/demo-data";
import { useApp } from "@/lib/store";

/** Says plainly that the numbers shown are a demo household's, never the member's own. */
export default function DemoDataChip({ short, className = "" }: { short?: boolean; className?: string }) {
  const { data, lang } = useApp();
  const name = demoHouseholdName(data);
  if (!name) return null;
  const text = lang === "hi"
    ? `${short ? "Demo" : "Demo data"}: ${name} ka parivaar`
    : `${short ? "Demo" : "Demo data"}: ${name}'s household`;
  return (
    <p role="note" className={`inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1 text-[12px] font-bold text-ink ${className}`}>
      <FlaskConical size={14} aria-hidden />{text}
    </p>
  );
}
