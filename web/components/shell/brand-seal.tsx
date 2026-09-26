import { cn } from "@/lib/utils";

const sizes = {
  sm: "size-8 text-base",
  md: "size-9 text-lg",
} as const;

/**
 * The ध seal: the brand mark on a mint disc. Decorative; the text beside it
 * (the wordmark or a heading) carries the meaning.
 */
export function BrandSeal({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      lang="hi"
      className={cn(
        "bg-mint text-forest grid shrink-0 place-items-center rounded-full leading-none font-semibold",
        sizes[size],
        className,
      )}
    >
      ध
    </span>
  );
}
