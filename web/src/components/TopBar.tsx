"use client";
import { useState } from "react";
import Link from "next/link";
import { Bell, Flame } from "lucide-react";
import Avatar from "@/components/art/Avatar";
import NudgeSheet from "@/components/NudgeSheet";
import { SpeakBtn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { primaryMember } from "@/lib/format";
import type { L } from "@/lib/types";

export function LangToggle({ dark }: { dark?: boolean }) {
  const { lang, setLang } = useApp();
  return (
    <div className={`flex rounded-full p-1 text-xs font-bold ${dark ? "bg-white/15" : "bg-white shadow-soft"}`}>
      {(["hi", "en"] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} className={`min-h-11 min-w-11 rounded-full px-2.5 ${lang === l ? "bg-ink text-white" : dark ? "text-white/70" : "text-muted"}`}>
          {l === "hi" ? "हिं" : "EN"}
        </button>
      ))}
    </div>
  );
}

export default function TopBar({ title, speakText }: { title?: string; speakText?: L }) {
  const { data, lang } = useApp();
  const [bell, setBell] = useState(false);
  const user = primaryMember(data);
  const hr = new Date().getHours();
  const greet = lang === "hi" ? (hr < 12 ? "Suprabhat" : hr < 17 ? "Namaste" : "Shubh sandhya") : hr < 12 ? "Good morning" : hr < 17 ? "Hello" : "Good evening";
  return (
    <header className="flex items-center gap-2 px-5 lg:px-0 pt-4 lg:pt-8 pb-2">
      {!title && user && <Avatar kind={user.avatar} size={48} ring />}
      <div className="flex-1 min-w-0">
        {title ? <h1 className="text-[26px] font-extrabold tracking-tight">{title}</h1> : (
          <>
            <p className="text-[13px] text-muted">{greet} 🙏</p>
            <h1 className="text-xl font-extrabold truncate">{user?.name ?? "…"}</h1>
          </>
        )}
      </div>
      {speakText && <SpeakBtn v={speakText} />}
      {data && (
        <Link href="/app/rewards" aria-label="Streak" className="flex items-center gap-1 rounded-full bg-white px-3 min-h-11 shadow-soft font-extrabold text-sm num">
          <Flame size={18} className="text-clay fill-haldi" />{data.game.streak}
        </Link>
      )}
      <button onClick={() => setBell(true)} aria-label={lang === "hi" ? "Yaad-dihaani" : "Nudges"} className="relative grid place-items-center h-11 w-11 rounded-full bg-white shadow-soft">
        <Bell size={19} />{data && data.nba.length > 0 && <span className="absolute top-2 right-2.5 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-white" />}
      </button>
      <LangToggle />
      <NudgeSheet open={bell} onClose={() => setBell(false)} />
    </header>
  );
}
