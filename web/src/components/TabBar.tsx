"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Target, Mic, Trophy, Users } from "lucide-react";
import { useApp } from "@/lib/store";

const TABS = [
  { href: "/app", hi: "घर", en: "Home", Icon: House },
  { href: "/app/goals", hi: "लक्ष्य", en: "Goals", Icon: Target },
  { href: "/app/ask", hi: "पूछो", en: "Ask", Icon: Mic, center: true },
  { href: "/app/rewards", hi: "इनाम", en: "Rewards", Icon: Trophy },
  { href: "/app/family", hi: "परिवार", en: "Family", Icon: Users },
];

export default function TabBar() {
  const path = usePathname();
  const { lang } = useApp();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 z-30">
      <div className="flex items-center justify-between rounded-[28px] bg-ink px-2 py-2 shadow-lift">
        {TABS.map(({ href, hi, en, Icon, center }) => {
          const active = href === "/app" ? path === "/app" : path.startsWith(href);
          if (center) return (
            <Link key={href} href={href} aria-label={en} className="-mt-9 flex flex-col items-center">
              <span className={`grid place-items-center h-16 w-16 rounded-full border-[5px] border-cream shadow-lift ${active ? "bg-clay" : "bg-haldi"}`}>
                <Icon size={28} className={active ? "text-white" : "text-ink"} strokeWidth={2.4} />
              </span>
              <span className="text-[11px] font-semibold text-white/80 mt-0.5 font-deva">{lang === "hi" ? hi : en}</span>
            </Link>
          );
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 min-h-12">
              <span className={`grid place-items-center h-9 w-12 rounded-full transition ${active ? "bg-haldi" : ""}`}>
                <Icon size={21} className={active ? "text-ink" : "text-white/70"} strokeWidth={2.2} />
              </span>
              <span className={`text-[11px] font-semibold font-deva ${active ? "text-haldi" : "text-white/60"}`}>{lang === "hi" ? hi : en}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
