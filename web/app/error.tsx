"use client"; // Error boundaries must be Client Components (Next.js 16).

import { CircleAlert } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

/**
 * Last-resort boundary for unexpected render errors below the root layout.
 * It never shows figures or a fallback picture: nothing is assumed in place
 * of what failed. The digest lets support match server logs without the
 * error's details reaching the browser.
 */
export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-4 py-8">
      <div className="border-destructive/40 bg-destructive/5 flex gap-3 rounded-xl border p-4">
        <CircleAlert
          aria-hidden
          className="text-destructive mt-0.5 size-5 shrink-0"
        />
        <div className="space-y-2">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-semibold outline-none"
          >
            Something went wrong while loading this page
          </h1>
          <p className="text-sm">
            Nothing has been shown in its place, and no amounts have been
            assumed. You can try again.
          </p>
          {error.digest && (
            <p className="text-xs">
              Reference: <span className="font-mono">{error.digest}</span>
            </p>
          )}
        </div>
      </div>
      <Button size="lg" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
