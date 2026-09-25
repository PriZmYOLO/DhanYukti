import { MessageCircle } from "lucide-react";
import Link from "next/link";

import { SessionLink } from "@/components/onboarding/session-link";
import { MainNav } from "@/components/shell/main-nav";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark() {
  return (
    <Link
      href="/"
      className="focus-ring flex shrink-0 items-center gap-2 rounded-md"
    >
      <span
        aria-hidden
        lang="hi"
        className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg text-base font-semibold"
      >
        ध
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-semibold tracking-tight">
          {brand.name}
        </span>
        <span lang="hi" className="text-muted-foreground text-xs">
          {brand.nameHindi}
        </span>
      </span>
    </Link>
  );
}

export function AppHeader() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-4">
        <BrandMark />
        <MainNav variant="top" className="hidden md:block" />
        <div className="ml-auto flex items-center gap-1">
          <SessionLink />
          <Link
            href="/ask"
            className={cn(buttonVariants({ size: "lg" }), "px-3")}
          >
            <MessageCircle aria-hidden />
            <span className="hidden sm:inline">{brand.askLabel}</span>
            <span className="sr-only sm:hidden">{brand.askLabel}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
