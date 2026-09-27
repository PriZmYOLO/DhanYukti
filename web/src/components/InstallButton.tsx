"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useApp } from "@/lib/store";

type BIP = Event & { prompt: () => Promise<void> };

export default function InstallButton() {
  const { lang } = useApp();
  const [evt, setEvt] = useState<BIP | null>(null);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  if (!evt) return null;
  return (
    <button onClick={() => { evt.prompt(); setEvt(null); }} className="mx-5 lg:mx-0 mt-4 w-[calc(100%-2.5rem)] flex items-center gap-3 rounded-[24px] bg-ink text-white p-4 min-h-14">
      <Download size={20} className="text-haldi" />
      <span className="font-bold">{lang === "hi" ? "Phone ki home screen par jodein" : "Add to your home screen"}</span>
    </button>
  );
}
