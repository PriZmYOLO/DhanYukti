"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, Lock, Pause, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import type { L } from "@/lib/types";

type Lesson = { id: "app_loan" | "emergency" | "pmjjby"; emoji: string; bg: string; title: L; script: L };

const LESSONS: Record<Lesson["id"], Lesson> = {
  app_loan: {
    id: "app_loan", emoji: "📱", bg: "bg-danger-soft",
    title: { hi: "Ramesh ne app se ₹3,000 liye…", en: "Ramesh borrowed ₹3,000 from an app…" },
    script: {
      hi: "Ramesh ne mahine ke aakhir mein ek phone app se teen hazaar rupaye liye. App ne kaha, bas do minute mein paisa! Pandrah din baad Ramesh ko teen hazaar teen sau chaalis rupaye lautane pade. Yaani sirf pandrah din ke liye teen sau chaalis rupaye zyada. Yeh chhota lagta hai, par agar Ramesh har mahine aisa kare, toh ek saal mein lagbhag aath hazaar rupaye sirf byaaj aur fees mein chale jaayenge. Aath hazaar rupaye mein bachchon ki poore saal ki kitaabein aa jaati hain. Toh app se loan lene se pehle teen baatein dekhiye. Pehli, kya yeh app RBI ki manzoor list mein hai? Doosri, kul kitne rupaye wapas dene honge, sirf yeh poochiye, rupaye mein. Teesri, kya bank ka overdraft, self help group, ya gullak ka paisa sasta padega? Aur haan, koi bhi app aapke contacts ko dhamki de, toh turant RBI Sachet par shikayat kariye. Samajhdaari se udhaar, chain ki neend.",
      en: "At the end of the month, Ramesh borrowed three thousand rupees from a phone app. The app promised money in two minutes! Fifteen days later, Ramesh had to repay three thousand three hundred and forty rupees. That is three hundred and forty rupees extra, for just fifteen days. It sounds small. But if Ramesh does this every month, about eight thousand rupees a year goes only to interest and fees. Eight thousand rupees could buy the children's books for a whole year. So before taking an app loan, check three things. One, is the app on RBI's approved list? Two, ask how many rupees in total you must pay back. Three, would a bank overdraft, a self help group, or your own gullak be cheaper? And if any app threatens your contacts, complain on RBI Sachet right away. Borrow wisely, sleep peacefully.",
    },
  },
  emergency: {
    id: "emergency", emoji: "☂️", bg: "bg-mint",
    title: { hi: "30 din ka bachav", en: "A 30-day safety net" },
    script: {
      hi: "Sunita ke pati ki factory ek mahine band ho gayi. Par Sunita pareshaan nahi hui, kyunki uske paas tees din ka bachav tha. Bachav matlab ek alag gullak, jismein itna paisa ho ki ghar ka ek mahine ka kharcha, kiraya, raashan, bijli aur school fees, bina udhaar ke chal jaaye. Yeh paisa ek din mein nahi judta. Sunita ne roz sirf pachaas rupaye daale. Ek mahine mein pandrah sau, ek saal mein athaarah hazaar. Jab bhi salary aati, pehle gullak, phir baaki kharcha. Is paise ko tyohaar ya shopping ke liye mat chhuiye. Yeh sirf museebat ke liye hai, jaise bimaari, naukri jaana, ya ghar ki marammat. Aur agar kabhi use karna pade, toh sharmaaiye mat, phir se dheere dheere bhar dijiye. Jiske paas tees din ka bachav hai, use mehenge app loan ki zaroorat nahi padti. Aaj se shuru kariye, chahe das rupaye se hi sahi.",
      en: "Sunita's husband's factory shut for a month. But Sunita didn't panic, because she had a thirty-day safety net. A safety net is a separate gullak with enough money to run the home for one month, rent, rations, electricity and school fees, without borrowing. This money isn't built in a day. Sunita put in just fifty rupees a day. That's fifteen hundred a month, eighteen thousand a year. Every time the salary came in, the gullak came first, then everything else. Don't touch this money for festivals or shopping. It's only for trouble, like illness, a lost job, or house repairs. And if you ever have to use it, don't feel bad, just refill it slowly. A family with a thirty-day safety net never needs an expensive app loan. Start today, even with ten rupees.",
    },
  },
  pmjjby: {
    id: "pmjjby", emoji: "🛡️", bg: "bg-lav",
    // NOTE: PMJJBY premium was ₹436/year at time of writing — re-check on the official site (jansuraksha.gov.in) before the demo.
    title: { hi: "₹436 mein ₹2 lakh ka bima", en: "₹2 lakh cover for ₹436" },
    script: {
      hi: "Kya aap jaante hain ki saal ke sirf chaar sau chhattees rupaye mein aapke parivaar ko do lakh rupaye ki suraksha mil sakti hai? Iska naam hai Pradhan Mantri Jeevan Jyoti Bima Yojana, yaani PMJJBY. Yeh sarkaari jeevan bima hai. Agar kamaane waale sadasya ko kuch ho jaaye, toh parivaar ko do lakh rupaye milte hain. Atthaarah se pachaas saal ki umar ka koi bhi vyakti, jiska bank ya post office mein khaata hai, ise le sakta hai. Premium seedha khaate se har saal kat jaata hai, bas khaate mein itna paisa rakhiye. Chaar sau chhattees rupaye matlab mahine ke lagbhag chhattees rupaye, ek chai aur samose se bhi kam. Apne bank branch, bank mitra, ya net banking se aaj hi form bhariye. Aur ghar ke har kamaane waale sadasya ke liye alag se lijiye. Chhoti si rakam, badi si chinta khatam.",
      en: "Did you know that for just four hundred and thirty-six rupees a year, your family can get two lakh rupees of protection? It's called the Pradhan Mantri Jeevan Jyoti Bima Yojana, or PMJJBY. It's a government life insurance plan. If the earning member passes away, the family receives two lakh rupees. Anyone aged eighteen to fifty with a bank or post office account can join. The premium is auto-debited from your account once a year, so just keep that much balance. Four hundred and thirty-six rupees is about thirty-six rupees a month, less than a tea and samosa. Fill the form today at your bank branch, with a bank mitra, or through net banking. And take a separate cover for every earning member of the family. A small amount, a big worry gone.",
    },
  },
};

const readDone = (key: string): string[] => {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") as string[]; } catch { return []; }
};

/** Three 60-second voice micro-lessons, unlocked one by one (all open in Pro mode). */
export default function Lessons() {
  const { data, hid, lang, t, award, mode } = useApp();
  const key = `dy.lessons.${hid}`;
  const [done, setDone] = useState<string[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => { setDone(readDone(key)); }, [key]);

  const stop = () => {
    current.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlaying(null); setPaused(false);
  };
  useEffect(() => () => { current.current = null; if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);
  // Language switch mid-lesson: stop cleanly.
  useEffect(() => {
    if (!current.current) return;
    current.current = null; window.speechSynthesis.cancel(); setPlaying(null); setPaused(false);
  }, [lang]);

  if (!data) return <Skeleton h={260} className="w-full" />;

  const order: Lesson[] = data.lender_shield.length > 0
    ? [LESSONS.app_loan, LESSONS.emergency, LESSONS.pmjjby]
    : [LESSONS.emergency, LESSONS.app_loan, LESSONS.pmjjby];
  const unlocked = (i: number) => mode === "pro" || order.slice(0, i).every((l) => done.includes(l.id));

  const finish = (l: Lesson) => {
    setPlaying(null); setPaused(false);
    setDone((d) => {
      const next = d.includes(l.id) ? d : [...d, l.id];
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
    award("lesson", { hi: "Naya sabak seekha!", en: "Lesson learned!" }, { ref: `lesson_${l.id}` });
  };

  const toggle = (l: Lesson) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const s = window.speechSynthesis;
    if (playing === l.id) {
      if (paused) { s.resume(); setPaused(false); } else { s.pause(); setPaused(true); }
      return;
    }
    stop();
    const u = new SpeechSynthesisUtterance(l.script[lang]);
    u.lang = lang === "hi" ? "hi-IN" : "en-IN";
    const voice = s.getVoices().find((v) => v.lang === u.lang) ?? s.getVoices().find((v) => v.lang.startsWith(lang));
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.onend = () => { if (current.current === u) { current.current = null; finish(l); } };
    u.onerror = () => { if (current.current === u) { current.current = null; setPlaying(null); setPaused(false); } };
    current.current = u;
    setPlaying(l.id); setPaused(false);
    s.speak(u);
  };

  return (
    <div className="w-full space-y-3">
      {order.map((l, i) => {
        const open = unlocked(i), isOn = playing === l.id, isDone = done.includes(l.id);
        return (
          <div key={l.id} className={`w-full flex items-center gap-3 rounded-[28px] p-3 ${open ? `${l.bg} shadow-soft` : "bg-white/50"}`}>
            <span className={`grid place-items-center h-14 w-14 rounded-[20px] bg-white text-[30px] shrink-0 ${open ? "" : "grayscale opacity-50"}`}>{l.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-[15px] font-extrabold leading-snug ${open ? "" : "text-muted"}`}>{t(l.title)}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold num">⏱ 60s</span>
                {isDone && <span className="inline-flex items-center gap-0.5 rounded-full bg-leaf px-2 py-0.5 text-[11px] font-bold text-white"><Check size={11} strokeWidth={3} />{lang === "hi" ? "Suna" : "Done"}</span>}
                {!open && <span className="text-[11px] font-semibold text-muted">{t({ hi: "Pichhla sabak suniye", en: "Finish the previous one" })}</span>}
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.92 }} disabled={!open} onClick={() => toggle(l)}
              aria-label={!open ? "Locked" : isOn && !paused ? "Pause" : "Play"}
              className={`grid place-items-center h-13 w-13 min-h-11 rounded-full shrink-0 ${open ? "bg-ink text-haldi" : "bg-lav text-muted"}`}>
              {!open ? <Lock size={20} /> : isOn && !paused ? <Pause size={22} className="fill-haldi" /> : <Play size={22} className="fill-haldi ml-0.5" />}
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}
