"use client";
import { ExternalLink } from "lucide-react";
import { ANUMATI_APP } from "@/lib/aa/anumati-app";
import { useApp } from "@/lib/store";

/** Opens the Anumati app, where the consent itself is closed. */
export default function OpenAnumati({ className = "" }: { className?: string }) {
  const { lang } = useApp();
  return (
    <a href={ANUMATI_APP.url} target="_blank" rel="noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-[18px] bg-white px-4 min-h-12 text-sm font-bold shadow-soft ${className}`}>
      <ExternalLink size={16} aria-hidden />
      {lang === "hi" ? "Anumati kholein" : "Open Anumati"}{ANUMATI_APP.sandbox ? " (sandbox)" : ""}
    </a>
  );
}
