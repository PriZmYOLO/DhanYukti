"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { appAreas, isActiveHref } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface MainNavProps {
  /** "top" sits in the header on wider screens; "bottom" is the phone tab bar. */
  variant: "top" | "bottom";
  className?: string;
}

export function MainNav({ variant, className }: MainNavProps) {
  const pathname = usePathname();

  if (variant === "bottom") {
    return (
      <nav
        aria-label="Main"
        className={cn(
          "bg-background fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] md:hidden",
          className,
        )}
      >
        <ul className="grid grid-cols-6">
          {appAreas.map(({ id, href, label, icon: Icon }) => {
            const active = isActiveHref(pathname, href);
            return (
              <li key={id}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium outline-none",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  // Top bar: the current area is underlined, like a ledger tab.
  return (
    <nav aria-label="Main" className={className}>
      <ul className="flex h-full items-stretch gap-1">
        {appAreas.map(({ id, href, label }) => {
          const active = isActiveHref(pathname, href);
          return (
            <li key={id} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "hover:text-foreground focus-ring flex items-center px-3 text-sm font-medium transition-colors",
                  "aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_-2px_0_var(--color-foreground)]",
                  !active && "text-muted-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
