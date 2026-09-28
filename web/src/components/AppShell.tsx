"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { WifiOff, House, Target, Mic, Trophy, Users, MessagesSquare, LogOut } from "lucide-react";
import TabBar from "./TabBar";
import Celebration from "./ui/Celebration";
import { LangToggle } from "./TopBar";
import { useApp } from "@/lib/store";
import MyHouseholdIssue from "./MyHouseholdIssue";

export const NAV = [
  { href: "/app", hi: "घर", en: "Home", Icon: House },
  { href: "/app/goals", hi: "लक्ष्य", en: "Goals", Icon: Target },
  { href: "/app/ask", hi: "पूछो", en: "Ask", Icon: Mic },
  { href: "/app/rewards", hi: "इनाम", en: "Rewards", Icon: Trophy },
  { href: "/app/family", hi: "परिवार", en: "Family", Icon: Users },
  { href: "/app/channels", hi: "WhatsApp / IVR", en: "WhatsApp / IVR", Icon: MessagesSquare },
];

/** The web app: bottom tabs on a phone, sidebar + wide layout on a laptop. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { online, lang, assisted, data, t, meIssue, showAmounts, setShowAmounts } = useApp();
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh app-bg">
        <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-ink text-white px-4 py-6 z-30">
          <Link href="/app" className="px-3">
            <p className="text-2xl font-extrabold">Dhan<span className="text-haldi">Yukti</span></p>
            <p className="font-deva text-white/60 text-sm">धनयुक्ति</p>
          </Link>
          <nav className="mt-8 space-y-1">
            {NAV.map(({ href, hi, en, Icon }) => {
              const active = href === "/app" ? path === "/app" : path.startsWith(href);
              return (
                <Link key={href} href={href} className={`flex items-center gap-3 rounded-2xl px-3 min-h-12 font-semibold transition ${active ? "bg-haldi text-ink" : "text-white/75 hover:bg-white/10"}`}>
                  <Icon size={20} /><span className="font-deva">{lang === "hi" ? hi : en}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-3">
            {data && <p className="px-3 text-xs text-white/60">{t(data.household.family_name)}{data.household.city.en !== "—" ? ` · ${t(data.household.city)}` : ""}</p>}
            <div className="px-1"><LangToggle dark /></div>
            <Link href="/" className="flex items-center gap-2 px-3 text-sm text-white/60 hover:text-white"><LogOut size={16} />{lang === "hi" ? "Portal par wapas" : "Back to portal"}</Link>
            <p className="px-3 text-[11px] text-white/40">Anumati AA · Perfios</p>
          </div>
        </aside>
        <div className="lg:pl-64">
          {!online && <div className="sticky top-0 z-20 flex items-center gap-2 bg-ink text-white px-5 py-2 text-xs font-semibold"><WifiOff size={14} />{data?.household.id === "me" ? (lang === "hi" ? "Internet nahi hai — pichhla hisaab dikh raha hai" : "Offline — showing your last picture") : lang === "hi" ? "Internet nahi hai — demo data dikh raha hai" : "Offline — showing demo data"}</div>}
          {assisted && (
            <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-haldi-soft px-5 py-1.5 text-[12px] font-semibold text-center">
              <span>🤝 {showAmounts
                ? (lang === "hi" ? "Sahayak mode: rakam dikh rahi hai" : "Assisted mode: amounts are showing")
                : (lang === "hi" ? "Sahayak mode: rakam chhupi hai (₹•••)" : "Assisted mode: amounts hidden (₹•••)")}</span>
              <button onClick={() => setShowAmounts(!showAmounts)} className="rounded-full bg-ink text-white px-3 min-h-8 text-[11px] font-bold">
                {showAmounts ? (lang === "hi" ? "Phir chhupayein" : "Hide again") : (lang === "hi" ? "Dikhayein (akele mein)" : "Show (when you're alone)")}
              </button>
            </div>
          )}
          <main className="mx-auto max-w-6xl pb-32 lg:pb-12 lg:px-6">{meIssue && !data ? <MyHouseholdIssue /> : children}</main>
        </div>
        <TabBar />
        <Celebration />
      </div>
    </MotionConfig>
  );
}
