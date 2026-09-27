"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Delete, Mic, MicOff, Trash2 } from "lucide-react";
import { Btn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { inr } from "@/lib/format";
import type { L } from "@/lib/types";

type Kind = "cash_income" | "chit" | "relative" | "sahukar" | "khata";
type Entry = { id: string; kind: Kind; amount: number; date: string };

const KINDS: { k: Kind; icon: string; l: L }[] = [
  { k: "cash_income", icon: "💵", l: { hi: "Cash aamdani", en: "Cash income" } },
  { k: "chit", icon: "🪙", l: { hi: "Chit fund", en: "Chit fund" } },
  { k: "relative", icon: "👪", l: { hi: "Rishtedaar se udhaar", en: "Loan from relative" } },
  { k: "sahukar", icon: "🏦", l: { hi: "Sahukar", en: "Moneylender" } },
  { k: "khata", icon: "🧾", l: { hi: "Doodhwala/kirana khata", en: "Milk/grocery tab" } },
];

// ---------- speech → amount ----------
const UNITS: Record<string, number> = {
  ek: 1, do: 2, teen: 3, tin: 3, char: 4, chaar: 4, paanch: 5, panch: 5, paach: 5, chhe: 6, che: 6, chah: 6, chhah: 6,
  saat: 7, sat: 7, aath: 8, ath: 8, nau: 9, das: 10, gyarah: 11, barah: 12, baarah: 12, pandrah: 15, bees: 20, pachchis: 25,
  pachees: 25, tees: 30, chaalis: 40, chalis: 40, pachaas: 50, pachas: 50, saath: 60, sattar: 70, assi: 80, nabbe: 90,
  dedh: 1.5, dhai: 2.5, dhaai: 2.5,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, fifty: 50,
  "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "छह": 6, "छः": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
  "बीस": 20, "पच्चीस": 25, "तीस": 30, "चालीस": 40, "पचास": 50, "साठ": 60, "सत्तर": 70, "अस्सी": 80, "नब्बे": 90,
  "डेढ़": 1.5, "ढाई": 2.5,
};
const MULT: Record<string, number> = {
  sau: 100, so: 100, hundred: 100, "सौ": 100,
  hazaar: 1000, hazar: 1000, hajar: 1000, hajaar: 1000, thousand: 1000, "हज़ार": 1000, "हजार": 1000,
  lakh: 100000, lac: 100000, "लाख": 100000,
};

/** "paanch sau" → 500, "do hazaar" → 2000, "3000" → 3000, "teen hazaar paanch sau" → 3500. */
export function parseAmount(text: string): number | null {
  const tokens = text.toLowerCase().replace(/[₹,]/g, "").replace(/rupaye|rupees?|rs\.?|रुपए|रुपये/g, " ").split(/\s+/).filter(Boolean);
  let total = 0, cur = 0, found = false;
  for (const tk of tokens) {
    if (/^\d+(\.\d+)?$/.test(tk)) { cur += parseFloat(tk); found = true; }
    else if (tk in UNITS) { cur += UNITS[tk]; found = true; }
    else if (tk in MULT) {
      const m = MULT[tk];
      if (m === 100) cur = (cur || 1) * 100;
      else { total += (cur || 1) * m; cur = 0; }
      found = true;
    }
  }
  const n = Math.round(total + cur);
  return found && n > 0 ? n : null;
}

type Rec = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
type RecCtor = new () => Rec;

/** "Cash aur udhaar jodein" — declared entries for cash earners, stored on-device. */
export default function DeclaredEntry() {
  const { hid, lang, t, award } = useApp();
  const key = `dy.declared.${hid}`;
  const [kind, setKind] = useState<Kind>("cash_income");
  const [amt, setAmt] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [supported, setSupported] = useState(true);
  const rec = useRef<Rec | null>(null);

  useEffect(() => {
    try { setEntries(JSON.parse(localStorage.getItem(key) ?? "[]") as Entry[]); } catch { setEntries([]); }
  }, [key]);
  useEffect(() => {
    const w = window as unknown as { webkitSpeechRecognition?: RecCtor; SpeechRecognition?: RecCtor };
    setSupported(!!(w.SpeechRecognition ?? w.webkitSpeechRecognition));
    return () => { rec.current?.abort(); };
  }, []);

  const persist = (next: Entry[]) => {
    setEntries(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* private mode */ }
  };

  const press = (d: string) => setAmt((a) => (d === "del" ? a.slice(0, -1) : (a + d).replace(/^0+/, "").slice(0, 7)));

  const listen = () => {
    if (listening) { rec.current?.stop(); return; }
    const w = window as unknown as { webkitSpeechRecognition?: RecCtor; SpeechRecognition?: RecCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSupported(false); return; }
    const r = new Ctor();
    r.lang = lang === "hi" ? "hi-IN" : "en-IN";
    r.interimResults = false; r.maxAlternatives = 3;
    r.onresult = (e) => {
      const alts = Array.from(e.results[0] ?? []).map((a) => a.transcript);
      setHeard(alts[0] ?? "");
      for (const a of alts) { const n = parseAmount(a); if (n) { setAmt(String(n)); break; } }
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setHeard(""); setListening(true);
    try { r.start(); } catch { setListening(false); }
  };

  const save = () => {
    const n = parseInt(amt, 10);
    if (!n) return;
    persist([{ id: `${Date.now()}`, kind, amount: n, date: new Date().toISOString().slice(0, 10) }, ...entries]);
    setAmt(""); setHeard("");
    award("correction", { hi: "Hisaab poora kiya!", en: "Filled in your account!" });
  };

  const label = (k: Kind) => KINDS.find((x) => x.k === k)!;

  return (
    <section className="w-full rounded-[28px] bg-white p-4 shadow-soft">
      <h3 className="text-[18px] font-extrabold">{t({ hi: "Cash aur udhaar jodein", en: "Add cash & informal loans" })}</h3>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {KINDS.map((k) => (
          <button key={k.k} onClick={() => setKind(k.k)}
            className={`min-h-20 rounded-[20px] p-2 flex flex-col items-center justify-center gap-1 transition ${kind === k.k ? "bg-haldi ring-2 ring-ink" : "bg-cream"}`}>
            <span className="text-[26px] leading-none">{k.icon}</span>
            <span className="text-[11px] font-bold leading-tight text-center">{t(k.l)}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 min-h-14 rounded-[20px] bg-cream px-4 flex items-center text-[28px] font-extrabold num" aria-live="polite">
          <span className="text-muted mr-1">₹</span>{amt ? Number(amt).toLocaleString("en-IN") : <span className="text-muted/50">0</span>}
        </div>
        {supported && (
          <motion.button whileTap={{ scale: 0.92 }} onClick={listen} aria-label={lang === "hi" ? "Bolkar bataiye" : "Speak amount"}
            className={`grid place-items-center h-14 w-14 rounded-full shrink-0 ${listening ? "bg-danger text-white animate-pulse" : "bg-ink text-haldi"}`}>
            {listening ? <MicOff size={24} /> : <Mic size={24} />}
          </motion.button>
        )}
      </div>
      {heard && <p className="mt-1 text-[12px] text-muted">🎤 “{heard}”</p>}

      <div className="mt-2 grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "del"].map((d) => (
          <button key={d} onClick={() => press(d)} aria-label={d === "del" ? "Delete" : d}
            className="min-h-12 rounded-[16px] bg-lav text-[20px] font-extrabold num active:scale-95 transition grid place-items-center">
            {d === "del" ? <Delete size={20} /> : d}
          </button>
        ))}
      </div>

      <Btn onClick={save} disabled={!amt || parseInt(amt, 10) === 0} className="mt-3 w-full">
        {t({ hi: "Jodein", en: "Add" })} {amt ? inr(parseInt(amt, 10)) : ""}
      </Btn>
      <p className="mt-2 text-[11px] text-muted text-center">{t({ hi: "Agli monthly refresh mein hisaab mein judega", en: "Counted at the next monthly refresh" })}</p>

      {entries.length > 0 && (
        <ul className="mt-3 divide-y divide-ink/5">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 py-2">
              <span className="text-[22px]">{label(e.kind).icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate">{t(label(e.kind).l)}</p>
                <span className="inline-block rounded bg-amber-soft px-1.5 py-0.5 text-[11px] font-bold text-[#9a5f00]">{lang === "hi" ? "Declared · andaaza" : "Declared · estimate"}</span>
              </div>
              <span className="font-extrabold num">{inr(e.amount)}</span>
              <button onClick={() => persist(entries.filter((x) => x.id !== e.id))} aria-label={lang === "hi" ? "Hatayein" : "Delete"}
                className="grid place-items-center h-11 w-11 rounded-full text-danger bg-danger-soft/60"><Trash2 size={18} /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
